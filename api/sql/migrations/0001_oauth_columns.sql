-- =============================================================================
-- Migration 0001 — OAuth-only `users` table
-- =============================================================================
-- Rationale:
--   The initial `users` table was created back when Doclyflow had an
--   email/password login (`password_hash` NOT NULL). When we switched to
--   Google Identity Services (GIS), `schema.sql` was updated to the desired
--   end-state but a partially-migrated install kept the old shape.
--
--   This migration bridges the gap: add `google_sub` (NOT NULL UNIQUE) and
--   `picture` (NULL), drop the orphan `password_hash`, and ensure the unique
--   key on `email` (it was already present in this install).
--
--   Safe today because the `users` table is empty (0 rows). On a non-empty
--   install the ALTER would need a data backfill plan.
--
-- Apply with:
--   C:\xampp\mysql\bin\mysql.exe -u root doclyflow < api\sql\migrations\0001_oauth_columns.sql
-- =============================================================================

USE doclyflow;

ALTER TABLE users
  ADD COLUMN google_sub VARCHAR(255) NOT NULL AFTER email,
  ADD COLUMN picture    VARCHAR(512)          DEFAULT NULL AFTER google_sub,
  DROP COLUMN password_hash,
  ADD UNIQUE KEY uq_users_google_sub (google_sub);

-- Verify
SELECT 'migration 0001 applied' AS status;
DESCRIBE users;
