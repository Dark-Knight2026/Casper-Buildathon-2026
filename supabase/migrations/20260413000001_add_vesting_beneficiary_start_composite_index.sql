-- Replace single-column beneficiary index with a composite index that covers
-- both the equality filter (beneficiary = $1) and the sort (ORDER BY start_timestamp)
-- used by vesting schedule queries. This eliminates the filesort on start_timestamp.

DROP INDEX IF EXISTS idx_vesting_beneficiary;

CREATE INDEX idx_vesting_beneficiary_start
    ON vesting_schedules (beneficiary, start_timestamp);
