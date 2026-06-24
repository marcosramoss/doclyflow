<?php
declare(strict_types=1);

/**
 * RequisitaApp API — front controller.
 *
 * Responsabilidades deste arquivo:
 *   1. Permitir que o built-in server (`php -S`) sirva arquivos estáticos reais
 *      que existam em api/public/ (fast-path antes do autoloader).
 *   2. Carregar bootstrap (autoloader PSR-4 manual + .env + error handlers).
 *   3. Aplicar headers CORS (e responder preflight OPTIONS antes do roteador).
 *   4. Construir a Request a partir de $_SERVER/$_GET/php://input.
 *   5. Definir as rotas (src/routes.php).
 *   6. Despachar para o handler apropriado.
 */

if (PHP_SAPI === 'cli-server') {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    if ($uri !== '/' && is_file(__DIR__ . $uri)) {
        return false;
    }
}

require __DIR__ . '/../src/bootstrap.php';

use App\Cors;
use App\Request;
use App\Router;

Cors::apply();

$request = Request::fromGlobals();

$router = new Router();
require __DIR__ . '/../src/routes.php';

$router->dispatch($request);
