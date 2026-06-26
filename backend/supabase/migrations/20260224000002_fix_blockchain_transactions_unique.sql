-- Allow multiple transaction types per deploy in blockchain_transactions.
--
-- One on-chain deploy can produce several logical events simultaneously:
--   - ICO purchase deploy -> token_transfer (USDC/USDT payment, from CEP-18 backfill)
--                         -> token_purchase (BIG buy, from ICO backfill)
--
-- The previous UNIQUE on transaction_hash allowed only one row per deploy,
-- causing the ICO token_purchase insert to be silently dropped.
--
-- Fix: replace the two column-level UNIQUE constraints with a single
-- composite UNIQUE (transaction_hash, transaction_type).

ALTER TABLE blockchain_transactions
    DROP CONSTRAINT IF EXISTS blockchain_transactions_transaction_hash_key;

ALTER TABLE blockchain_transactions
    DROP CONSTRAINT IF EXISTS blockchain_transactions_deploy_hash_key;

ALTER TABLE blockchain_transactions
    ADD CONSTRAINT blockchain_transactions_tx_hash_type_key
        UNIQUE (transaction_hash, transaction_type);
