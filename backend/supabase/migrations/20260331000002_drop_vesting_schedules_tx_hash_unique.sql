-- Drop the UNIQUE constraint on transaction_hash.
--
-- A single deploy can emit multiple ScheduleCreated events with different
-- vesting_id values but the same deploy hash.  The UNIQUE constraint causes
-- the second INSERT to fail with a constraint violation that is not covered
-- by the ON CONFLICT (vesting_id) clause in the upsert query.
--
-- Idempotency is already provided by ON CONFLICT (vesting_id).
-- A plain B-tree index is kept for deploy-hash lookups.

ALTER TABLE vesting_schedules
    DROP CONSTRAINT IF EXISTS vesting_schedules_transaction_hash_key;

CREATE INDEX IF NOT EXISTS idx_vesting_tx_hash
    ON vesting_schedules (transaction_hash);
