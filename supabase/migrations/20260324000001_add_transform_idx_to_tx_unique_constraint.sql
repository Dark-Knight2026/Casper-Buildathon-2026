-- Expand the UNIQUE constraint on blockchain_transactions to include transform_idx.
--
-- The previous constraint (transaction_hash, transaction_type, from_address)
-- silently drops the second row when a single deploy emits two events of the
-- same type from the same sender (e.g. two Transfer events to different
-- recipients within one deploy). transform_idx distinguishes intra-deploy
-- events but was not part of the constraint.
--
-- Because transform_idx is NULLable (older backfill rows lack it) and
-- PostgreSQL treats NULLs as distinct in UNIQUE constraints, we use
-- COALESCE(transform_idx, -1) so that NULL maps to a sentinel that
-- cannot appear as a real Casper transform index (0 is valid).

-- Drop the old named constraint.
ALTER TABLE blockchain_transactions
    DROP CONSTRAINT IF EXISTS blockchain_transactions_tx_hash_type_from_key;

-- Create an expression-based unique index (required for COALESCE).
CREATE UNIQUE INDEX IF NOT EXISTS blockchain_transactions_tx_type_from_tidx_key
    ON blockchain_transactions (
        transaction_hash,
        transaction_type,
        from_address,
        COALESCE(transform_idx, -1)
    );
