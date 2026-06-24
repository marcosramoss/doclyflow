<?php
declare(strict_types=1);

namespace App;

/**
 * Validação de entrada minimalista.
 * Sempre lança HttpException com status 400 — capturada pelo Router.
 */
final class Validator
{
    /** @param list<string> $fields */
    public static function requireFields(array $data, array $fields): void
    {
        $missing = [];
        foreach ($fields as $f) {
            if (!array_key_exists($f, $data)) {
                $missing[] = $f;
                continue;
            }
            $val = $data[$f];
            if (is_string($val) && trim($val) === '') {
                $missing[] = $f;
            }
        }
        if ($missing) {
            throw new HttpException(400, 'Missing required fields', ['fields' => $missing]);
        }
    }

    public static function email(string $email): bool
    {
        return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
    }

    /** @param list<mixed> $allowed */
    public static function oneOf(mixed $value, array $allowed): bool
    {
        return in_array($value, $allowed, true);
    }
}
