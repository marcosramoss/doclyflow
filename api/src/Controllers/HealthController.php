<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Response;

/**
 * GET /api/health
 *
 * Healthcheck público — não toca no banco para evitar mascarar falhas
 * de configuração do DB em um simples "está vivo?". A conexão real é
 * validada por /api/auth/me quando o cliente estiver autenticado.
 */
final class HealthController
{
    public static function status(): void
    {
        Response::json([
            'status' => 'ok',
            'time' => gmdate('c'),
            'service' => 'doclyflow-api',
        ]);
    }
}
