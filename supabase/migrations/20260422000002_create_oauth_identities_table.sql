-- Table that links an internal user to an external OAuth identity
-- (Google first, Apple/GitHub/etc. later). The actual OAuth flow lands in
-- a later migration; this table is created now so subsequent work can
-- reference it without a schema change in the middle of a feature branch.
--
-- Design notes:
-- * UNIQUE (provider, subject) is the natural key: one external identity
--   maps to at most one internal user. The composite index also serves as
--   the lookup path for the OAuth callback (WHERE provider = $1 AND subject = $2).
-- * user_id FK uses ON DELETE CASCADE so unlinking happens automatically
--   when a user is hard-deleted; soft-delete on users still keeps the row
--   (we never hard-delete in this product).
-- * email is denormalized for audit ("which address was linked when"); the
--   canonical email lives on users.email.
-- * No CHECK on provider: new providers will be added by application code
--   (Rust enum + handler), not by schema migration.

CREATE TABLE IF NOT EXISTS oauth_identities (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- External identity
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    email TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Natural key: one external account maps to at most one internal user.
    CONSTRAINT oauth_identities_provider_subject_unique UNIQUE (provider, subject)
);

-- Reverse-lookup index: "all identities linked to this user" (Connected
-- Accounts UI). The UNIQUE constraint above already indexes
-- (provider, subject), so we don't need an extra index for the forward
-- lookup in the callback.
CREATE INDEX IF NOT EXISTS idx_oauth_identities_user_id
    ON oauth_identities(user_id);

COMMENT ON TABLE oauth_identities IS
    'Links internal users to external OAuth identities (Google, Apple, etc.); one identity per external account.';
COMMENT ON COLUMN oauth_identities.provider IS
    'OAuth provider name (e.g., google, apple, github); validated by application layer, not CHECK.';
COMMENT ON COLUMN oauth_identities.subject IS
    'Provider-issued stable user identifier (e.g., Google id_token.sub).';
COMMENT ON COLUMN oauth_identities.email IS
    'Email reported by provider at linking time; snapshot for audit, not the canonical user email.';
