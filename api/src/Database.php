<?php
declare(strict_types=1);

namespace App;

use PDO;

/**
 * Conexão PDO singleton.
 *
 * Configurações puxadas de Env():
 *   DB_HOST, DB_PORT (default 3306), DB_NAME, DB_USER, DB_PASS, DB_CHARSET (utf8mb4).
 *
 * Modo:
 *   - ERRMODE_EXCEPTION → exceções em queries inválidas.
 *   - FETCH_ASSOC       → respostas em array associativo.
 *   - EMULATE_PREPARES  false → prepared statements nativos do mysqlnd.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $host = Env::required('DB_HOST');
        $port = Env::get('DB_PORT', '3306') ?? '3306';
        $name = Env::required('DB_NAME');
        $user = Env::required('DB_USER');
        $pass = Env::get('DB_PASS', '') ?? '';
        $charset = Env::get('DB_CHARSET', 'utf8mb4') ?? 'utf8mb4';

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $host, $port, $name, $charset);

        self::$pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET time_zone = '+00:00'",
        ]);

        return self::$pdo;
    }
}
