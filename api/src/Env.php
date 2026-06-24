<?php
declare(strict_types=1);

namespace App;

/**
 * Leitor manual de arquivos .env no formato KEY=VALUE.
 *
 * Aceita:
 *  - Comentários iniciando com #
 *  - Aspas duplas opcionais ao redor do valor
 *  - Linhas em branco
 *
 * Alimenta tanto `$_ENV` quanto `getenv()` para compatibilidade ampla.
 */
final class Env
{
    public static function load(string $path): void
    {
        if (!is_file($path)) {
            return;
        }
        $contents = file_get_contents($path);
        if ($contents === false) {
            return;
        }
        foreach (preg_split('/\r\n|\r|\n/', $contents) ?: [] as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                continue;
            }
            $eq = strpos($trimmed, '=');
            if ($eq === false) {
                continue;
            }
            $key = trim(substr($trimmed, 0, $eq));
            $value = trim(substr($trimmed, $eq + 1));
            if (strlen($value) >= 2 && $value[0] === '"' && $value[strlen($value) - 1] === '"') {
                $value = substr($value, 1, -1);
            }
            if ($key === '' || !preg_match('/^[A-Z][A-Z0-9_]*$/', $key)) {
                continue;
            }
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        if (array_key_exists($key, $_ENV)) {
            return (string) $_ENV[$key];
        }
        $v = getenv($key);
        return $v === false ? $default : (string) $v;
    }

    public static function required(string $key): string
    {
        $v = self::get($key);
        if ($v === null || $v === '') {
            throw new \RuntimeException("Missing required env var: $key");
        }
        return $v;
    }
}
