-- ============================================================
-- Migration: Add agreement columns to leases (off-chain terms + consent + on-chain binding)
-- Description: Additive extension of the canonical `leases` table for the
--   lease-agreement flow (see kinder/20 reference). Off-chain: clauses,
--   currency, property-manager rent split, lease-to-own equity link. Consent:
--   Casper-message signatures of both parties + a UI signature-progress object
--   (off-chain proof, see reference §6). On-chain binding (filled once at
--   /commit): the U256 agreement id, the frozen lease NFT token id, and the
--   commit tx hash. No drops, no renames; `documentLinks` reuses the existing
--   `lease_document_url`/`signed_document_url`. The existing `status` CHECK
--   already covers `pending_signatures`/`expiring_soon`/`renewed`.
-- Created: 2026-06-16
-- ============================================================

-- Off-chain terms
ALTER TABLE IF EXISTS leases
  ADD COLUMN IF NOT EXISTS clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS property_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_manager_bps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equity_property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Consent (off-chain proof, reference §6): structured signature progress + the
-- Casper-message signatures themselves (per-party signature, signedAt, wallet).
ALTER TABLE IF EXISTS leases
  ADD COLUMN IF NOT EXISTS signature_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consent_signatures JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Document binding (Phase 0 stubs: hash computed on render, CID left null
-- until real IPFS pinning arrives).
ALTER TABLE IF EXISTS leases
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS ipfs_cid TEXT;

-- On-chain binding, recorded at /commit after a successful create_lease_agreement.
-- `onchain_lease_id` is the U256 agreement id from the LeaseAgreementCreated
-- event - distinct from the already-present `smart_contract_address` (the Lease
-- contract's address). `nft_token_id` is the tenant's frozen lease NFT.
ALTER TABLE IF EXISTS leases
  ADD COLUMN IF NOT EXISTS onchain_lease_id NUMERIC,
  ADD COLUMN IF NOT EXISTS nft_token_id TEXT,
  ADD COLUMN IF NOT EXISTS commit_tx_hash TEXT;

-- Constraints
ALTER TABLE IF EXISTS leases
  DROP CONSTRAINT IF EXISTS lease_currency_allowed;
ALTER TABLE IF EXISTS leases
  ADD CONSTRAINT lease_currency_allowed CHECK (currency IS NULL OR currency IN ('cUSD', 'CSPR', 'USD', 'USDT', 'USDC'));

-- Manager rent split: bps in [0, 10000]; must be 0 when there is no manager.
ALTER TABLE IF EXISTS leases
  DROP CONSTRAINT IF EXISTS lease_manager_bps_consistency;
ALTER TABLE IF EXISTS leases
  ADD CONSTRAINT lease_manager_bps_consistency CHECK (
    property_manager_bps BETWEEN 0 AND 10000
    AND (property_manager_id IS NOT NULL OR property_manager_bps = 0)
  );

-- Indexes
-- Reconciliation lookup by the on-chain agreement id (indexer + /commit). Not
-- UNIQUE: a U256 id is only unique within one Lease contract address.
CREATE INDEX IF NOT EXISTS idx_leases_onchain_lease_id
  ON leases(onchain_lease_id) WHERE onchain_lease_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_property_manager_id
  ON leases(property_manager_id) WHERE property_manager_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_equity_property_id
  ON leases(equity_property_id) WHERE equity_property_id IS NOT NULL AND deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN leases.clauses IS 'Array of agreement clauses ({title, content, category})';
COMMENT ON COLUMN leases.currency IS 'Off-chain settlement currency: cUSD, CSPR, USDT, USDC, or USD (legacy)';
COMMENT ON COLUMN leases.property_manager_id IS 'Optional property manager receiving a share of rent (rent_distribution_terms)';
COMMENT ON COLUMN leases.property_manager_bps IS 'Manager rent share in basis points (10000 = 100%); 0 when no manager';
COMMENT ON COLUMN leases.equity_property_id IS 'Lease-to-own equity-eligible property; null if none';
COMMENT ON COLUMN leases.signature_progress IS 'UI signature-progress object: per-party signed flag + timestamp';
COMMENT ON COLUMN leases.consent_signatures IS 'Off-chain Casper-message consent: per-party {signature, signedAt, signerWallet}';
COMMENT ON COLUMN leases.document_hash IS 'SHA-256 of the rendered lease document; null until generated';
COMMENT ON COLUMN leases.ipfs_cid IS 'IPFS CID of the lease document; Phase 0 stub, null until real pinning';
COMMENT ON COLUMN leases.onchain_lease_id IS 'U256 agreement id from LeaseAgreementCreated; distinct from smart_contract_address';
COMMENT ON COLUMN leases.nft_token_id IS 'Tenant frozen lease NFT token id, recorded at /commit';
COMMENT ON COLUMN leases.commit_tx_hash IS 'Deploy/tx hash of the create_lease_agreement call recorded at /commit';
