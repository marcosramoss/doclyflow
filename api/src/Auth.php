<?php
declare(strict_types=1);

namespace App;

use PDO;

/**
 * Tokens de autenticação opacos (Laravel Sanctum-style).
 *
 *  - Token cru: `bin2hex(random_bytes(32))` (64 chars) enviado ao cliente.
 *  - Apenas o hash SHA256 do token é guardado na tabela `user_tokens`.
 *  - Logout = DELETE da linha → revogação instantânea.
 *  - TTL configurado via env TOKEN_TTL_HOURS (default 168h = 7 dias).
 */
final class Auth
{
    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function ttlSeconds(): int
    {
        $hours = (int) (Env::get('TOKEN_TTL_HOURS', '168') ?? '168');
        return max(60, $hours * 3600);
    }

    /** @return array{token: string, expiresAt: string} */
    public static function issue(PDO $pdo, int $userId): array
    {
        $token = self::generateToken();
        $hash = self::hashToken($token);
        $expires = date('Y-m-d H:i:s', time() + self::ttlSeconds());
        $stmt = $pdo->prepare(
            'INSERT INTO user_tokens (user_id, token_hash, expires_at) VALUES (:u, :h, :x)'
        );
        $stmt->execute(['u' => $userId, 'h' => $hash, 'x' => $expires]);
        return ['token' => $token, 'expiresAt' => $expires];
    }

    /** Returns user_id when registered, throws 401 otherwise. */
    public static function authenticate(PDO $pdo, string $token): int
    {
        if ($token === '') {
            throw new HttpException(401, 'Invalid token');
        }
        $stmt = $pdo->prepare(
            'SELECT user_id, expires_at FROM user_tokens
             WHERE token_hash = :h LIMIT 1'
        );
        $stmt->execute(['h' => self::hashToken($token)]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new HttpException(401, 'Invalid or expired token');
        }
        if (strtotime((string) $row['expires_at']) < time()) {
            throw new HttpException(401, 'Token expired');
        }
        return (int) $row['user_id'];
    }

    public static function revokeByToken(PDO $pdo, string $token): bool
    {
        $stmt = $pdo->prepare('DELETE FROM user_tokens WHERE token_hash = :h');
        $stmt->execute(['h' => self::hashToken($token)]);
        return $stmt->rowCount() > 0;
    }
}
