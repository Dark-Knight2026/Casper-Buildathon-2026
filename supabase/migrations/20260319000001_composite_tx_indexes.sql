-- Replace single-column indexes with composite indexes that include
-- block_number DESC for index-ordered pagination.
--
-- API endpoints order by `block_number DESC NULLS LAST`, so composite
-- indexes allow PostgreSQL to satisfy both the WHERE filter and ORDER BY
-- in a single index scan instead of filtering + separate sort.

DROP INDEX IF EXISTS idx_blockchain_tx_from_address;
DROP INDEX IF EXISTS idx_blockchain_tx_to_address;
DROP INDEX IF EXISTS idx_blockchain_tx_contract_hash;

CREATE INDEX idx_blockchain_tx_from_address
    ON blockchain_transactions (from_address, block_number DESC NULLS LAST);

CREATE INDEX idx_blockchain_tx_to_address
    ON blockchain_transactions (to_address, block_number DESC NULLS LAST);

CREATE INDEX idx_blockchain_tx_contract_hash
    ON blockchain_transactions (contract_hash, block_number DESC NULLS LAST);
