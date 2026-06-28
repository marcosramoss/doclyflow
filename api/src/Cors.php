<?php
declare(strict_types=1);

namespace App;

/**
 * Aplica headers CORS baseado em FRONTEND_ORIGIN.
 *
 * Aceita UMA das três formas para a variável de ambiente (separadas por
 * vírgula para múltiplas, todas espelhadas de volta ao navegador via
 * `Access-Control-Allow-Origin`):
 *
 *   - Literal exato:               `https://app.exemplo.com`
 *   - Lista separada por vírgula:  `https://app.com,https://www.app.com`
 *   - Wildcard de host:            `https://*.exemplo.com`
 *   - Any-origin (NÃO recomendado): `*`
 *
 * Quando o `Origin` enviado na request bate com algum item da lista (exato
 * ou via wildcard), ecoamos o **Origin literal da request** — não a string
 * configurada. Isso é necessário porque o navegador exige match exato na
 * resposta (não aceita curingas genéricos para hosts parciais), e o custo
 * de espelhar é nulo se já validamos.
 *
 * Responde preflight (OPTIONS) com 204 imediatamente para evitar que o
 * Middleware de Auth rejeite requisições legítimas do browser.
 *
 * Auth via `Authorization: Bearer <token>` — sem cookies, então
 * Access-Control-Allow-Credentials não é necessário.
 */
final class Cors
{
    public static function apply(): void
    {
        $allowOrigin = self::resolveAllowOrigin($_SERVER['HTTP_ORIGIN'] ?? '');

        // `Vary: Origin` é necessário sempre que ACAO depende do Origin da
        // request — caso contrário proxies/CDNs podem cruzar respostas entre
        // diferentes origens. Pulamos a header no caso `*` (universal).
        if ($allowOrigin !== null && $allowOrigin !== '*') {
            header('Vary: Origin');
        }

        // Sem origem casada: deixamos o navegador bloquear. Logs de WARN
        // aparecem no error_log do PHP — verifique apache error_log caso
        // requisições legítimas estejam caindo.
        if ($allowOrigin !== null) {
            header("Access-Control-Allow-Origin: $allowOrigin");
        } else {
            error_log(sprintf(
                '[Cors] Origin não autorizada (ou lista vazia): request_origin=%s allowed=%s',
                $_SERVER['HTTP_ORIGIN'] ?? '(none)',
                implode(',', self::parseAllowed())
            ));
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /**
     * Decide qual valor emitir em `Access-Control-Allow-Origin` para a
     * request atual. Retorna null para "negar" (sem header ACAO).
     *
     *   - Lista vazia (FRONTEND_ORIGIN ausente):  fallback dev `http://localhost:4321`.
     *   - FRONTEND_ORIGIN = "*":                  emite "*".
     *   - Caso contrário:                        bate a lista contra o Origin
     *     da request; em caso positivo, espelha o Origin (não emite o padrão).
     *     Em caso negativo, retorna null.
     */
    private static function resolveAllowOrigin(string $requestOrigin): ?string
    {
        $allowed = self::parseAllowed();
        if ($allowed === ['*']) {
            return '*';
        }

        // Sem Origin na request (curl, server-side, etc.): devolve o primeiro
        // item da lista configurada — útil para smoke tests/scripts.
        if ($requestOrigin === '') {
            return $allowed[0];
        }

        foreach ($allowed as $candidate) {
            if (self::originMatches($requestOrigin, $candidate)) {
                return $requestOrigin;
            }
        }
        return null;
    }

    /**
     * Interpreta FRONTEND_ORIGIN como lista CSV. Preserva ordem.
     *
     * @return list<string>
     */
    private static function parseAllowed(): array
    {
        $raw = Env::get('FRONTEND_ORIGIN', '') ?? '';
        if ($raw === '') {
            error_log(
                '[Cors] WARN: FRONTEND_ORIGIN ausente; usando http://localhost:4321 como fallback dev.'
            );
            return ['http://localhost:4321'];
        }
        if ($raw === '*') {
            return ['*'];
        }
        $list = [];
        foreach (explode(',', $raw) as $item) {
            $item = trim($item);
            if ($item !== '') {
                $list[] = $item;
            }
        }
        if ($list === []) {
            error_log('[Cors] WARN: FRONTEND_ORIGIN vazio após parse; usando fallback dev.');
            return ['http://localhost:4321'];
        }
        return $list;
    }

    /**
     * Match exato OU via wildcard. Wildcards aceitam `*` literal em qualquer
     * ponto do pattern (ex.: `https://*.doclyflow.com` casa qualquer
     * subdomínio; `https://doclyflow-com*` não faz sentido, mas evitamos
     * fazendo escape correto).
     */
    private static function originMatches(string $origin, string $pattern): bool
    {
        if ($pattern === $origin) {
            return true;
        }
        if (!str_contains($pattern, '*')) {
            return false;
        }
        // Escape de tudo que preg_quote escaparia, depois substitui
        // especificamente o marcador `*` por `.*`. Resulta numa regex
        // anchored que casa só o pattern pretendido.
        $regex = '#^' . str_replace('\*', '.*', preg_quote($pattern, '#')) . '$#';
        return preg_match($regex, $origin) === 1;
    }
}
