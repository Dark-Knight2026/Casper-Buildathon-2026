-- Expand the UNIQUE constraint on blockchain_transactions to include from_address.
--
-- The previous constraint (transaction_hash, transaction_type) silently dropped
-- the second row when one deploy emitted two events of the same type — for example,
-- an ICO purchase deploy produces both a USDC Transfer (buyer → ICO, token_transfer)
-- and a BIG Transfer (ICO → buyer, token_transfer). Both share the same tx hash and
-- type, so only the first survived.
--
-- Adding from_address makes each row unique per (deploy, type, sender), which
-- correctly distinguishes the two transfers above.

ALTER TABLE blockchain_transactions
    DROP CONSTRAINT IF EXISTS blockchain_transactions_tx_hash_type_key;

ALTER TABLE blockchain_transactions
    ADD CONSTRAINT blockchain_transactions_tx_hash_type_from_key
        UNIQUE (transaction_hash, transaction_type, from_address);
