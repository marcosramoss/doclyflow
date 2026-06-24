<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Response;
use App\Validator;
use PDO;

/**
 * CRUD de documentos de levantamento de requisitos.
 *
 * Todas as rotas são protegidas via Router::addProtected, então
 * $request->userId chega validado. Operações filtram por user_id
 * garantindo que o usuário só enxerga/edita os próprios documentos.
 *
 * Endpoints:
 *   GET    /api/documents       → lista (ordenada por updated_at desc)
 *   GET    /api/documents/{id}  → detalha
 *   POST   /api/documents       → cria (substitui lista de requirements)
 *   PUT    /api/documents/{id}  → atualiza campos + requirements opcionalmente
 *   DELETE /api/documents/{id}  → remove (cascade nas requirements)
 */
final class DocumentsController
{
    private const STATUSES = ['draft', 'in-progress', 'completed'];
    private const TYPES = ['functional', 'non-functional'];
    private const PRIORITIES = ['low', 'medium', 'high', 'critical'];

    public static function index(Request $request): void
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, title, client, description, status, created_at, updated_at
             FROM documents
             WHERE user_id = :u
             ORDER BY updated_at DESC'
        );
        $stmt->execute(['u' => $request->userId]);
        $docs = array_map(
            static fn(array $r): array => self::hydrate($pdo, $r),
            $stmt->fetchAll()
        );
        Response::json(['documents' => $docs]);
    }

    public static function show(Request $request, string $id): void
    {
        $doc = self::findOwned($request, $id);
        if ($doc === null) {
            throw new HttpException(404, 'Document not found');
        }
        Response::json(['document' => $doc]);
    }

    public static function create(Request $request): void
    {
        $body = $request->body;
        Validator::requireFields($body, ['title', 'client']);

        $title = trim((string) $body['title']);
        $client = trim((string) $body['client']);
        $description = trim((string) ($body['description'] ?? ''));
        $status = self::validateEnum('status', $body['status'] ?? 'draft', self::STATUSES);
        $reqList = self::normalizeRequirements($body['requirements'] ?? []);

        $pdo = Database::pdo();
        $id = self::resolveClientId($body['id'] ?? null, $pdo);
        $now = gmdate('Y-m-d H:i:s');
        $pdo->beginTransaction();
        try {
            $insDoc = $pdo->prepare(
                'INSERT INTO documents
                   (id, user_id, title, client, description, status, created_at, updated_at)
                 VALUES (:id, :u, :t, :c, :d, :s, :ca, :ua)'
            );
            $insDoc->execute([
                'id' => $id,
                'u' => $request->userId,
                't' => $title,
                'c' => $client,
                'd' => $description,
                's' => $status,
                'ca' => $now,
                'ua' => $now,
            ]);
            self::insertRequirements($pdo, $id, $reqList);
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $created = self::findOwned($request, $id);
        if ($created === null) {
            throw new HttpException(500, 'Failed to read created document');
        }
        Response::json(['document' => $created], 201);
    }

    public static function update(Request $request, string $id): void
    {
        $existing = self::findOwned($request, $id);
        if ($existing === null) {
            throw new HttpException(404, 'Document not found');
        }
        $body = $request->body;
        Validator::requireFields($body, ['title', 'client']);

        $title = trim((string) $body['title']);
        $client = trim((string) $body['client']);
        $description = trim((string) ($body['description'] ?? $existing['description']));
        $status = self::validateEnum(
            'status',
            $body['status'] ?? $existing['status'],
            self::STATUSES
        );
        $requirementsProvided = array_key_exists('requirements', $body);
        $reqList = $requirementsProvided
            ? self::normalizeRequirements($body['requirements'])
            : null;

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare(
                'UPDATE documents
                 SET title = :t, client = :c, description = :d, status = :s, updated_at = :ua
                 WHERE id = :id AND user_id = :u'
            );
            $upd->execute([
                't' => $title,
                'c' => $client,
                'd' => $description,
                's' => $status,
                'ua' => gmdate('Y-m-d H:i:s'),
                'id' => $id,
                'u' => $request->userId,
            ]);
            if ($reqList !== null) {
                $del = $pdo->prepare('DELETE FROM requirements WHERE document_id = :d');
                $del->execute(['d' => $id]);
                self::insertRequirements($pdo, $id, $reqList);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $updated = self::findOwned($request, $id);
        Response::json(['document' => $updated]);
    }

    public static function destroy(Request $request, string $id): void
    {
        $existing = self::findOwned($request, $id);
        if ($existing === null) {
            throw new HttpException(404, 'Document not found');
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('DELETE FROM documents WHERE id = :id AND user_id = :u');
        $stmt->execute(['id' => $id, 'u' => $request->userId]);
        Response::json(['ok' => true]);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private static function findOwned(Request $request, string $id): ?array
    {
        $pdo = Database::pdo();
        $stmt = $pdo->prepare(
            'SELECT id, title, client, description, status, created_at, updated_at
             FROM documents
             WHERE id = :id AND user_id = :u LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'u' => $request->userId]);
        $row = $stmt->fetch();
        return $row === false ? null : self::hydrate($pdo, $row);
    }

    private static function hydrate(PDO $pdo, array $row): array
    {
        $reqStmt = $pdo->prepare(
            'SELECT id, type, description, priority
             FROM requirements
             WHERE document_id = :d
             ORDER BY position ASC, id ASC'
        );
        $reqStmt->execute(['d' => $row['id']]);
        $reqs = array_map(
            static fn(array $r): array => [
                'id' => (string) $r['id'],
                'type' => (string) $r['type'],
                'description' => (string) $r['description'],
                'priority' => (string) $r['priority'],
            ],
            $reqStmt->fetchAll()
        );

        return [
            'id' => (string) $row['id'],
            'title' => (string) $row['title'],
            'client' => (string) $row['client'],
            'description' => (string) $row['description'],
            'status' => (string) $row['status'],
            'createdAt' => self::iso($row['created_at']),
            'updatedAt' => self::iso($row['updated_at']),
            'requirements' => $reqs,
        ];
    }

    /** @param array<int|string, mixed> $reqs
     *  @return list<array{id:string,type:string,description:string,priority:string}>
     */
    private static function normalizeRequirements(mixed $reqs): array
    {
        if ($reqs === null) {
            return [];
        }
        if (!is_array($reqs)) {
            throw new HttpException(400, 'requirements must be an array');
        }
        $out = [];
        foreach ($reqs as $r) {
            if (!is_array($r)) {
                continue;
            }
            $type = self::validateEnum('type', $r['type'] ?? 'functional', self::TYPES);
            $priority = self::validateEnum('priority', $r['priority'] ?? 'medium', self::PRIORITIES);
            $desc = trim((string) ($r['description'] ?? ''));
            $out[] = [
                'id' => 'req-' . self::shortId(6),
                'type' => $type,
                'description' => $desc,
                'priority' => $priority,
            ];
        }
        return $out;
    }

    /**
     * @param list<string> $allowed
     */
    private static function validateEnum(string $field, mixed $value, array $allowed): string
    {
        if (!is_string($value) || !Validator::oneOf($value, $allowed)) {
            throw new HttpException(400, "Invalid $field", ['allowed' => $allowed]);
        }
        return $value;
    }

    /** @param list<array{id:string,type:string,description:string,priority:string}> $reqs */
    private static function insertRequirements(PDO $pdo, string $docId, array $reqs): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO requirements
               (id, document_id, type, description, priority, position)
             VALUES (:i, :d, :t, :ds, :p, :pos)'
        );
        $pos = 0;
        foreach ($reqs as $r) {
            $stmt->execute([
                'i' => $r['id'],
                'd' => $docId,
                't' => $r['type'],
                'ds' => $r['description'],
                'p' => $r['priority'],
                'pos' => $pos++,
            ]);
        }
    }

    private static function shortId(int $bytes = 8): string
    {
        return bin2hex(random_bytes($bytes));
    }

    /**
     * Decide qual id usar para o novo documento.
     * Aceita id do body se for seguro (regex); gera um novo caso ausente.
     * Retorna 409 se o id do cliente já existe.
     */
    private static function resolveClientId(mixed $clientId, PDO $pdo): string
    {
        if (!is_string($clientId)) {
            return 'doc-' . self::shortId(8);
        }
        $trimmed = trim($clientId);
        if ($trimmed === '' || strlen($trimmed) > 64 || !preg_match('/^[A-Za-z0-9_\-]+$/', $trimmed)) {
            throw new HttpException(400, 'Invalid document id', [
                'pattern' => '^[A-Za-z0-9_-]+$', 'maxLength' => 64,
            ]);
        }
        $check = $pdo->prepare('SELECT 1 FROM documents WHERE id = :i LIMIT 1');
        $check->execute(['i' => $trimmed]);
        if ($check->fetchColumn()) {
            throw new HttpException(409, 'Document with this id already exists');
        }
        return $trimmed;
    }

    private static function iso(string $mysql): string
    {
        $dt = \DateTimeImmutable::createFromFormat(
            'Y-m-d H:i:s',
            $mysql,
            new \DateTimeZone('UTC')
        );
        return $dt === false ? $mysql : $dt->format('Y-m-d\TH:i:s.v\Z');
    }
}
