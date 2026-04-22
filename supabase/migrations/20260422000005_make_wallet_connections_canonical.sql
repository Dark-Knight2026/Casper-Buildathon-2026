-- Make `wallet_connections` the canonical source of a user's wallet
-- addresses, while keeping `users.wallet_address` as a cached convenience
-- column (fast-read without JOIN, but written only by the trigger below).
--
-- Rationale: the auth flow currently resolves users by `users.wallet_address`
-- directly, which prevents a single user from having multiple wallet
-- connections (cspr.click + browser extension, primary + backup). Future
-- phases (3.3) will switch the resolve path to JOIN through
-- `wallet_connections`; this migration lays the DB-side foundation.
--
-- Ownership rules after this migration:
--   - auth code NEVER writes `users.wallet_address` directly;
--   - all wallet mutations go through `wallet_connections`;
--   - the AFTER-trigger recomputes `users.wallet_address` from the row
--     flagged `is_primary = true` for the affected user.
--
-- `users.wallet_address` is intentionally kept (not dropped) because:
--   - several read-paths and indexes depend on it;
--   - token_holdings, nft_holdings, transfers join on the plain column;
--   - the cache lets admin dashboards query without a JOIN.

-- ---------------------------------------------------------------------------
-- 1. Replace the global UNIQUE constraint on `users.wallet_address` with a
--    partial unique index. The original constraint was created inline by
--    `20251213000000_casper_blockchain_integration.sql:13` via
--    `ADD COLUMN ... wallet_address TEXT UNIQUE`, which Postgres auto-names
--    `users_wallet_address_key`.
--
--    Why partial: wallet-less users (password/OAuth-only after Phase 6-7)
--    have `wallet_address IS NULL`, and multiple NULLs must coexist.
--    Global UNIQUE already allows multiple NULLs, but a partial index is
--    the conventional pairing for soft-delete - it ALSO skips rows where
--    `deleted_at IS NOT NULL`, matching the semantics of
--    `idx_users_email_unique` from 20260422000001.
-- ---------------------------------------------------------------------------

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_wallet_address_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_unique
    ON users (wallet_address)
    WHERE wallet_address IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Enforce "at most one primary wallet per user" with a partial unique
--    index on `wallet_connections`. Without this, concurrent inserts marking
--    is_primary=true on two rows for the same user would both succeed, and
--    the sync-trigger would pick one arbitrarily - non-deterministic cache.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_connections_primary
    ON wallet_connections (user_id)
    WHERE is_primary = true;

-- ---------------------------------------------------------------------------
-- 3. Backfill - two sequential steps.
--
--    3a. For users with a cached `wallet_address` but no wallet_connections
--        record at all: create one and mark it primary. Without this, the
--        resolve-by-join path in Phase 3.3 would fail to find existing
--        wallet-logged-in users.
-- ---------------------------------------------------------------------------

INSERT INTO wallet_connections (
    user_id,
    wallet_address,
    provider,
    is_primary,
    is_custodial,
    connected_at
)
SELECT
    u.id,
    u.wallet_address,
    'casper_wallet',
    true,
    false,
    COALESCE(u.last_login_at, NOW())
FROM users u
WHERE u.wallet_address IS NOT NULL
    AND u.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM wallet_connections wc WHERE wc.user_id = u.id
    );

-- ---------------------------------------------------------------------------
--    3b. For users that already have wallet_connections rows but none with
--        `is_primary = true`: promote one. Preference order:
--          (i) the row whose `wallet_address` matches `users.wallet_address`
--              (the cache - preserves whichever address was "active" before);
--          (ii) otherwise the oldest row by `connected_at` (stable pick).
--
--    Written as a single UPDATE ... FROM against a DISTINCT ON subquery so
--    exactly one row per user gets promoted in one statement.
-- ---------------------------------------------------------------------------

WITH users_without_primary AS (
    SELECT u.id AS user_id, u.wallet_address AS cached_wallet
    FROM users u
    WHERE u.deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM wallet_connections wc WHERE wc.user_id = u.id
        )
        AND NOT EXISTS (
            SELECT 1 FROM wallet_connections wc
            WHERE wc.user_id = u.id AND wc.is_primary = true
        )
),
promotion_candidates AS (
    SELECT DISTINCT ON (wc.user_id)
        wc.id
    FROM wallet_connections wc
    JOIN users_without_primary uwp ON uwp.user_id = wc.user_id
    ORDER BY
        wc.user_id,
        (wc.wallet_address = uwp.cached_wallet) DESC NULLS LAST,
        wc.connected_at ASC
)
UPDATE wallet_connections wc
SET is_primary = true
FROM promotion_candidates pc
WHERE wc.id = pc.id;

-- ---------------------------------------------------------------------------
-- 4. Sync trigger: recompute `users.wallet_address` after any mutation on
--    `wallet_connections`. Fires AFTER so that DELETE can observe the
--    post-state (the deleted row is already gone when the SELECT runs).
--
--    Handles the rare UPDATE that re-parents a connection from one user to
--    another (`OLD.user_id <> NEW.user_id`) by recalculating for both sides.
--
--    Returns NULL - AFTER triggers ignore the return value.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wallet_connections_sync_users_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    affected_user_id UUID;
    primary_address  TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_user_id := OLD.user_id;
    ELSE
        affected_user_id := NEW.user_id;
    END IF;

    SELECT wallet_address
    INTO primary_address
    FROM wallet_connections
    WHERE user_id = affected_user_id AND is_primary = true
    LIMIT 1;

    -- IS DISTINCT FROM avoids a no-op write (and the updated_at bump) when
    -- the primary hasn't actually changed.
    UPDATE users
    SET wallet_address = primary_address
    WHERE id = affected_user_id
        AND wallet_address IS DISTINCT FROM primary_address;

    -- Re-parented connection: recompute for the previous owner as well.
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        SELECT wallet_address
        INTO primary_address
        FROM wallet_connections
        WHERE user_id = OLD.user_id AND is_primary = true
        LIMIT 1;

        UPDATE users
        SET wallet_address = primary_address
        WHERE id = OLD.user_id
            AND wallet_address IS DISTINCT FROM primary_address;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_connections_sync_cache ON wallet_connections;

CREATE TRIGGER trg_wallet_connections_sync_cache
    AFTER INSERT OR UPDATE OR DELETE
    ON wallet_connections
    FOR EACH ROW
    EXECUTE FUNCTION wallet_connections_sync_users_cache();

COMMENT ON FUNCTION wallet_connections_sync_users_cache() IS
    'Recomputes users.wallet_address cache from the primary wallet_connections row for the affected user.';
