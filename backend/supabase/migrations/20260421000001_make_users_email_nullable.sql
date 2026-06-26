-- Make users.email nullable so wallet-only users can exist without an email.
-- The previous UNIQUE constraint (auto-named users_email_key) is replaced with
-- a partial unique index that treats NULL as not-equal-to-NULL and also skips
-- soft-deleted rows, matching the pattern used by idx_users_email.

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
    ON users (email)
    WHERE email IS NOT NULL AND deleted_at IS NULL;
