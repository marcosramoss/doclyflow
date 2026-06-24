<?php
declare(strict_types=1);

namespace App;

/**
 * Builders de resposta JSON.
 *
 * Sempre chama `exit` após o echo — evita que um controller acidentalmente
 * continue executando após tentar responder.
 */
final class Response
{
    /** @param array<string, mixed>|list<mixed>|object $data */
    public static function json(mixed $data, int $status = 200): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        exit;
    }

    /** @param array<string, mixed> $details */
    public static function error(int $status, string $message, array $details = []): never
    {
        self::json([
            'error' => $message,
            'details' => (object) $details, // garante {} ao invés de [] mesmo vazio
        ], $status);
    }
}
