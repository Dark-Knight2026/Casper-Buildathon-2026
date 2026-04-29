-- Add authentication-identity columns that future auth methods (password, OAuth)
-- and the profile endpoint will depend on. Columns are added now so that
-- follow-up work can reference them without additional migrations.
--
-- is_profile_complete is intentionally a regular column with a trigger, not
-- GENERATED: GENERATED ALWAYS AS ... STORED requires an IMMUTABLE expression
-- and cannot be altered via ALTER COLUMN ... SET EXPRESSION before Postgres 17.
-- The trigger approach lets us extend the "profile complete" predicate later
-- (e.g., add avatar_url or bio) without DROP/ADD on the column.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS primary_auth_method TEXT NOT NULL DEFAULT 'wallet',
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_primary_auth_method_check;

ALTER TABLE users
    ADD CONSTRAINT users_primary_auth_method_check
    CHECK (primary_auth_method IN ('wallet', 'password', 'oauth'));

COMMENT ON COLUMN users.password_hash IS 'Argon2id PHC-formatted hash; NULL for wallet-only or OAuth-only users';
COMMENT ON COLUMN users.primary_auth_method IS 'Method used at signup: wallet, password, or oauth';
COMMENT ON COLUMN users.bio IS 'Free-form user bio for profile display';
COMMENT ON COLUMN users.is_profile_complete IS 'Maintained by trg_users_profile_complete; true when phone is set (email, first_name, last_name are NOT NULL by schema)';

-- Trigger that keeps is_profile_complete in sync with phone presence. The
-- other required profile fields (email, first_name, last_name) are NOT NULL
-- by schema constraint, so phone is the only column whose presence can
-- actually flip this flag. BEFORE INSERT OR UPDATE so the new row already
-- carries the correct value when it reaches storage and downstream triggers.
CREATE OR REPLACE FUNCTION users_set_profile_complete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.is_profile_complete := NEW.phone IS NOT NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_profile_complete ON users;

CREATE TRIGGER trg_users_profile_complete
    BEFORE INSERT OR UPDATE OF phone
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION users_set_profile_complete();

-- Backfill existing rows so is_profile_complete reflects current data. The
-- trigger handles new rows automatically; this UPDATE is idempotent and safe
-- to re-run.
UPDATE users
SET is_profile_complete = (phone IS NOT NULL)
WHERE deleted_at IS NULL;
