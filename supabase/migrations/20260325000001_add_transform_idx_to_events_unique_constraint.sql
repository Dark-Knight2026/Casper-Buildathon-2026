-- Expand the UNIQUE constraint on blockchain_events to include transform_idx.
--
-- A single deploy can emit multiple events of the same type from the same
-- contract (e.g. two Transfer events). Without transform_idx the second
-- event is silently dropped by DO NOTHING.
--
-- Because transform_idx is NULLable (streaming events lack it) and
-- NULL != NULL in SQL, we use an expression-based unique index with
-- COALESCE(transform_idx, 0) so that NULL and 0 share the same slot.

-- Step 1: Add the column.
ALTER TABLE blockchain_events
    ADD COLUMN IF NOT EXISTS transform_idx INTEGER;

COMMENT ON COLUMN blockchain_events.transform_idx
    IS 'Transform index within the deploy. NULL for streaming events (unavailable).';

-- Step 2: Drop the old 3-column constraint.
ALTER TABLE blockchain_events
    DROP CONSTRAINT IF EXISTS blockchain_events_transaction_hash_event_type_contract_address_key;

-- Step 3: Create the new expression-based unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uix_blockchain_events_tx_event_contract_tidx
    ON blockchain_events (
        transaction_hash,
        event_type,
        contract_address,
        COALESCE(transform_idx, 0)
    );
