-- Add columns to blockchain_transactions required by the API layer.
--
-- These fields are needed by the transaction history endpoints
-- (per-account and per-token) and were previously either missing
-- entirely or stored incorrectly (confirmed_at = processing time,
-- not block timestamp).
--
-- All columns are nullable because existing rows will remain NULL
-- until the next full re-index populates them.

ALTER TABLE blockchain_transactions
    ADD COLUMN IF NOT EXISTS contract_hash   TEXT,
    ADD COLUMN IF NOT EXISTS block_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS from_type       SMALLINT,
    ADD COLUMN IF NOT EXISTS to_type         SMALLINT,
    ADD COLUMN IF NOT EXISTS transform_idx   INTEGER;

COMMENT ON COLUMN blockchain_transactions.contract_hash   IS 'Contract package hash that produced this transaction';
COMMENT ON COLUMN blockchain_transactions.block_timestamp IS 'Block timestamp (NOT processing time). Streaming: ISO 8601, backfill ICO: epoch via TO_TIMESTAMP()';
COMMENT ON COLUMN blockchain_transactions.from_type       IS 'Address type of from_address: 0 = Account, 1 = Contract';
COMMENT ON COLUMN blockchain_transactions.to_type         IS 'Address type of to_address: 0 = Account, 1 = Contract';
COMMENT ON COLUMN blockchain_transactions.transform_idx   IS 'Transform index within the deploy. NULL for CEP-18 backfill (unavailable)';
