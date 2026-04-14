-- Add composite indexes for the transaction history API queries.
--
-- The per-account endpoint filters by `from_address = $1 OR to_address = $1`
-- and orders by `block_number DESC, transform_idx DESC`, which requires
-- separate composite B-tree indexes so PostgreSQL can use BitmapOr with
-- index-ordered pagination (no separate sort step).
-- The per-token endpoint filters by `contract_hash = $1` with the same
-- ordering.
--
-- `transform_idx` records the position of a transform within a deploy,
-- giving correct intra-block ordering based on blockchain event sequence.
--
-- Without these indexes both queries degrade to sequential scans as the
-- table grows beyond a few thousand rows.

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_from_address
    ON blockchain_transactions (from_address, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_to_address
    ON blockchain_transactions (to_address, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_contract_hash
    ON blockchain_transactions (contract_hash, block_number DESC NULLS LAST, transform_idx DESC NULLS LAST);
