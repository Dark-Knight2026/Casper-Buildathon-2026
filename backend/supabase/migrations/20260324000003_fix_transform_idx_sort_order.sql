-- Fix transform_idx sort direction in composite indexes.
--
-- Transactions within the same block should appear in chronological order
-- (ASC by transform_idx), not reverse. This matches the updated API queries
-- which use ORDER BY block_number DESC, transform_idx ASC.

DROP INDEX IF EXISTS idx_blockchain_tx_from_address;
DROP INDEX IF EXISTS idx_blockchain_tx_to_address;
DROP INDEX IF EXISTS idx_blockchain_tx_contract_hash;

CREATE INDEX idx_blockchain_tx_from_address
    ON blockchain_transactions (from_address, block_number DESC NULLS LAST, transform_idx ASC NULLS LAST);

CREATE INDEX idx_blockchain_tx_to_address
    ON blockchain_transactions (to_address, block_number DESC NULLS LAST, transform_idx ASC NULLS LAST);

CREATE INDEX idx_blockchain_tx_contract_hash
    ON blockchain_transactions (contract_hash, block_number DESC NULLS LAST, transform_idx ASC NULLS LAST);
