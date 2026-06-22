-- ============================================================
-- Migration: Add registration_tx_hash to properties
-- Description: Casper deploy hash of the on-chain property registration call.
--   Set by the landlord after the transaction is submitted; write-once (a
--   second call is rejected with 409 once the column is non-null). Separate
--   from `onchain_property_id` (written by the indexer from `PropertyCreated`)
--   so either can arrive first.
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS registration_tx_hash TEXT;

COMMENT ON COLUMN properties.registration_tx_hash IS
  'Casper deploy hash of the PropertyRegistry.register_property call; set by the landlord after signing, null until confirmed';
