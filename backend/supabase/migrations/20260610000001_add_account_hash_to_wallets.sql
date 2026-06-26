-- Add a cached Casper account hash alongside each wallet so the indexer can
-- reconcile `UserCreated` events with an indexed lookup instead of scanning
-- every unregistered wallet.
--
-- Background: `users.wallet_address` (and `wallet_connections.wallet_address`)
-- stores a *public key* (66/68 hex), while the on-chain `UserCreated` event
-- carries the derived *account hash*. Matching the two requires the
-- `blake2b(public_key)` derivation, which Postgres cannot compute - so the
-- previous handler loaded every wallet without an on-chain id and compared in
-- Rust (O(N) per event). Caching the account hash turns that into a single
-- indexed `WHERE account_hash = $1`.
--
-- Ownership mirrors `wallet_address` exactly (see
-- `20260422000005_make_wallet_connections_canonical.sql`):
--   - `wallet_connections.account_hash` is the source of truth, written by the
--     Rust insert path (which has the public key and can derive the hash);
--   - `users.account_hash` is a read cache, written ONLY by the sync trigger
--     below, recomputed from the primary `wallet_connections` row.
--
-- Backfill: the derivation lives in Rust, so existing rows keep
-- `account_hash = NULL` here. The indexer carries a narrow fallback that scans
-- only the `account_hash IS NULL` set, so legacy wallets still reconcile; that
-- set shrinks to empty as users re-link, and new links never hit it.

ALTER TABLE wallet_connections ADD COLUMN account_hash TEXT;
ALTER TABLE users ADD COLUMN account_hash TEXT;

-- The account hash is a deterministic function of the (already unique) primary
-- wallet's public key, so it is unique among the same rows. Partial to match
-- `users_wallet_address_unique`: skips NULLs (wallet-less or un-backfilled rows)
-- and soft-deleted accounts, and gives the indexer's lookup an index to use.
CREATE UNIQUE INDEX IF NOT EXISTS users_account_hash_unique
    ON users (account_hash)
    WHERE account_hash IS NOT NULL AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Extend the cache-sync trigger to carry `account_hash` next to
-- `wallet_address`. Same body as 20260422000005, now selecting and writing
-- both columns from the affected user's primary wallet connection. The trigger
-- only copies the value the Rust insert path already derived - it never
-- computes the hash itself.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION wallet_connections_sync_users_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    affected_user_id UUID;
    primary_address  TEXT;
    primary_hash     TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_user_id := OLD.user_id;
    ELSE
        affected_user_id := NEW.user_id;
    END IF;

    SELECT wallet_address, account_hash
    INTO primary_address, primary_hash
    FROM wallet_connections
    WHERE user_id = affected_user_id AND is_primary = true
    LIMIT 1;

    -- IS DISTINCT FROM avoids a no-op write (and the updated_at bump) when
    -- neither the primary address nor its hash actually changed.
    UPDATE users
    SET wallet_address = primary_address,
        account_hash   = primary_hash
    WHERE id = affected_user_id
        AND (wallet_address IS DISTINCT FROM primary_address
             OR account_hash IS DISTINCT FROM primary_hash);

    -- Re-parented connection: recompute for the previous owner as well.
    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        SELECT wallet_address, account_hash
        INTO primary_address, primary_hash
        FROM wallet_connections
        WHERE user_id = OLD.user_id AND is_primary = true
        LIMIT 1;

        UPDATE users
        SET wallet_address = primary_address,
            account_hash   = primary_hash
        WHERE id = OLD.user_id
            AND (wallet_address IS DISTINCT FROM primary_address
                 OR account_hash IS DISTINCT FROM primary_hash);
    END IF;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION wallet_connections_sync_users_cache() IS
    'Recomputes users.wallet_address and users.account_hash caches from the primary wallet_connections row for the affected user.';
