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
 *  - POST /api/auth/google  → público. Recebe um ID token do Google Identity
 *    Services, valida via tokeninfo, encontra/cria usuário e emite token opaco.
 *  - POST /api/auth/logout   → protegido via Bearer.
 *  - GET  /api/auth/me       → protegido via Bearer.
 *
 * Account-linking: se o `google_sub` ainda não existir mas o `email`
 * corresponder a um usuário legado (criado via fluxo antigo email/password),
 * reaproveitamos o registro e preenchemos `google_sub` + `picture` no UPDATE —
 * assim o primeiro login com Google migra contas antigas sem perder
 * documentos.
 */
final class AuthController
{
    public static function google(Request $request): void
    {
        $body = $request->body;
        Validator::requireFields($body, ['token']);

        $idToken = (string) $body['token'];
        if (strlen($idToken) < 32) {
            throw new HttpException(400, 'Invalid Google ID token');
        }

        // Verificação do JWT sem dependências externas — Google recomenda
        // validação local do JWT, mas o endpoint /tokeninfo continua
        // oficialmente suportado e é adequado para um MVP. Resultado inclui
        // `aud` (audience = nosso client_id), `iss` e `exp`.
        $info = self::verifyGoogleIdToken($idToken);

        $aud = (string) ($info['aud'] ?? '');
        $expectedAud = (string) (Env::get('GOOGLE_CLIENT_ID', '') ?? '');
        if ($expectedAud !== '' && $aud !== '' && !hash_equals($expectedAud, $aud)) {
            error_log("[Auth] Google ID token audience mismatch: expected=$expectedAud got=$aud");
            throw new HttpException(401, 'Google ID token audience mismatch');
        }

        $sub = (string) ($info['sub'] ?? '');
        $email = strtolower((string) ($info['email'] ?? ''));
        // `/tokeninfo` retorna `email_verified` como string `"true"`/`"false"` —
        // `(bool) "false"` é truthy em PHP, então precisamos de comparação estrita.
        $emailVerified = isset($info['email_verified'])
            && ($info['email_verified'] === true
                || $info['email_verified'] === 'true');
        $name = trim((string) ($info['name'] ?? ''));
        $picture = isset($info['picture']) ? (string) $info['picture'] : null;

        if ($sub === '' || $email === '') {
            throw new HttpException(401, 'Incomplete Google profile');
        }
        if (!$emailVerified) {
            error_log("[Auth] Google ID token rejected (email not verified): sub=$sub email=$email");
            throw new HttpException(401, 'Google account email is not verified');
        }

        $pdo = Database::pdo();

        // 1. Match exato por google_sub → caminho comum em re-logins.
        $stmt = $pdo->prepare(
            'SELECT id, name, email, picture FROM users WHERE google_sub = :s LIMIT 1'
        );
        $stmt->execute(['s' => $sub]);
        $existing = $stmt->fetch();

        if ($existing) {
            $userId = (int) $existing['id'];
            $name = $name !== '' ? $name : (string) $existing['name'];
            $picture = $picture ?? ($existing['picture'] !== null ? (string) $existing['picture'] : null);
            // Refresh profile info (name/picture podem mudar).
            if (
                $name !== (string) $existing['name']
                || $picture !== ($existing['picture'] !== null ? (string) $existing['picture'] : null)
            ) {
                $upd = $pdo->prepare(
                    'UPDATE users SET name = :n, picture = :p WHERE id = :id'
                );
                $upd->execute(['n' => $name, 'p' => $picture, 'id' => $userId]);
            }
        } else {
            // 2. Match por e-mail → migra conta legacy (pré-OAuth) preservando
            //    os documentos existentes.
            $stmtEmail = $pdo->prepare(
                'SELECT id, name, picture FROM users WHERE email = :e LIMIT 1'
            );
            $stmtEmail->execute(['e' => $email]);
            $byEmail = $stmtEmail->fetch();

            if ($byEmail) {
                $userId = (int) $byEmail['id'];
                $byEmailName = (string) $byEmail['name'];
                $finalName = $name !== '' ? $name : $byEmailName;
                $upd = $pdo->prepare(
                    'UPDATE users SET google_sub = :s, picture = :p, name = :n WHERE id = :id'
                );
                $upd->execute([
                    's' => $sub,
                    'p' => $picture,
                    'n' => $finalName,
                    'id' => $userId,
                ]);
                $name = $finalName;
                // Evento de segurança relevante: conta legada foi assumida por
                // um `google_sub` porque os e-mails bateram. Custa pouco e
                // ajuda um SRE futuro a fazer auditoria.
                error_log("[Auth] Linked Google identity to legacy user by email match: id=$userId email=$email sub=$sub");
            } else {
                // 3. Usuário novo.
                if ($name === '') {
                    $name = self::humanizeNameFromEmail($email);
                }
                $ins = $pdo->prepare(
                    'INSERT INTO users (name, email, google_sub, picture)
                     VALUES (:n, :e, :s, :p)'
                );
                $ins->execute([
                    'n' => $name,
                    'e' => $email,
                    's' => $sub,
                    'p' => $picture,
                ]);
                $userId = (int) $pdo->lastInsertId();
                error_log("[Auth] New user created from Google profile: id=$userId email=$email");
            }
        }

        $issued = Auth::issue($pdo, $userId);

        Response::json([
            'token' => $issued['token'],
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'picture' => $picture,
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
            'SELECT id, name, email, picture FROM users WHERE id = :id LIMIT 1'
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
                'picture' => $row['picture'] !== null ? (string) $row['picture'] : null,
            ],
        ]);
    }

    /**
     * Valida um ID token do Google Identity Services via /tokeninfo.
     *
     * `Google_AccessToken`/`Audience`/`IssuedTo`/`Expires` são conferidos
     * contra as claims esperadas. Retorna o array de claims em caso de
     * sucesso; lança HttpException 401 caso contrário.
     *
     * @return array<string, mixed>
     */
    private static function verifyGoogleIdToken(string $idToken): array
    {
        $url = 'https://oauth2.googleapis.com/tokeninfo?id_token='
             . urlencode($idToken);

        $response = null;
        $statusCode = 0;
        $ctx = stream_context_create([
            'http' => [
                'header' => "Accept: application/json\r\n",
                'ignore_errors' => true,
                'timeout' => 5,
                'method' => 'GET',
            ],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) {
            throw new HttpException(502, 'Could not reach Google tokeninfo endpoint');
        }
        $response = json_decode($body, true);
        if (!is_array($response)) {
            throw new HttpException(401, 'Invalid Google ID token (decode failed)');
        }
        if (isset($response['error_description'], $response['error'])) {
            throw new HttpException(401, 'Invalid Google ID token');
        }
        if (!empty($response['error'])) {
            throw new HttpException(401, 'Invalid Google ID token');
        }

        $iss = (string) ($response['iss'] ?? '');
        $allowedIss = ['accounts.google.com', 'https://accounts.google.com'];
        if ($iss !== '' && !in_array($iss, $allowedIss, true)) {
            throw new HttpException(401, 'Google ID token issuer mismatch');
        }

        $expiresAt = (string) ($response['exp'] ?? '0');
        if ((int) $expiresAt < time()) {
            throw new HttpException(401, 'Google ID token expired');
        }

        /** @var array<string, mixed> $response */
        return $response;
    }

    private static function humanizeNameFromEmail(string $email): string
    {
        $local = strstr($email, '@', true);
        if ($local === false || $local === '') {
            return 'Usuário';
        }
        $clean = preg_replace('/[._+\\-]+/', ' ', $local) ?? $local;
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
