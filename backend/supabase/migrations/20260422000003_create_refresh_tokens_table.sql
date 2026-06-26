-- Table that stores rotating refresh tokens for auth sessions.
--
-- Design notes:
-- * We store SHA-256 of the opaque token in BYTEA, never the plaintext. The
--   plaintext is returned to the client once (login / refresh response) and
--   thereafter only its hash is compared. SHA-256 without a salt is safe for
--   high-entropy 32-byte opaque tokens (unlike passwords, where argon2 is
--   required).
-- * family_id groups all rotations of a single login session. On a successful
--   rotation the new row inherits the old row's family_id; on reuse detection
--   we revoke the entire family in one UPDATE. Without family_id we would
--   have to walk replaced_by recursively, which is both slower and harder to
--   reason about.
-- * replaced_by is a self-FK creating an audit chain (oldest -> newest). On
--   delete of the predecessor we SET NULL so the successor stays intact.
-- * The partial unique index on (token_hash) WHERE revoked_at IS NULL
--   enforces "at most one active token with this hash" without locking us
--   into never reissuing an (astronomically unlikely) colliding hash after
--   revocation.

CREATE TABLE IF NOT EXISTS refresh_tokens (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Token material (raw SHA-256 of the opaque token, never plaintext)
    token_hash BYTEA NOT NULL,

    -- Rotation lineage
    family_id UUID NOT NULL,
    replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,

    -- Lifecycle timestamps
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,

    -- Audit (populated from the request that issued the token)
    user_agent TEXT,
    ip INET
);

-- Active-token lookup: the refresh handler finds a row by sha256(plaintext).
-- Partial index keeps it small (revoked rows fall out) and enforces
-- uniqueness only for currently-usable tokens.
CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_active
    ON refresh_tokens(token_hash)
    WHERE revoked_at IS NULL;

-- Reverse lookup: "all sessions belonging to this user" (sessions list UI,
-- mass-logout flows).
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

-- Reuse-detection: on detected misuse we revoke the entire family in one
-- statement, so family_id must be indexed for the predicate to be cheap.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id
    ON refresh_tokens(family_id);

COMMENT ON TABLE refresh_tokens IS
    'Rotating refresh tokens; one row per issued token, linked into families for reuse detection.';
COMMENT ON COLUMN refresh_tokens.token_hash IS
    'SHA-256 of the opaque refresh token (32 raw bytes); plaintext never persisted.';
COMMENT ON COLUMN refresh_tokens.family_id IS
    'Shared by all tokens rotated from the same login; reuse of any member revokes the whole family.';
COMMENT ON COLUMN refresh_tokens.replaced_by IS
    'Points to the token this one was rotated into; NULL for the current (latest) token in the chain.';
COMMENT ON COLUMN refresh_tokens.revoked_at IS
    'NULL while active; set on logout, rotation, family-wide revocation, or password reset.';
