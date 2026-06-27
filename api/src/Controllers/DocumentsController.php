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
 * Endpoints protegidos via Router::addProtected → $request->userId validado.
 * Operações filtram por user_id, garantindo isolamento por usuário.
 *
 * Endpoints:
 *   GET    /api/documents       → lista (ordenada por updated_at desc)
 *   GET    /api/documents/{id}  → detalha
 *   POST   /api/documents       → cria
 *   PUT    /api/documents/{id}  → atualiza
 *   DELETE /api/documents/{id}  → remove (cascade em requirements)
 *
 * Nota: `technologies` é um array de strings (nomes livres, sem catálogo).
 * Persistido em `documents.technologies TEXT` como CSV. `null` (coluna vazia)
 * é equivalente a "sem stack selecionada".
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
            'SELECT id, title, client, description, technologies, status, created_at, updated_at
             FROM documents
             WHERE user_id = :u
             ORDER BY updated_at DESC'
        );
        $stmt->execute(['u' => $request->userId]);
        $docs = array_map(
            static fn(array $r): array => self::hydrate($r),
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
        $technologies = self::normalizeTechnologies($body['technologies'] ?? null);
        $status = self::validateEnum('status', $body['status'] ?? 'draft', self::STATUSES);
        $reqList = self::normalizeRequirements($body['requirements'] ?? []);

        $pdo = Database::pdo();
        $id = self::resolveClientId($body['id'] ?? null, $pdo);
        $now = gmdate('Y-m-d H:i:s');
        $pdo->beginTransaction();
        try {
            $insDoc = $pdo->prepare(
                'INSERT INTO documents
                   (id, user_id, title, client, description, technologies, status, created_at, updated_at)
                 VALUES (:id, :u, :t, :c, :d, :tech, :s, :ca, :ua)'
            );
            $insDoc->execute([
                'id'   => $id,
                'u'    => $request->userId,
                't'    => $title,
                'c'    => $client,
                'd'    => $description,
                'tech' => self::encodeTechnologies($technologies),
                's'    => $status,
                'ca'   => $now,
                'ua'   => $now,
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
        $technologiesProvided = array_key_exists('technologies', $body);
        $technologies = $technologiesProvided
            ? self::normalizeTechnologies($body['technologies'])
            : self::decodeTechnologies($existing['technologies']);
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
                 SET title = :t, client = :c, description = :d, technologies = :tech,
                     status = :s, updated_at = :ua
                 WHERE id = :id AND user_id = :u'
            );
            $upd->execute([
                't'    => $title,
                'c'    => $client,
                'd'    => $description,
                'tech' => self::encodeTechnologies($technologies),
                's'    => $status,
                'ua'   => gmdate('Y-m-d H:i:s'),
                'id'   => $id,
                'u'    => $request->userId,
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
            'SELECT id, title, client, description, technologies, status, created_at, updated_at
             FROM documents
             WHERE id = :id AND user_id = :u LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'u' => $request->userId]);
        $row = $stmt->fetch();
        return $row === false ? null : self::hydrate($row);
    }

    private static function hydrate(array $row): array
    {
        $pdo = Database::pdo();
        $reqStmt = $pdo->prepare(
            'SELECT id, type, description, priority
             FROM requirements
             WHERE document_id = :d
             ORDER BY position ASC, id ASC'
        );
        $reqStmt->execute(['d' => $row['id']]);
        $reqs = array_map(
            static fn(array $r): array => [
                'id'          => (string) $r['id'],
                'type'        => (string) $r['type'],
                'description' => (string) $r['description'],
                'priority'    => (string) $r['priority'],
            ],
            $reqStmt->fetchAll()
        );

        return [
            'id'           => (string) $row['id'],
            'title'        => (string) $row['title'],
            'client'       => (string) $row['client'],
            'description'  => (string) $row['description'],
            'technologies' => self::decodeTechnologies($row['technologies'] ?? null),
            'status'       => (string) $row['status'],
            'createdAt'    => self::iso($row['created_at']),
            'updatedAt'    => self::iso($row['updated_at']),
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
            $type     = self::validateEnum('type', $r['type'] ?? 'functional', self::TYPES);
            $priority = self::validateEnum('priority', $r['priority'] ?? 'medium', self::PRIORITIES);
            $desc     = trim((string) ($r['description'] ?? ''));
            $out[] = [
                'id'          => 'req-' . self::shortId(6),
                'type'        => $type,
                'description' => $desc,
                'priority'    => $priority,
            ];
        }
        return $out;
    }

    /**
     * Normaliza o array `technologies` recebido do body em uma lista dedupada +
     * trimada de strings. Aceita `null` ou ausente (sem techs). Aceita lista
     * vazia (limpa stack). Rejeita tipos não-array (400). Limita o tamanho
     * por entrada para evitar payloads abusivos.
     *
     * @return list<string>
     */
    private static function normalizeTechnologies(mixed $raw): array
    {
        if ($raw === null) {
            return [];
        }
        if (!is_array($raw)) {
            throw new HttpException(400, 'technologies must be an array of strings');
        }
        $out = [];
        foreach ($raw as $t) {
            if (!is_string($t)) {
                continue;
            }
            $trim = trim($t);
            if ($trim === '') {
                continue;
            }
            if (strlen($trim) > 100) {
                throw new HttpException(
                    400,
                    'technology name too long',
                    ['maxLength' => 100, 'actual' => strlen($trim), 'value' => $trim],
                );
            }
            $out[] = $trim;
        }
        return array_values(array_unique($out));
    }

    /** Serializa lista para CSV a gravar na coluna TEXT. */
    private static function encodeTechnologies(array $techs): ?string
    {
        if (count($techs) === 0) {
            return null;
        }
        return implode(', ', $techs);
    }

    /**
     * Decodifica CSV da coluna TEXT em array de strings. Tolerante a:
     *   - null/'' (vazio → [])
     *   - espaços extras (`" A , B  , C"` → `["A", "B", "C"]`)
     *   - itens vazios após split (filtrados)
     */
    private static function decodeTechnologies(?string $raw): array
    {
        if ($raw === null) {
            return [];
        }
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return [];
        }
        $parts = explode(',', $trimmed);
        $out = [];
        foreach ($parts as $p) {
            $v = trim($p);
            if ($v !== '') {
                $out[] = $v;
            }
        }
        return array_values(array_unique($out));
    }

    /** @param list<string> $allowed */
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
                'i'   => $r['id'],
                'd'   => $docId,
                't'   => $r['type'],
                'ds'  => $r['description'],
                'p'   => $r['priority'],
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
