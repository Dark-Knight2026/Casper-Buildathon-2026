-- Fix staking_events UNIQUE constraint to allow multiple event types per deploy.
--
-- A single Casper deploy can emit both a "stake" and a "reward_claim" event.
-- The previous UNIQUE(transaction_hash) silently discarded the second event.
-- Replace with UNIQUE(transaction_hash, event_type) so both are recorded.

ALTER TABLE staking_events
    DROP CONSTRAINT IF EXISTS staking_events_transaction_hash_key;

ALTER TABLE staking_events
    ADD CONSTRAINT staking_events_tx_hash_event_type_key
        UNIQUE (transaction_hash, event_type);
