-- Add indexes for the transaction history API queries.
--
-- The per-account endpoint filters by `from_address = $1 OR to_address = $1`,
-- which requires separate B-tree indexes so PostgreSQL can use BitmapOr.
-- The per-token endpoint filters by `contract_hash = $1`.
--
-- Without these indexes both queries degrade to sequential scans as the
-- table grows beyond a few thousand rows.

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_from_address
    ON blockchain_transactions (from_address);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_to_address
    ON blockchain_transactions (to_address);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_contract_hash
    ON blockchain_transactions (contract_hash);
