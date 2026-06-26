-- Extend staking_events composite index with event_timestamp so that
-- time-bounded queries (fetch_monthly_earnings, fetch_daily_cumulative,
-- fetch_unbonding_events) can use an index range scan instead of filtering
-- all rows matching (staker_address, event_type).

DROP INDEX IF EXISTS idx_staking_events_staker_type;

CREATE INDEX idx_staking_events_staker_type
    ON staking_events (staker_address, event_type, event_timestamp);
