-- =============================================================================
-- Doclify API — schema MySQL 8
-- =============================================================================
-- Aplicar com:
--   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS < api/sql/schema.sql
-- ou via:
--   php api/bin/migrate.php
-- =============================================================================

CREATE DATABASE IF NOT EXISTS doclify
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE doclify;

-- ----------------------------------------------------------------------------
-- 1. users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
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
