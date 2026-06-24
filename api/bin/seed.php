<?php
declare(strict_types=1);

/**
 * Doclify API — seed.
 *
 * Cria (idempotente) o usuário demo `demo@requisita.app / demo1234`
 * e popula três documentos-modelo que espelham o frontend seed.
 *
 *   php api/bin/seed.php
 *
 * Use para testar a API rapidamente sem depender do frontend:
 *   curl -X POST -H "Content-Type: application/json" \
        -d '{"email":"demo@requisita.app","password":"demo1234"}' \
        http://localhost:8080/api/auth/login
 */

require __DIR__ . '/../src/bootstrap.php';

use App\Database;

try {
    $pdo = Database::pdo();
} catch (Throwable $e) {
    fwrite(STDERR, "DB connection failed: " . $e->getMessage() . "\n");
    exit(1);
}

$demoEmail = 'demo@requisita.app';
$demoPassword = 'demo1234';

echo "Seeding Doclify demo data...\n";

$pdo->beginTransaction();
try {
    // 1. Usuário demo
    $stmt = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash)
         VALUES (:n, :e, :p)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            password_hash = VALUES(password_hash)'
    );
    $stmt->execute([
        'n' => 'Demo User',
        'e' => $demoEmail,
        'p' => password_hash($demoPassword, PASSWORD_DEFAULT),
    ]);
    $userId = (int) $pdo->query(
        "SELECT id FROM users WHERE email = " . $pdo->quote($demoEmail)
    )->fetchColumn();

    // 2. Documentos modelo
    $docs = [
        [
            'id' => 'demo-ecommerce-b2b',
            'title' => 'Sistema de E-commerce B2B',
            'client' => 'Acme Corp',
            'description' =>
                'Levantamento inicial de requisitos para uma plataforma de '
                . 'e-commerce voltada para vendas B2B, com catálogos segmentados, '
                . 'integração ao ERP e fluxo de aprovação de pedidos.',
            'status' => 'in-progress',
            'created_at' => '2026-05-12 13:30:00',
            'updated_at' => '2026-06-20 10:00:00',
            'requirements' => [
                ['type' => 'functional',     'priority' => 'high',     'description' => 'Autenticação de usuários via SSO corporativo (SAML/OIDC).'],
                ['type' => 'functional',     'priority' => 'high',     'description' => 'Catálogo de produtos com segmentação por cliente e políticas de preço.'],
                ['type' => 'functional',     'priority' => 'medium',   'description' => 'Carrinho persistente entre sessões e dispositivos.'],
                ['type' => 'non-functional', 'priority' => 'critical', 'description' => 'Tempo de resposta inferior a 200ms no percentil 95.'],
                ['type' => 'non-functional', 'priority' => 'critical', 'description' => 'Conformidade com LGPD para tratamento de dados de clientes.'],
            ],
        ],
        [
            'id' => 'demo-app-financeiro',
            'title' => 'Aplicativo de Controle Financeiro Pessoal',
            'client' => 'Fintech X',
            'description' =>
                'MVP de aplicativo mobile-first para controle financeiro pessoal '
                . 'com categorização automática, metas de economia e relatórios mensais.',
            'status' => 'draft',
            'created_at' => '2026-06-01 09:15:00',
            'updated_at' => '2026-06-15 17:45:00',
            'requirements' => [
                ['type' => 'functional',     'priority' => 'high',   'description' => 'Cadastro de receitas e despesas com categorização manual e automática.'],
                ['type' => 'functional',     'priority' => 'medium', 'description' => 'Definição de metas mensais por categoria.'],
                ['type' => 'non-functional', 'priority' => 'high',   'description' => 'Sincronização offline-first com resolução de conflitos por último-write-wins.'],
            ],
        ],
        [
            'id' => 'demo-portal-rh',
            'title' => 'Portal Interno de RH',
            'client' => 'Beta Industries',
            'description' =>
                'Portal interno para colaboradores acessarem holerites, benefícios, '
                . 'documentos e abertura de chamados ao RH.',
            'status' => 'completed',
            'created_at' => '2026-04-02 08:00:00',
            'updated_at' => '2026-05-30 11:20:00',
            'requirements' => [
                ['type' => 'functional',     'priority' => 'critical', 'description' => 'Login com credencial corporativa e MFA via TOTP.'],
                ['type' => 'functional',     'priority' => 'high',     'description' => 'Emissão e download de holerites em PDF dos últimos 24 meses.'],
                ['type' => 'functional',     'priority' => 'medium',   'description' => 'Abertura e acompanhamento de chamados ao RH com SLA visível.'],
                ['type' => 'non-functional', 'priority' => 'high',     'description' => 'Acessibilidade WCAG 2.1 nível AA em todas as telas.'],
            ],
        ],
    ];

    $insDoc = $pdo->prepare(
        'INSERT INTO documents
            (id, user_id, title, client, description, status, created_at, updated_at)
         VALUES (:id, :u, :t, :c, :d, :s, :ca, :ua)
         ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            client = VALUES(client),
            description = VALUES(description),
            status = VALUES(status),
            updated_at = VALUES(updated_at)'
    );
    $delReq = $pdo->prepare('DELETE FROM requirements WHERE document_id = :d');
    $insReq = $pdo->prepare(
        'INSERT INTO requirements
            (id, document_id, type, description, priority, position)
         VALUES (:i, :d, :t, :ds, :p, :pos)'
    );

    foreach ($docs as $doc) {
        $insDoc->execute([
            'id' => $doc['id'],
            'u' => $userId,
            't' => $doc['title'],
            'c' => $doc['client'],
            'd' => $doc['description'],
            's' => $doc['status'],
            'ca' => $doc['created_at'],
            'ua' => $doc['updated_at'],
        ]);
        $delReq->execute(['d' => $doc['id']]);
        $pos = 0;
        foreach ($doc['requirements'] as $r) {
            $insReq->execute([
                'i' => $doc['id'] . '-r' . ($pos + 1),
                'd' => $doc['id'],
                't' => $r['type'],
                'ds' => $r['description'],
                'p' => $r['priority'],
                'pos' => $pos++,
            ]);
        }
    }

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "Seed failed: " . $e->getMessage() . "\n");
    exit(1);
}

echo "Seed completed.\n";
echo "  User: $demoEmail / $demoPassword\n";
echo "  Documents: " . count($docs) . " demo records\n";
