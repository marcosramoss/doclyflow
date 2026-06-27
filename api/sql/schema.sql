-- =============================================================================
-- Doclify API — canonical schema (MySQL 8)
-- =============================================================================
-- ⚠️ NEVER run this file AND api/sql/migrations/0001_oauth_columns.sql
--   in sequence. This file already encodes the post-0001 end-state; running
--   0001 on top will fail with ER_DUPLICATE_FIELDNAME / ER_DUP_KEYNAME.
--
-- This file is canonical for FRESH installs and full-DB resets. It DROPS
-- the four application tables and re-creates them in authorization order.
--
-- For installs that already hold data, use the NON-DESTRUCTIVE bridge:
--     mysql ... < api/sql/migrations/0001_oauth_columns.sql
-- That file is READ-ONLY historical and must not be edited in lockstep
-- with future column-type changes here — it is a snapshot, not a target.
--
-- Apply with:
--   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS doclify < api/sql/schema.sql
--   php api/bin/migrate.php
--   -- or paste this file into your SQL editor and run.
--   USE doclify;  -- ensure your sqleditor session is on `doclify`, not `mysql`.
-- =============================================================================

-- 1. Wipe existing objects in reverse FK dependency order.
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS user_tokens;
DROP TABLE IF EXISTS users;

-- 2. Ensure database exists with utf8mb4.
CREATE DATABASE IF NOT EXISTS doclify
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE doclify;

-- ----------------------------------------------------------------------------
-- 1. users
-- Identidade estável via `google_sub` (do JWT do Google Identity Services).
-- `picture` é opcional e armazena a URL do avatar do Google.
-- `password_hash` foi removido intencionalmente (Doclify é 100% OAuth).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  google_sub  VARCHAR(255) NOT NULL,
  picture     VARCHAR(512) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_sub (google_sub)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. user_tokens — tokens opacos, APENAS o hash SHA256 é armazenado.
--    Logout = DELETE da linha (revogação instantânea).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_tokens_hash (token_hash),
  KEY idx_user_tokens_user (user_id),
  KEY idx_user_tokens_expires (expires_at),
  CONSTRAINT fk_user_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. documents — levantamentos de requisitos do usuário.
--    status armazenado como VARCHAR com CHECK (mais fácil de evoluir que ENUM).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(64) NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  client      VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documents_user (user_id),
  KEY idx_documents_updated (updated_at),
  CONSTRAINT fk_documents_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_documents_status
    CHECK (status IN ('draft', 'in-progress', 'completed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. requirements — itens que compõem cada documento.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirements (
  id          VARCHAR(64) NOT NULL,
  document_id VARCHAR(64) NOT NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'functional',
  description TEXT NOT NULL,
  priority    VARCHAR(20) NOT NULL DEFAULT 'medium',
  position    INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_requirements_doc (document_id),
  CONSTRAINT fk_requirements_doc
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT chk_requirements_type
    CHECK (type IN ('functional', 'non-functional')),
  CONSTRAINT chk_requirements_priority
    CHECK (priority IN ('low', 'medium', 'high', 'critical'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
