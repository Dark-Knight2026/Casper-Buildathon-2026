-- Add transform_idx to staking_events for batch deploy deduplication.
--
-- A single Casper deploy can emit multiple staking events of the same type
-- (e.g. batch `stake_for`). Without transform_idx the second event is
-- silently dropped by ON CONFLICT (transaction_hash, event_type).

ALTER TABLE staking_events
    ADD COLUMN transform_idx INTEGER;

ALTER TABLE staking_events
    DROP CONSTRAINT IF EXISTS staking_events_tx_hash_event_type_key;

CREATE UNIQUE INDEX staking_events_tx_event_type_transform_key
    ON staking_events (transaction_hash, event_type, COALESCE(transform_idx, 0));
