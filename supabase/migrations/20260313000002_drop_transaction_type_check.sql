-- Replace the original transaction_type CHECK constraint with an updated one
-- that includes all current event types (adds 'ico_schedule_added').

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

-- Re-add with the full set of known transaction types.
ALTER TABLE blockchain_transactions
    ADD CONSTRAINT blockchain_transactions_transaction_type_check
    CHECK (transaction_type IN (
        'token_transfer',
        'token_mint',
        'token_allowance',
        'token_purchase',
        'ico_schedule_added'
    ));
