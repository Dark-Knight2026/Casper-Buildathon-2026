-- Replace sentinel value 0 with NULL for "no active unbonding".
-- Convert existing epoch-ms BIGINT values to proper TIMESTAMPTZ.

ALTER TABLE staking_positions
    ALTER COLUMN unbonding_ends_at DROP NOT NULL,
    ALTER COLUMN unbonding_ends_at DROP DEFAULT,
    ALTER COLUMN unbonding_ends_at TYPE TIMESTAMPTZ
        USING CASE
            WHEN unbonding_ends_at = 0 THEN NULL
            ELSE to_timestamp(unbonding_ends_at::DOUBLE PRECISION / 1000.0)
        END,
    ALTER COLUMN unbonding_ends_at SET DEFAULT NULL;

COMMENT ON COLUMN staking_positions.unbonding_ends_at
    IS 'Timestamp when unbonding completes (NULL = no active unbonding)';
