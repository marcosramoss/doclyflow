<?php
declare(strict_types=1);

/**
 * Doclyflow API — migrate.
 *
 * Aplica api/sql/schema.sql ao banco configurado em .env.
 *
 * Estratégia:
 *  1. Tenta usar o `mysql` CLI (mais robusto para DDL).
 *  2. Se indisponível (Windows sem PATH configurado, por exemplo),
 *     faz split grosseiro em `;` e executa cada statement via PDO.
 *
 * Não é migrador versão-aware — para MVP um único schema.sql é suficiente.
 */

require __DIR__ . '/../src/bootstrap.php';

use App\Database;
use App\Env;

$schemaPath = __DIR__ . '/../sql/schema.sql';
if (!is_file($schemaPath)) {
    fwrite(STDERR, "schema.sql not found at $schemaPath\n");
    exit(1);
}

$schema = (string) file_get_contents($schemaPath);
if ($schema === '') {
    fwrite(STDERR, "schema.sql is empty\n");
    exit(1);
}

// Sanity-check de conexão antes de qualquer coisa.
try {
    Database::pdo();
} catch (Throwable $e) {
    fwrite(STDERR, "DB connection failed: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Verifique .env → DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS.\n");
    exit(1);
}

// ----------------------------------------------------------------------------
// Caminho 1: mysql CLI
// ----------------------------------------------------------------------------
$mysql = (PHP_OS_FAMILY === 'Windows') ? 'mysql.exe' : 'mysql';
$cmdPath = (PHP_OS_FAMILY === 'Windows')
    ? (trim((string) shell_exec('where ' . escapeshellarg($mysql) . ' 2>NUL')) ?: '')
    : trim((string) shell_exec('command -v ' . escapeshellarg($mysql) . ' 2>/dev/null') ?: '');

if ($cmdPath !== '') {
    $bin = strtok($cmdPath, "\r\n");
    $host = Env::required('DB_HOST');
    $port = Env::get('DB_PORT', '3306') ?? '3306';
    $user = Env::required('DB_USER');
    $pass = Env::get('DB_PASS', '') ?? '';
    $name = Env::required('DB_NAME');
    $cmd = sprintf(
        '%s -h %s -P %s -u %s %s %s < %s 2>&1',
        escapeshellarg($bin),
        escapeshellarg($host),
        escapeshellarg($port),
        escapeshellarg($user),
        $pass !== '' ? '-p' . escapeshellarg($pass) : '',
        escapeshellarg($name),
        escapeshellarg($schemaPath)
    );
    echo "Running via mysql CLI...\n";
    passthru($cmd, $code);
    exit($code);
}

// ----------------------------------------------------------------------------
// Caminho 2: split por `;` via PDO (DDL como CREATE TABLE não aceita multi-statement por padrão)
// ----------------------------------------------------------------------------
echo "mysql CLI unavailable — applying via PDO (best-effort)...\n";
$pdo = Database::pdo();
$statements = preg_split('/;\s*\n/', $schema) ?: [];
$applied = 0;
foreach ($statements as $stmt) {
    $trim = trim($stmt);
    if ($trim === '' || str_starts_with($trim, '--')) {
        continue;
    }
    // Cada statement pode ter várias linhas e não termina com `;` aqui (preg_split removeu)
    try {
        $pdo->exec($trim);
        $applied++;
    } catch (Throwable $e) {
        fwrite(STDERR, "Failed applying statement:\n---\n$trim\n---\nError: " . $e->getMessage() . "\n");
        exit(1);
    }
}
echo "Applied $applied statements via PDO.\n";
