-- Add a non-partial B-tree index on refresh_tokens.token_hash so the
-- lookup-by-hash hot paths stay O(log n) as the table grows.
--
-- The original migration (20260422000003_create_refresh_tokens_table.sql)
-- created a single partial unique index:
--   refresh_tokens_token_hash_active ON refresh_tokens(token_hash)
--       WHERE revoked_at IS NULL
-- which is correct for enforcing "at most one active token per hash" on
-- INSERT, but unusable for queries that do not repeat the predicate.
-- PostgreSQL only picks a partial index when the query's WHERE clause
-- implies the index predicate.
--
-- Two production hot paths look up by token_hash WITHOUT
-- `AND revoked_at IS NULL`:
--   * `rotate_refresh_token` (services/auth/db.rs):
--       SELECT ... FROM refresh_tokens rt
--       WHERE rt.token_hash = $1 FOR UPDATE OF rt
--     The query intentionally omits the predicate so reuse-detection can
--     observe a row whose `revoked_at` is already set (the second arm of
--     the FOR UPDATE serialization). Adding `AND revoked_at IS NULL`
--     would silently turn reuse into 404 NotFound and skip the
--     family-revocation branch.
--   * `revoke_refresh_family_by_hash` (services/auth/db.rs):
--       SELECT family_id FROM refresh_tokens WHERE token_hash = $1
--     Used on logout. Looking up the family from any historical row in
--     the chain is desirable - logout must revoke the whole family even
--     if the cookie holder presents an already-rotated stale hash.
--
-- Without this index both queries fall back to a sequential scan over
-- `refresh_tokens`. Since the table is append-heavy (every rotation
-- inserts, no DELETE policy yet) the cost grows linearly forever:
-- every `/auth/refresh` and `/auth/logout` becomes slower by the same
-- ratio as the historical-rows count grows.
--
-- We KEEP the existing partial unique index. It still enforces "at most
-- one active token per hash" at INSERT time and is what the conflict
-- recovery path in `insert_refresh_token` relies on. Replacing it with
-- a non-partial unique index would refuse reissuance after revoke on
-- the (astronomically unlikely) SHA-256 collision and break that
-- recovery path.

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
    ON refresh_tokens(token_hash);

COMMENT ON INDEX idx_refresh_tokens_token_hash IS
    'Lookup-by-hash for rotate/revoke paths that do not filter on revoked_at; complements the partial unique index refresh_tokens_token_hash_active which only serves INSERT-time uniqueness.';
