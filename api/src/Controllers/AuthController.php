<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Env;
use App\HttpException;
use App\Request;
use App\Response;
use App\Validator;

/**
 * Endpoints de autenticação.
 *
 *  - POST /api/auth/login  → público. Auto-registra o usuário se não existir
 *    (comportamento MVP-friendly que espelha o mock do frontend).
 *  - POST /api/auth/logout → protegido via Bearer.
 *  - GET  /api/auth/me     → protegido via Bearer.
 */
final class AuthController
{
    public static function login(Request $request): void
    {
        $body = $request->body;
        Validator::requireFields($body, ['email', 'password']);

        $email = strtolower(trim((string) $body['email']));
        $password = (string) $body['password'];

        if (!Validator::email($email)) {
            throw new HttpException(400, 'Invalid email');
        }
        if (strlen($password) < 4) {
            throw new HttpException(400, 'Password must be at least 4 characters');
        }

        $pdo = Database::pdo();
        $autoRegister = strtolower((string) Env::get('AUTH_AUTO_REGISTER', 'true')) === 'true';

        // Bunny-hop: executa sempre um `password_verify` (mesmo quando o usuário
        // não existe, contra um hash dummy) para evitar timing oracle que
        // diferencie "email cadastrado" de "email não cadastrado".
        $dummyHash = '$2y$10$' . str_repeat('0', 53);

        $stmt = $pdo->prepare(
            'SELECT id, name, email, password_hash FROM users WHERE email = :e LIMIT 1'
        );
        $stmt->execute(['e' => $email]);
        $existing = $stmt->fetch();

        $verified = $existing
            ? password_verify($password, (string) $existing['password_hash'])
            : password_verify($password, $dummyHash);

        if (!$existing) {
            if (!$autoRegister) {
                throw new HttpException(401, 'Invalid credentials');
            }
            $name = self::humanizeNameFromEmail($email);
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $ins = $pdo->prepare(
                'INSERT INTO users (name, email, password_hash) VALUES (:n, :e, :p)'
            );
            $ins->execute(['n' => $name, 'e' => $email, 'p' => $hash]);
            $userId = (int) $pdo->lastInsertId();
        } else {
            if (!$verified) {
                throw new HttpException(401, 'Invalid credentials');
            }
            // Upgrade gradativo do hash se o algoritmo PASSWORD_DEFAULT mudou (ex.: bcrypt → argon2id).
            if (password_needs_rehash((string) $existing['password_hash'], PASSWORD_DEFAULT)) {
                $newHash = password_hash($password, PASSWORD_DEFAULT);
                $upd = $pdo->prepare('UPDATE users SET password_hash = :p WHERE id = :id');
                $upd->execute(['p' => $newHash, 'id' => $existing['id']]);
            }
            $userId = (int) $existing['id'];
            $name = (string) $existing['name'];
            $email = (string) $existing['email'];
        }

        $issued = Auth::issue($pdo, $userId);

        Response::json([
            'token' => $issued['token'],
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
            ],
            'expiresAt' => self::iso($issued['expiresAt']),
        ]);
    }

    public static function logout(Request $request): void
    {
        // userId já foi validado pelo Router::addProtected().
        $token = $request->bearer();
        if ($token === null) {
            throw new HttpException(401, 'Missing Authorization header');
        }
        Auth::revokeByToken(Database::pdo(), $token);
        Response::json(['ok' => true]);
    }

    public static function me(Request $request): void
    {
        $userId = $request->userId ?? 0;
        $stmt = Database::pdo()->prepare(
            'SELECT id, name, email FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new HttpException(401, 'User not found');
        }
        Response::json([
            'user' => [
                'id' => (int) $row['id'],
                'name' => (string) $row['name'],
                'email' => (string) $row['email'],
            ],
        ]);
    }

    private static function humanizeNameFromEmail(string $email): string
    {
        $local = strstr($email, '@', true);
        if ($local === false || $local === '') {
            return 'Usuário';
        }
        $clean = preg_replace('/[._+\-]+/', ' ', $local) ?? $local;
        $parts = array_values(array_filter(explode(' ', trim($clean)), 'strlen'));
        if (count($parts) === 0) {
            return 'Usuário';
        }
        return implode(' ', array_map(
            static fn(string $p): string => ucfirst(strtolower($p)),
            $parts
        ));
    }

    private static function iso(string $mysql): string
    {
        $dt = \DateTimeImmutable::createFromFormat(
            'Y-m-d H:i:s',
            $mysql,
            new \DateTimeZone('UTC')
        );
        return $dt === false ? $mysql : $dt->format('Y-m-d\TH:i:s.v\Z');
    }
}
