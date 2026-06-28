-- =============================================================================
-- Doclyflow API — canonical schema (MySQL 8)
-- =============================================================================
-- Single source of truth. This file encodes the **final** state of every
-- application table after the project's schema evolution:
--
--   v0  Initial schema. `users` had `password_hash` (NOT NULL); no OAuth.
--   v1  ─▶ Migration 0001_oauth_columns.sql (now folded in here)
--        `users.google_sub VARCHAR(255) NOT NULL UNIQUE` +
--        `users.picture VARCHAR(512) DEFAULT NULL`,
--        UNIQUE KEY uq_users_google_sub, and `password_hash` dropped.
--        Doclyflow became 100% OAuth (Google Identity Services).
--   v2  (0002/0003 — aborted; not in this file)
--        Attempted a normalized tech catalog (`technologies` +
--        `document_technologies` + `documents.other_technology`).
--        Cancelled — see commit history if needed.
--   v3  ─▶ Migration 0004_documents_technologies_text.sql (now folded in here)
--        Normalized catalogue was dropped in favor of a single
--        `documents.technologies TEXT` CSV column (NULL by default).
--
-- DROP+CREATE strategy: this file fully wipes the four application tables
-- before recreating them. **Apply only to FRESH installations** or when
-- you intentionally want to reset all data — re-running WILL wipe data.
--
-- Apply via one of:
--   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS doclyflow < api/sql/schema.sql
--   php api/bin/migrate.php          # tries mysql CLI, falls back to PDO split
--
-- Re-runnable by design (`DROP IF EXISTS` + `CREATE IF NOT EXISTS` will
-- not error), but destructive: each run truncates the application tables.
-- Encoding: utf8mb4 / InnoDB. CHECK constraints complement FKs so invalid
-- enum values are rejected at the database layer (not just the API).
--
-- Note: "v0/v1/v3" history above references columns like `password_hash`
-- and `document_technologies` that were removed/replaced. They no longer
-- exist in the canonical schema — kept here for context only.
-- =============================================================================

-- 1. Wipe existing objects in reverse FK dependency order.
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS user_tokens;
DROP TABLE IF EXISTS users;

-- 2. Ensure database exists with utf8mb4.
CREATE DATABASE IF NOT EXISTS u390010558_doclyflow
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE u390010558_doclyflow;

-- ----------------------------------------------------------------------------
-- 1. users
-- Identity stable via `google_sub` (the JWT `sub` claim from Google
-- Identity Services). `picture` holds the optional Google avatar URL.
-- `password_hash` was intentionally removed when Doclyflow went
-- 100% OAuth (see v1 history in header).
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
-- 2. user_tokens — opaque tokens, only the SHA-256 hash is stored.
--   Logout = DELETE the row (instant revocation).
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
-- 3. documents — requirement spec documents authored by a user.
--   `status` as VARCHAR + CHECK (easier to evolve than ENUM).
--   `technologies` is a free-form CSV string of tech names picked by
--   the author (see v3 history in header). Decoded by
--   DocumentsController::decodeTechnologies() on read. ~64KB TEXT
--   capacity is far more than any realistic document's stack list.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id           VARCHAR(64) NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(255) NOT NULL,
  client       VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  technologies TEXT DEFAULT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
-- 4. requirements — items that compose each document.
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
