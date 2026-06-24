<?php
declare(strict_types=1);

namespace App;

/**
 * Wrapper sobre $_SERVER + php://input.
 *
 * Constrói uma Request imutável por requisição, com:
 *  - method (UPPERCASE)
 *  - path  (parse_url sem query string — evita mismatch de roteamento)
 *  - query (de $_GET)
 *  - headers (lowercased, achatados de HTTP_* + CONTENT_*)
 *  - body   (JSON parsed quando Content-Type: application/json)
 *  - userId (setado pelo Router após AuthMiddleware)
 */
final class Request
{
    public string $method;
    public string $path;
    /** @var array<string, string> */
    public array $query;
    /** @var array<string, string> */
    public array $headers;
    /** @var array<string, mixed> */
    public array $body;
    public ?int $userId = null;

    public static function fromGlobals(): self
    {
        $r = new self();
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $r->method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $r->path = $uri;
        $r->query = self::stringify($_GET ?? []);
        $r->headers = self::parseHeaders();
        $r->body = self::parseBody($r->headers);
        return $r;
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function bearer(): ?string
    {
        $h = $this->header('authorization');
        if ($h === null) {
            return null;
        }
        if (!preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
            return null;
        }
        return trim($m[1]);
    }

    /** @return array<string, string> */
    private static function parseHeaders(): array
    {
        $h = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $h[strtolower(str_replace('_', '-', substr($key, 5)))] = (string) $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $h['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }
        if (isset($_SERVER['CONTENT_LENGTH'])) {
            $h['content-length'] = (string) $_SERVER['CONTENT_LENGTH'];
        }
        return $h;
    }

    /** @return array<string, mixed> */
    private static function parseBody(array $headers): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || $raw === '') {
            return [];
        }
        $ct = strtolower($headers['content-type'] ?? '');
        if (!str_contains($ct, 'application/json')) {
            return [];
        }
        $decoded = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            throw new HttpException(400, 'Invalid JSON body');
        }
        return $decoded;
    }

    /** @param array<string, mixed> $in @return array<string, string> */
    private static function stringify(array $in): array
    {
        $out = [];
        foreach ($in as $k => $v) {
            $out[(string) $k] = is_scalar($v) ? (string) $v : '';
        }
        return $out;
    }
}
