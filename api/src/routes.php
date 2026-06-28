<?php
declare(strict_types=1);

/**
 * Tabela de rotas do Doclyflow API.
 *
 * Convenções:
 *   - prefixo `/api/...`
 *   - Placeholders com `:name` viram regex `[^/]+`
 *   - Endpoints protegidos usam Router::addProtected → exige token Bearer
 *
 * Os handlers são arrow functions que recebem (Request $r, ...params capturados)
 * e delegam para métodos estáticos em App\Controllers\*.
 *
 * NOTA IMPORTANTE sobre namespaces: este é o único arquivo de api/src/ que NÃO
 * declara `namespace App;` — ele é montado via `require` em public/index.php
 * (também sem namespace), que apenas popula `$router` via side-effects. NÃO
 * remover o bloco `use App\…;` abaixo pensando "ah, mas já está em App
 * implicitamente" — sem cada `use`, nomes unqualified como `Request` em
 * type-hints resolvem para a raiz (`\Request`, que não existe), o que faz
 * o roteador lançar `TypeError: must be of type Request, App\Request given`.
 */

use App\Controllers\AuthController;
use App\Controllers\DocumentsController;
use App\Controllers\HealthController;
use App\Request;

// ---------------------------------------------------------------------------
// Healthcheck
// ---------------------------------------------------------------------------
$router->add('GET', '/api/health', static fn() => HealthController::status());

// ---------------------------------------------------------------------------
// Auth: google é público; logout/me exigem token.
// ---------------------------------------------------------------------------
$router->add('POST', '/api/auth/google', static fn(Request $r) => AuthController::google($r));
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
// Nota: a rota /api/technologies foi removida junto com o catálogo —
// technologies agora são strings livres persistidas em documents.technologies.
