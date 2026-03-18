-- Staking tables for indexing Staked, UnstakedInitiated, UnbondedWithdrawn,
-- RewardsDeposited and RewardsClaimed contract events.
--
-- staking_positions  - current state per staker (upserted on every event)
-- staking_events     - append-only log of all staker actions
-- staking_reward_deposits - treasury reward deposits into the staking pool
--
-- U256 amounts are stored as TEXT to support arbitrarily large numbers.

-- ============================================================
-- 1. staking_positions - one row per staker, updated on events
-- ============================================================
CREATE TABLE IF NOT EXISTS staking_positions (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Account hash of the staker (64 hex, no prefix).
    staker_address          TEXT        NOT NULL UNIQUE,
    -- Current staked amount (U256 as TEXT, minimal units, decimals=18).
    staked_amount           TEXT        NOT NULL DEFAULT '0',
    -- Amount currently in unbonding period (U256 as TEXT).
    unbonding_amount        TEXT        NOT NULL DEFAULT '0',
    -- Epoch ms when unbonding period ends (0 = no active unbonding).
    unbonding_ends_at       BIGINT      NOT NULL DEFAULT 0,
    -- Cumulative rewards claimed by this staker (U256 as TEXT).
    total_rewards_claimed   TEXT        NOT NULL DEFAULT '0',
    -- Row timestamps.
    last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staking_staker ON staking_positions (staker_address);

COMMENT ON TABLE  staking_positions                       IS 'Current staking state per account, upserted from staking contract events';
COMMENT ON COLUMN staking_positions.staker_address        IS 'Account hash (64 hex, no prefix)';
COMMENT ON COLUMN staking_positions.staked_amount         IS 'Active staked BIG tokens in minimal units (decimals=18)';
COMMENT ON COLUMN staking_positions.unbonding_amount      IS 'Tokens in unbonding cooldown period';
COMMENT ON COLUMN staking_positions.unbonding_ends_at     IS 'Epoch ms when unbonding completes (0 = none)';
COMMENT ON COLUMN staking_positions.total_rewards_claimed IS 'Cumulative claimed rewards, updated by RewardsClaimed events';

-- ============================================================
-- 2. staking_events - append-only log of staker actions
-- ============================================================
CREATE TABLE IF NOT EXISTS staking_events (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Account hash of the staker (64 hex, no prefix).
    staker_address    TEXT        NOT NULL,
    -- One of: 'stake', 'unstake', 'withdraw', 'reward_claim'.
    event_type        TEXT        NOT NULL,
    -- Token amount involved (U256 as TEXT, minimal units, decimals=18).
    amount            TEXT        NOT NULL,
    -- Deploy hash that emitted the event.
    transaction_hash  TEXT        NOT NULL,
    -- Block height where the event was included.
    block_height      BIGINT      NOT NULL,
    -- Block timestamp of the event.
    event_timestamp   TIMESTAMPTZ,
    -- Row timestamp.
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staking_events_staker    ON staking_events (staker_address);
CREATE INDEX idx_staking_events_type      ON staking_events (event_type);
CREATE INDEX idx_staking_events_timestamp ON staking_events (event_timestamp);

COMMENT ON TABLE  staking_events                  IS 'Append-only log of staking contract events per staker';
COMMENT ON COLUMN staking_events.event_type       IS 'Event kind: stake | unstake | withdraw | reward_claim';
COMMENT ON COLUMN staking_events.amount           IS 'BIG token amount in minimal units (decimals=18)';
COMMENT ON COLUMN staking_events.event_timestamp  IS 'Block timestamp (UTC) when the event occurred';

-- ============================================================
-- 3. staking_reward_deposits - treasury deposits into the pool
-- ============================================================
CREATE TABLE IF NOT EXISTS staking_reward_deposits (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Account hash of the caller who deposited rewards.
    caller_address    TEXT        NOT NULL,
    -- Deposited amount (U256 as TEXT, minimal units, decimals=18).
    amount            TEXT        NOT NULL,
    -- Deploy hash that emitted the RewardsDeposited event.
    transaction_hash  TEXT        NOT NULL UNIQUE,
    -- Block height where the event was included.
    block_height      BIGINT      NOT NULL,
    -- Block timestamp of the event.
    event_timestamp   TIMESTAMPTZ,
    -- Row timestamp.
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_deposits_timestamp ON staking_reward_deposits (event_timestamp);

COMMENT ON TABLE  staking_reward_deposits                  IS 'Treasury reward deposits into the staking pool via deposit_rewards()';
COMMENT ON COLUMN staking_reward_deposits.caller_address   IS 'Account hash of the depositor (usually treasury)';
COMMENT ON COLUMN staking_reward_deposits.amount           IS 'Deposited BIG tokens in minimal units (decimals=18)';
