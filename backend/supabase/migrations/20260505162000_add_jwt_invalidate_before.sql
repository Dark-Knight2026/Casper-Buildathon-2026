-- Add a per-user "issued-before this timestamp is invalid" cutoff for access
-- tokens. Force-revoke flows (PATCH /me/role, POST /me/sessions/revoke-all,
-- DELETE /me) update this column to NOW() so all outstanding access tokens
-- whose `iat` claim is at or below the cutoff get rejected by the auth
-- middleware on the next request, instead of living until their natural
-- 15-minute `exp`.
--
-- A NULL value means "no cutoff" - all outstanding tokens are accepted on
-- their natural expiration. We deliberately leave the column NULL on
-- existing rows (no backfill): any user without an explicit force-revoke
-- event keeps the previous behaviour, so this migration is a pure
-- functional addition with no observable effect until a force-revoke
-- handler writes to it.
--
-- The `iat` claim itself is added to JWTs in the same commit
-- (crates/api/src/services/auth/jwt.rs::encode_access_token) and to the
-- decoded `Claims` struct (crates/api/src/common/models.rs). Tokens
-- issued before this rollout decode with `iat = 0` (serde default), which
-- is `<= NOW()` for any non-NULL cutoff - so force-revoke also kills
-- legacy tokens, not just freshly-issued ones.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS jwt_invalidate_before TIMESTAMPTZ;

COMMENT ON COLUMN users.jwt_invalidate_before IS
    'If set, all access tokens with claims.iat <= this timestamp are rejected by the auth middleware. Updated by force-revoke flows (role change, revoke-all-sessions, self-delete). NULL means no cutoff is active.';
