<?php
declare(strict_types=1);

namespace App;

/**
 * Roteador HTTP minimo.
 *
 * Suporta padrões com placeholders `:name` (regex `[^/]+`).
 * Two flavors:
 *  - add(method, pattern, handler)          → rota pública
 *  - addProtected(method, pattern, handler) → autentica via Bearer antes
 *
 * Captura HttpException lançada por handlers e responde JSON com o status.
 * Em caso de 404 (nenhuma rota casa) também responde JSON.
 */
final class Router
{
    /** @var list<array{method:string, pattern:string, regex:string, params:list<string>, handler:callable}> */
    private array $routes = [];

    /** @param callable(Request, mixed...) $handler */
    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->push(strtoupper($method), $pattern, $handler);
    }

    /**
     * Wrapper para rotas que exigem token Bearer válido.
     * Seta $request->userId antes de chamar o handler.
     *
     * @param callable(Request, mixed...) $handler
     */
    public function addProtected(string $method, string $pattern, callable $handler): void
    {
        $inner = function (Request $request, ...$args) use ($handler): void {
            $token = $request->bearer();
            if ($token === null) {
                throw new HttpException(401, 'Missing Authorization header');
            }
            $request->userId = Auth::authenticate(Database::pdo(), $token);
            $handler($request, ...$args);
        };
        $this->push(strtoupper($method), $pattern, $inner);
    }

    public function dispatch(Request $request): void
    {
        $methodMatched = false;
        foreach ($this->routes as $r) {
            if ($r['method'] !== $request->method) {
                continue;
            }
            $methodMatched = true;
            if (!preg_match($r['regex'], $request->path, $m)) {
                continue;
            }
            $args = [];
            foreach ($r['params'] as $p) {
                $args[] = $m[$p] ?? null;
            }
            try {
                ($r['handler'])($request, ...$args);
            } catch (HttpException $e) {
                Response::error($e->statusCode, $e->getMessage(), $e->details);
            }
            return;
        }
        if ($methodMatched) {
            Response::error(405, 'Method Not Allowed');
            return;
        }
        Response::error(404, 'Route not found');
    }

    /** @param callable(Request, mixed...) $handler */
    private function push(string $method, string $pattern, callable $handler): void
    {
        $params = [];
        $regex = preg_replace_callback('/:([A-Za-z_][A-Za-z0-9_]*)/', static function (array $m) use (&$params): string {
            $params[] = $m[1];
            return '(?P<' . $m[1] . '>[^/]+)';
        }, $pattern);
        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'regex' => '#^' . $regex . '$#',
            'params' => $params,
            'handler' => $handler,
        ];
    }
}
