-- ============================================================
-- Migration: metadata_uri on properties (off-chain metadata pointer)
-- Description: Additively add `metadata_uri` to `properties`. The backend
--   serializes a property's descriptive fields, pins the JSON via the
--   ContentPinner (IPFS) on create/update, and stores the resulting
--   `ipfs://{cid}` here. On-chain property registration reads this URI as
--   the contract's metadata argument, so off-chain and on-chain metadata
--   stay in lockstep. Nullable: rows created before this migration (and any
--   row whose pin has not run yet) carry NULL until re-pinned.
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS metadata_uri TEXT;

COMMENT ON COLUMN properties.metadata_uri IS 'Content-addressed pointer (ipfs://{cid}) to the pinned property metadata JSON; passed as the metadataUri argument during on-chain registration';
