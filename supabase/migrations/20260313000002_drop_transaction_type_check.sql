-- Remove the transaction_type CHECK constraint entirely.
-- Valid transaction types are enforced at the application level (Rust handlers),
-- so the DB-level constraint only adds migration overhead for each new event type.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'blockchain_transactions_transaction_type_check'
    ) THEN
        ALTER TABLE blockchain_transactions
            DROP CONSTRAINT blockchain_transactions_transaction_type_check;
    END IF;
END
$$;
