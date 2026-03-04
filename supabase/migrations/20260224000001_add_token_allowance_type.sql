-- Add 'token_allowance' to the blockchain_transactions transaction_type constraint.
-- CEP-18 SetAllowance / IncreaseAllowance / DecreaseAllowance events are stored
-- here so that approvals are queryable alongside other on-chain activity.

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

ALTER TABLE blockchain_transactions
    ADD CONSTRAINT blockchain_transactions_transaction_type_check
        CHECK (transaction_type IN (
            -- original types
            'property_mint', 'property_transfer',
            'fractional_mint', 'fractional_transfer',
            'lease_create', 'rent_payment',
            'deposit_escrow', 'deposit_release',
            'token_purchase', 'dividend_distribution',
            'name_registration',
            -- indexer types (added in 20260209000001)
            'lease_finalize', 'lease_prolong',
            'security_deposit_payment',
            'token_transfer',
            'rewards_deposit',
            'nft_mint', 'nft_burn', 'nft_transfer',
            'reserves_withdrawal', 'token_withdrawal',
            'role_grant', 'role_revoke',
            -- CEP-18 allowance types (added here)
            'token_allowance'
        ));
