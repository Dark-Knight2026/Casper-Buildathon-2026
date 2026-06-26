-- Add created_at column to staking_positions so we know when a stake was
-- originally opened.  Existing rows get the current timestamp as a fallback;
-- future INSERTs use DEFAULT NOW() and the ON CONFLICT UPDATE clause in the
-- indexer intentionally omits created_at, preserving the original value.

ALTER TABLE staking_positions
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN staking_positions.created_at
    IS 'Timestamp when the staking position was first created';
