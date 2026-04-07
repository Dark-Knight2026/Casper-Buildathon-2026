-- Add transform_idx to staking_reward_deposits so that batch deploys emitting
-- multiple RewardsDeposited events (distinct execution transforms) are each
-- recorded.  Mirrors the pattern applied to staking_events in 20260330000001.

-- Step 1: Add column.
ALTER TABLE staking_reward_deposits
    ADD COLUMN IF NOT EXISTS transform_idx INTEGER;

COMMENT ON COLUMN staking_reward_deposits.transform_idx
    IS 'Transform index within the deploy. NULL for streaming events.';

-- Step 2: Drop the old single-column unique constraint.
-- The auto-generated name for UNIQUE(transaction_hash) is:
ALTER TABLE staking_reward_deposits
    DROP CONSTRAINT IF EXISTS staking_reward_deposits_transaction_hash_key;

-- Step 3: Create expression-based unique index with transform_idx.
CREATE UNIQUE INDEX IF NOT EXISTS uix_staking_reward_deposits_tx_tidx
    ON staking_reward_deposits (
        transaction_hash,
        COALESCE(transform_idx, 0)
    );
