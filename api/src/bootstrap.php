<?php
declare(strict_types=1);

/**
 * Doclyflow API — bootstrap.
 *
 * 1. Registra autoloader PSR-4 manual para o namespace `App\` enraizado em api/src.
 *    Usa DIRECTORY_SEPARATOR para ser seguro em Windows/Linux.
 * 2. Configura error handlers globais que convertem warnings/notices em
 *    ErrorException (capturáveis) e respondem JSON em vez de HTML 500 em crashes.
 * 3. Carrega .env da raiz da pasta api/.
 */

$apiRoot = dirname(__DIR__);
$srcRoot = $apiRoot . DIRECTORY_SEPARATOR . 'src';

// ----------------------------------------------------------------------------
// Autoloader PSR-4 manual para `App\` → api/src/
// ----------------------------------------------------------------------------
spl_autoload_register(static function (string $class) use ($srcRoot): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = $srcRoot . DIRECTORY_SEPARATOR
        . str_replace('\\', DIRECTORY_SEPARATOR, $relative)
        . '.php';
    if (is_file($file)) {
        require_once $file;
    }
});

// ----------------------------------------------------------------------------
// Error reporting: nunca vazar HTML para a resposta JSON.
// ----------------------------------------------------------------------------
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('html_errors', '0');
date_default_timezone_set(@ini_get('date.timezone') ?: 'UTC');

// Converte warnings/notices/deprecations em ErrorException capturáveis.
// Sem isso, `try/catch` em controllers NÃO pega E_WARNING/E_NOTICE.
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if ((error_reporting() & $severity) === 0) {
        return false; // respeita supressões com @
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Última linha de defesa: qualquer throwable não tratado vira JSON 500.
set_exception_handler(static function (Throwable $e): void {
    error_log(sprintf(
        '[Uncaught] %s: %s at %s:%d',
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'Internal Server Error']);
});

// Captura também fatal errors (E_ERROR, E_PARSE, ...) que fogem de try/catch.
register_shutdown_function(static function (): void {
    $err = error_get_last();
    if (
        $err !== null
        && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)
        && !headers_sent()
    ) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Internal Server Error']);
    }
});

// ----------------------------------------------------------------------------
// .env loader manual (KEY=VALUE, com # comments e aspas opcionais).
// ----------------------------------------------------------------------------
\App\Env::load($apiRoot . DIRECTORY_SEPARATOR . '.env');
