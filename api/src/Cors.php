<?php
declare(strict_types=1);

namespace App;

/**
 * Aplica headers CORS baseados em FRONTEND_ORIGIN.
 *
 * Responde preflight (OPTIONS) com 204 imediatamente para evitar que o
 * Middleware de Auth rejeite requisições legítimas do browser.
 *
 * Auth via `Authorization: Bearer <token>` — sem cookies, então
 * Access-Control-Allow-Credentials não é necessário.
 */
final class Cors
{
    public static function apply(): void
    {
        $origin = Env::get('FRONTEND_ORIGIN');
        if ($origin === null || $origin === '') {
            // Fallback dev-friendly for o servidor Astro (`npm run dev`).
            // Em produção, FRONTEND_ORIGIN é obrigatório — ver .env.example.
            error_log('WARN: FRONTEND_ORIGIN ausente; usando http://localhost:4321 como fallback dev.');
            $origin = 'http://localhost:4321';
        }
        if ($origin !== '*') {
            header('Vary: Origin');
        }
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
