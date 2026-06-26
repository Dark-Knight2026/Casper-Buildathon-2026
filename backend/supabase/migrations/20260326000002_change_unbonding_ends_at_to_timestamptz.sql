-- Replace sentinel value 0 with NULL for "no active unbonding".
-- Convert existing epoch-ms BIGINT values to proper TIMESTAMPTZ.
--
-- ============================================================================
-- PRE-CHECK (run before applying in any environment with existing data)
-- ============================================================================
-- The USING clause below assumes every non-zero value is epoch MILLISECONDS.
-- If any row stores epoch seconds (or any other unit), `to_timestamp(x/1000.0)`
-- will produce a bogus timestamp (e.g. 1970-1971) and the unbonding window
-- will never expire.
--
-- Before running this migration, verify that all values fall inside the
-- plausible epoch-ms range (year 2020 to 2036):
--
--     SELECT staker_address, unbonding_ends_at
--     FROM staking_positions
--     WHERE unbonding_ends_at != 0
--       AND unbonding_ends_at NOT BETWEEN 1600000000000 AND 2100000000000;
--
-- If this query returns any rows, STOP and investigate the data source
-- (indexer/contract) before proceeding with the migration. Do not convert
-- blindly - the USING clause cannot distinguish units after the fact.
-- ============================================================================

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
