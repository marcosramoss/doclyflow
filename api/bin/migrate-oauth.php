<?php
declare(strict_types=1);

/**
 * Doclify API — OAuth migration helper.
 *
 * Atualiza bancos pré-Google OAuth para o novo formato de `users`:
 *   - Adiciona coluna `google_sub` (se faltar)
 *   - Adiciona coluna `picture` (se faltar)
 *   - Cria UNIQUE INDEX em `google_sub` (se faltar)
 *   - Remove coluna `password_hash` (se existir)
 *
 * Cada passo é idempotente (INFO_SCHEMA-driven) — pode ser executado várias
 * vezes sem efeito colateral. Não enxuga dados: registros legados sem
 * `google_sub` ficam com `''`; o AuthController os recusa na próxima login
 * (precisarão logar com Google para preencher o sub).
 *
 *   php api/bin/migrate-oauth.php
 */

require __DIR__ . '/../src/bootstrap.php';

use App\Database;

try {
    $pdo = Database::pdo();
} catch (Throwable $e) {
    fwrite(STDERR, "DB connection failed: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Verifique .env → DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS.\n");
    exit(1);
}

function columnExists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :t
           AND COLUMN_NAME = :c'
    );
    $stmt->execute(['t' => $table, 'c' => $column]);
    return ((int) $stmt->fetchColumn()) > 0;
}

function indexExists(PDO $pdo, string $table, string $index): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :t
           AND INDEX_NAME = :i'
    );
    $stmt->execute(['t' => $table, 'i' => $index]);
    return ((int) $stmt->fetchColumn()) > 0;
}

$log = static function (string $msg): void {
    echo $msg . "\n";
};

$log('Migrating users table to Google OAuth layout…');

// 1. Adiciona google_sub se faltar. O caminho seguro é:
//    a) ADD COLUMN com DEFAULT temporário (obrigatório em tabelas com rows);
//    b) backfill com placeholders únicos para qualquer linha preexistente;
//    c) MODIFY para NOT NULL, garantindo o UNIQUE em produção.
if (!columnExists($pdo, 'users', 'google_sub')) {
    $log('  + ADD COLUMN google_sub (NULL)');
    $pdo->exec(
        "ALTER TABLE users
         ADD COLUMN google_sub VARCHAR(255) NULL AFTER email"
    );

    $rowCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($rowCount > 0) {
        $log("  · backfilling google_sub for $rowCount existing row(s) with unique legacy placeholders");
        // IMPORTANTE: esses usuários NÃO poderão logar via Google até que
        // editem `users.google_sub` com o sub real do Google que lhes
        // pertence. Out alternativa é deletá-los após o seed.
        // Combina `id` (único por AUTO_INCREMENT local) com `UUID_SHORT()`
        // (counter global por servidor). Em uma UPDATE de instância única,
        // cada chamada incrementa o contador → o sufixo nunca repete.
        $pdo->exec(
            "UPDATE users
             SET google_sub = CONCAT('legacy-pending-', id, '-', UUID_SHORT())
             WHERE google_sub IS NULL OR google_sub = ''"
        );
    }

    $log('  + ALTER google_sub to NOT NULL');
    $pdo->exec(
        'ALTER TABLE users
         MODIFY google_sub VARCHAR(255) NOT NULL'
    );
} else {
    $log('  · google_sub already present');
}

// 2. Adiciona picture se faltar.
if (!columnExists($pdo, 'users', 'picture')) {
    $log('  + ADD COLUMN picture');
    $pdo->exec(
        "ALTER TABLE users
         ADD COLUMN picture VARCHAR(512) DEFAULT NULL AFTER google_sub"
    );
} else {
    $log('  · picture already present');
}

// 3. Garante UNIQUE INDEX em google_sub.
//    Antes de criar o índice, aborta com mensagem acionável se já houver
//    duplicatas (e.g. uma migração anterior abandonada deixou `''` em
//    várias linhas) — assim o operador não cai num `ER_DUP_ENTRY` opaco.
if (!indexExists($pdo, 'users', 'uq_users_google_sub')) {
    $dupCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM (
            SELECT google_sub FROM users
            GROUP BY google_sub HAVING COUNT(*) > 1
         ) d"
    )->fetchColumn();
    if ($dupCount > 0) {
        throw new \RuntimeException(
            "Cannot create uq_users_google_sub: $dupCount duplicate google_sub value(s). " .
            "Resolva manualmente (DELETE/UPDATE) antes de reexecutar."
        );
    }
    $log('  + CREATE UNIQUE INDEX uq_users_google_sub');
    $pdo->exec(
        'CREATE UNIQUE INDEX uq_users_google_sub ON users (google_sub)'
    );
} else {
    $log('  · uq_users_google_sub already present');
}

// 4. Remove password_hash legado se ainda existir.
if (columnExists($pdo, 'users', 'password_hash')) {
    $log('  - DROP COLUMN password_hash');
    $pdo->exec('ALTER TABLE users DROP COLUMN password_hash');
} else {
    $log('  · password_hash already gone');
}

$log('Done.');
