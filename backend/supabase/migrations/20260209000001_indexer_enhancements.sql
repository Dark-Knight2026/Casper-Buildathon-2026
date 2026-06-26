-- ============================================================
-- Migration: Indexer Enhancements
-- Description: Adds tables and constraints required by the
--              Casper event indexer (contract registry,
--              ICO purchases, indexer status, extended
--              transaction types).
-- Created: 2026-02-09
-- ============================================================

-- --------------------------------------------
-- Contract registry
-- --------------------------------------------
-- Stores metadata about every deployed contract the indexer tracks.
-- Populated once at deploy time and queried at indexer startup.

CREATE TABLE IF NOT EXISTS contract_registry (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_type TEXT        NOT NULL UNIQUE,   -- 'ico', 'treasury', 'lease', etc.
    contract_hash TEXT        NOT NULL UNIQUE,   -- package hash (hex, no 'hash-' prefix)
    contract_name TEXT        NOT NULL,          -- human-readable label
    network       TEXT        NOT NULL DEFAULT 'testnet',
    is_active     BOOLEAN              DEFAULT TRUE,
    deployed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ          DEFAULT NOW()
);

COMMENT ON TABLE contract_registry IS 'Registry of deployed smart contracts tracked by the indexer';

-- --------------------------------------------
-- ICO purchases
-- --------------------------------------------
-- One row per TokensPurchased event.  Provides a queryable view of
-- ICO activity separate from the generic blockchain_transactions table.

CREATE TABLE IF NOT EXISTS ico_purchases (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash TEXT   NOT NULL UNIQUE,
    block_height     BIGINT NOT NULL,
    buyer_address    TEXT   NOT NULL,
    amount           TEXT   NOT NULL,   -- U256 as text (too large for DECIMAL)
    currency         TEXT   NOT NULL,   -- 'CSPR', 'USDC', 'USDT'
    price            TEXT   NOT NULL,   -- token price at purchase time
    cost             TEXT   NOT NULL,   -- total cost paid
    ico_schedule_id  TEXT,              -- which ICO round
    event_timestamp  BIGINT NOT NULL,   -- block timestamp (epoch seconds)
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ico_purchases_buyer     ON ico_purchases(buyer_address);
CREATE INDEX idx_ico_purchases_currency  ON ico_purchases(currency);
CREATE INDEX idx_ico_purchases_timestamp ON ico_purchases(event_timestamp DESC);

COMMENT ON TABLE ico_purchases IS 'Detailed log of ICO token purchases extracted from TokensPurchased events';

-- --------------------------------------------
-- Extend transaction_type check constraint
-- --------------------------------------------
-- Add new types needed by the indexer for Lease, NFT, Treasury,
-- and Roles events.

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
            -- new types for indexer
            'lease_finalize', 'lease_prolong',
            'security_deposit_payment',
            'token_transfer',
            'rewards_deposit',
            'nft_mint', 'nft_burn', 'nft_transfer',
            'reserves_withdrawal', 'token_withdrawal',
            'role_grant', 'role_revoke'
        ));

-- --------------------------------------------
-- Indexer status
-- --------------------------------------------
-- Health and heartbeat tracking for the indexer process.
-- One row per indexer mode (streaming / backfill).

CREATE TABLE IF NOT EXISTS indexer_status (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indexer_type     TEXT        NOT NULL UNIQUE,            -- 'streaming', 'backfill'
    status           TEXT        NOT NULL DEFAULT 'stopped', -- 'running', 'stopped', 'error'
    last_heartbeat   TIMESTAMPTZ,
    last_error       TEXT,
    events_processed BIGINT               DEFAULT 0,
    started_at       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ          DEFAULT NOW()
);

COMMENT ON TABLE indexer_status IS 'Tracks indexer health, heartbeat and event processing metrics';

-- --------------------------------------------
-- RLS policies
-- --------------------------------------------

ALTER TABLE contract_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ico_purchases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexer_status    ENABLE ROW LEVEL SECURITY;

-- Contract registry is public read
CREATE POLICY "Public can view contract registry" ON contract_registry
    FOR SELECT USING (true);

-- ICO purchases visible to the buyer
CREATE POLICY "Users can view own ICO purchases" ON ico_purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Indexer status is public read (monitoring dashboards)
CREATE POLICY "Public can view indexer status" ON indexer_status
    FOR SELECT USING (true);
