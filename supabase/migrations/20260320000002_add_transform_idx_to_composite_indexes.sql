-- Extend composite indexes with transform_idx so PostgreSQL can satisfy
-- the full ORDER BY (block_number DESC, transform_idx DESC, confirmed_at DESC)
-- from a single index scan.
--
-- transform_idx records the position of a transform within a deploy,
-- giving correct intra-block ordering based on blockchain event sequence
-- rather than DB processing time (confirmed_at).

DROP INDEX IF EXISTS idx_blockchain_tx_from_address;
DROP INDEX IF EXISTS idx_blockchain_tx_to_address;
DROP INDEX IF EXISTS idx_blockchain_tx_contract_hash;

CREATE INDEX idx_blockchain_tx_from_address
    ON blockchain_transactions (from_address, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);

CREATE INDEX idx_blockchain_tx_to_address
    ON blockchain_transactions (to_address, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);

CREATE INDEX idx_blockchain_tx_contract_hash
    ON blockchain_transactions (contract_hash, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);
