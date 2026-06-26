-- Enforce that each pinned metadata URI maps to exactly one property.
--
-- The indexer reconciles on-chain `PropertyCreated` events with backend rows by
-- matching on `metadata_uri` (the IPFS CID). Without uniqueness, a single
-- blockchain event could tokenize more than one row sharing the same CID,
-- inflating the tokenized set. NULLs are exempt (Postgres treats them as
-- distinct), so unpinned drafts are unaffected.
ALTER TABLE properties
    ADD CONSTRAINT properties_metadata_uri_key UNIQUE (metadata_uri);
