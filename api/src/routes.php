<?php
declare(strict_types=1);

/**
 * Tabela de rotas do Doclify API.
 *
 * Convenções:
 *   - prefixo `/api/...`
 *   - Placeholders com `:name` viram regex `[^/]+`
 *   - Endpoints protegidos usam Router::addProtected → exige token Bearer
 *
 * Os handlers são arrow functions que recebem (Request $r, ...params capturados)
 * e delegam para métodos estáticos em App\Controllers\*.
 */

use App\Controllers\AuthController;
use App\Controllers\DocumentsController;
use App\Controllers\HealthController;

// ---------------------------------------------------------------------------
// Healthcheck
// ---------------------------------------------------------------------------
$router->add('GET', '/api/health', static fn() => HealthController::status());

// ---------------------------------------------------------------------------
// Auth: login é público; logout/me exigem token.
// ---------------------------------------------------------------------------
$router->add('POST', '/api/auth/login', static fn(Request $r) => AuthController::login($r));
$router->addProtected('POST', '/api/auth/logout', static fn(Request $r) => AuthController::logout($r));
$router->addProtected('GET', '/api/auth/me', static fn(Request $r) => AuthController::me($r));

// ---------------------------------------------------------------------------
// Documents — CRUD protegido.
// ---------------------------------------------------------------------------
$router->addProtected(
    'GET',
    '/api/documents',
    static fn(Request $r) => DocumentsController::index($r)
);
$router->addProtected(
    'GET',
    '/api/documents/:id',
    static fn(Request $r, string $id) => DocumentsController::show($r, $id)
);
$router->addProtected(
    'POST',
    '/api/documents',
    static fn(Request $r) => DocumentsController::create($r)
);
$router->addProtected(
    'PUT',
    '/api/documents/:id',
    static fn(Request $r, string $id) => DocumentsController::update($r, $id)
);
$router->addProtected(
    'DELETE',
    '/api/documents/:id',
    static fn(Request $r, string $id) => DocumentsController::destroy($r, $id)
);
