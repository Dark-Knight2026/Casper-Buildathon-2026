-- Vesting schedule data from ScheduleCreated / TokensClaimed contract events.
--
-- Each ICO purchase creates a vesting schedule via Vesting.create_schedule().
-- TokensClaimed events update claimed_amount when beneficiary claims tokens.
-- U256 amounts are stored as TEXT to support arbitrarily large numbers.

CREATE TABLE IF NOT EXISTS vesting_schedules (
    -- Vesting schedule ID from the contract (U256 as TEXT).
    vesting_id          TEXT        PRIMARY KEY,
    -- Account hash of the beneficiary (64 hex, no prefix).
    beneficiary         TEXT        NOT NULL,
    -- Account hash of the whitelisted creator (e.g. ICO contract).
    whitelisted_creator TEXT        NOT NULL,
    -- Total number of tokens locked (U256 as TEXT, minimal units, decimals=18).
    total_amount        TEXT        NOT NULL,
    -- Number of tokens already claimed (U256 as TEXT, minimal units, decimals=18).
    claimed_amount      TEXT        NOT NULL DEFAULT '0',
    -- Block timestamp when the vesting clock starts (epoch ms).
    start_timestamp     BIGINT      NOT NULL,
    -- Duration before any tokens become claimable (ms).
    cliff_duration      BIGINT      NOT NULL,
    -- Total duration from start to full vesting (ms).
    vesting_duration    BIGINT      NOT NULL,
    -- Deploy hash that emitted the ScheduleCreated event.
    transaction_hash    TEXT        NOT NULL,
    -- Block height where the event was included.
    block_height        BIGINT      NOT NULL,
    -- Row timestamps.
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vesting_beneficiary ON vesting_schedules (beneficiary);
CREATE INDEX idx_vesting_start       ON vesting_schedules (start_timestamp);

COMMENT ON TABLE  vesting_schedules                IS 'Vesting schedules indexed from ScheduleCreated/TokensClaimed contract events';
COMMENT ON COLUMN vesting_schedules.vesting_id     IS 'U256 schedule ID from the Vesting contract';
COMMENT ON COLUMN vesting_schedules.total_amount   IS 'Total locked BIG tokens in minimal units (decimals=18)';
COMMENT ON COLUMN vesting_schedules.claimed_amount IS 'Cumulative claimed amount, updated by TokensClaimed events';
COMMENT ON COLUMN vesting_schedules.cliff_duration IS 'Cliff period in milliseconds before any tokens unlock';
