-- Fix: drop the old 3-column unique constraint on blockchain_events that was
-- NOT removed by 20260325000001.
--
-- PostgreSQL auto-generates constraint names by truncating to 63 characters.
-- The original UNIQUE(transaction_hash, event_type, contract_address) produced
-- "blockchain_events_transaction_hash_event_type_contract_addr_key" (63 chars),
-- but the DROP in 20260325000001 targeted the un-truncated name
-- "blockchain_events_transaction_hash_event_type_contract_address_key" (66 chars)
-- which did not match.  The old constraint survived, blocking batch deploys
-- that emit multiple events of the same type from the same contract.

ALTER TABLE blockchain_events
    DROP CONSTRAINT IF EXISTS blockchain_events_transaction_hash_event_type_contract_addr_key;
