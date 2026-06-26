-- Optimize staking table indexes:
-- 1. Drop idx_staking_staker — redundant with UNIQUE constraint on staker_address.
-- 2. Replace single-column indexes on staking_events with a composite index
--    for the hot query path: WHERE staker_address = $1 AND event_type = 'reward_claim'.

DROP INDEX IF EXISTS idx_staking_staker;
DROP INDEX IF EXISTS idx_staking_events_staker;
DROP INDEX IF EXISTS idx_staking_events_type;

CREATE INDEX idx_staking_events_staker_type ON staking_events (staker_address, event_type);
