-- =============================================================================
-- Migration 0004 — `documents.technologies` como TEXT CSV (sem catálogo)
-- =============================================================================
-- Rationale:
--   A versão anterior tentou um catálogo normalizado (tabelas
--   `technologies` + `document_technologies` com FKs e validação de IDs no
--   backend). Era overkill para o produto — o usuário quer apenas uma lista
--   fixa de nomes digitados pelo autor do documento, sem precisar de
--   manutenção de catálogo no banco.
--
--   Esta migration:
--     1. Remove completamente o catálogo legado (DROP TABLE IF EXISTS) —
--        `document_technologies` primeiro por causa da FK.
--     2. Remove também a coluna orfã `other_technology` (vinda da 0003
--        descontinuada) se existir.
--     3. Adiciona `technologies TEXT DEFAULT NULL AFTER description` em
--        `documents` — uma única string CSV (ex.: `"React, PHP, MySQL"`).
--        TEXT cabe ~64KB no MySQL, mais do que suficiente para dezenas de
--        tecnologias por documento.
--
--   Idempotente: usa `IF EXISTS` nos drops, e o gate `information_schema`
--   no ADD COLUMN (mesmo padrão da 0003).
--
-- Apply with:
--   C:\xampp\mysql\bin\mysql.exe -u root doclyflow < api\sql\migrations\0004_documents_technologies_text.sql
-- =============================================================================

USE doclyflow;

-- 1) Limpa o catálogo legado (drop primeiro a join, depois a tabela base)
DROP TABLE IF EXISTS document_technologies;
DROP TABLE IF EXISTS technologies;

-- 2) Remove a coluna órfã `other_technology` (vinda da 0003 cancelada),
--    se o usuário chegou a rodar aquela migration.
SET @ot_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'doclyflow'
    AND TABLE_NAME = 'documents'
    AND COLUMN_NAME = 'other_technology'
);
SET @sql := IF(@ot_exists > 0,
  'ALTER TABLE documents DROP COLUMN other_technology',
  'SELECT ''other_technology already gone'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Adiciona coluna única `technologies` como CSV (TEXT, NULL permitido)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'doclyflow'
    AND TABLE_NAME = 'documents'
    AND COLUMN_NAME = 'technologies'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE documents ADD COLUMN technologies TEXT DEFAULT NULL AFTER description',
  'SELECT ''technologies column already present'' AS note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify
SELECT 'migration 0004 applied' AS status;
DESCRIBE documents;
SHOW TABLES LIKE 'tech%';
