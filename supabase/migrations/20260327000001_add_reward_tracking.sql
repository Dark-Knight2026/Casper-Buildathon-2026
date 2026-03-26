-- Add reward tracking for off-chain pending rewards calculation.
--
-- The staking contract emits:
--   - reward_per_token_stored in RewardsDeposited events (global accumulator)
--   - StakerSnapshot with per-user pending_rewards & reward_per_token_paid
--
-- Backend formula:
--   pending_rewards + (staked_amount * (reward_per_token_stored - reward_per_token_paid)) / 1e18

-- 1. Singleton table for the latest global reward_per_token_stored.
CREATE TABLE IF NOT EXISTS staking_reward_state (
    id                      INTEGER     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    reward_per_token_stored TEXT        NOT NULL DEFAULT '0',
    last_updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO staking_reward_state (id) VALUES (1) ON CONFLICT DO NOTHING;

COMMENT ON TABLE  staking_reward_state IS 'Singleton: latest global reward_per_token_stored from deposit_rewards events';
COMMENT ON COLUMN staking_reward_state.reward_per_token_stored IS 'U256 as TEXT, precision 1e18';

ALTER TABLE staking_reward_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read-only" ON staking_reward_state FOR SELECT USING (true);

-- 2. Add reward_per_token_stored snapshot to each reward deposit record.
ALTER TABLE staking_reward_deposits
    ADD COLUMN reward_per_token_stored TEXT NOT NULL DEFAULT '0';

COMMENT ON COLUMN staking_reward_deposits.reward_per_token_stored IS 'Global reward_per_token_stored at time of deposit (U256 as TEXT)';

-- 3. Add per-user reward tracking columns to staking_positions.
ALTER TABLE staking_positions
    ADD COLUMN pending_rewards       TEXT NOT NULL DEFAULT '0',
    ADD COLUMN reward_per_token_paid TEXT NOT NULL DEFAULT '0';

COMMENT ON COLUMN staking_positions.pending_rewards IS 'Last-known pending rewards from StakerSnapshot (U256 as TEXT)';
COMMENT ON COLUMN staking_positions.reward_per_token_paid IS 'Last-known reward_per_token_paid from StakerSnapshot (U256 as TEXT)';
