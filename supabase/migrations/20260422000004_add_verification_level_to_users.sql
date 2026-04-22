-- Aggregate verification level for users. Combines the existing boolean
-- flags (email_verified, identity_verified) into a single ordered state
-- that JWT claims and future access-gating extractors can consume without
-- juggling two booleans.
--
-- Monotonic upgrade-only: the trigger never downgrades the level. This is a
-- hard invariant - if an admin re-sets email_verified=true on a user who
-- already passed identity, a naive "always sync to 'email'" would silently
-- strip their KYC state. The trigger's IS DISTINCT FROM guards ensure it
-- only fires on transitions from !=true to true.
--
-- Level ordering: none(0) < email(1) < identity(2) < full(3).
-- "full" means both email and identity verified; reached by verifying
-- email after identity or identity after email.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'none';

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_verification_level_check;

ALTER TABLE users
    ADD CONSTRAINT users_verification_level_check
    CHECK (verification_level IN ('none', 'email', 'identity', 'full'));

COMMENT ON COLUMN users.verification_level IS
    'Aggregate verification state: none < email < identity < full; monotonically upgraded by trg_users_sync_verification_level.';

CREATE OR REPLACE FUNCTION users_sync_verification_level()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    rank_map CONSTANT jsonb := '{"none":0,"email":1,"identity":2,"full":3}';
BEGIN
    -- Email verified transitioned to true: upgrade to 'email' if currently
    -- lower. IS DISTINCT FROM treats OLD=NULL (INSERT) as "not true", so the
    -- branch also fires on row creation with email_verified=true.
    IF NEW.email_verified = true AND OLD.email_verified IS DISTINCT FROM true THEN
        IF (rank_map ->> NEW.verification_level)::int < (rank_map ->> 'email')::int THEN
            NEW.verification_level := 'email';
        END IF;
    END IF;

    -- Identity verified transitioned to true: upgrade to 'full' if email is
    -- already present, otherwise to 'identity'. Ordering matters - this
    -- branch runs after the email branch, so if both booleans flip on the
    -- same INSERT, NEW.verification_level will already be 'email' here and
    -- we correctly promote to 'full'.
    IF NEW.identity_verified = true AND OLD.identity_verified IS DISTINCT FROM true THEN
        IF NEW.email_verified = true
           AND (rank_map ->> NEW.verification_level)::int < (rank_map ->> 'full')::int THEN
            NEW.verification_level := 'full';
        ELSIF (rank_map ->> NEW.verification_level)::int < (rank_map ->> 'identity')::int THEN
            NEW.verification_level := 'identity';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_sync_verification_level ON users;

CREATE TRIGGER trg_users_sync_verification_level
    BEFORE INSERT OR UPDATE OF email_verified, identity_verified
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION users_sync_verification_level();

-- Backfill existing rows. The trigger only fires on future INSERT/UPDATE,
-- so pre-existing verified users would otherwise stay on the default
-- 'none'. Idempotent: running again yields the same CASE result.
UPDATE users
SET verification_level = CASE
    WHEN email_verified = true AND identity_verified = true THEN 'full'
    WHEN identity_verified = true THEN 'identity'
    WHEN email_verified = true THEN 'email'
    ELSE 'none'
END
WHERE deleted_at IS NULL;
