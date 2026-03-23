-- Expand the transaction_type CHECK constraint to include staking and vesting types
-- added by the feat/vesting-staking branch.

ALTER TABLE blockchain_transactions
    DROP CONSTRAINT IF EXISTS blockchain_transactions_transaction_type_check;

ALTER TABLE blockchain_transactions
    ADD CONSTRAINT blockchain_transactions_transaction_type_check
    CHECK (transaction_type IN (
        'token_transfer',
        'token_mint',
        'token_allowance',
        'token_purchase',
        'ico_schedule_added',
        'token_stake',
        'token_unstake',
        'token_withdraw',
        'rewards_claim',
        'rewards_deposit',
        'vesting_schedule_created',
        'vesting_tokens_claimed'
    ));
