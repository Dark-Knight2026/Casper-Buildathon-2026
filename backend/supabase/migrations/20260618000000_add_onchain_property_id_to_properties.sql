-- On-chain registration id for a property: the property's id in the
-- PropertyRegistry contract. Written by the indexer when it observes a
-- PropertyCreated event, matched to the backend row by metadata_uri.
--
-- Permanent schema, mirroring users.onchain_user_id: the contract assigns the
-- id incrementally and the indexer is how the backend learns it, regardless of
-- who calls PropertyRegistry::create_property (the frontend today, a backend
-- writer later). Exposed in the property API response so the frontend can read
-- the on-chain id after registration.
--
-- NUMERIC, not BIGINT, because the on-chain id is a U256 and can exceed i64.
-- Nullable until the indexer observes the event; UNIQUE so two backend
-- properties can never map to the same on-chain record (a UNIQUE constraint
-- permits many NULLs in Postgres, so untokenized properties do not collide).

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS onchain_property_id NUMERIC;

ALTER TABLE properties
    DROP CONSTRAINT IF EXISTS properties_onchain_property_id_key;

ALTER TABLE properties
    ADD CONSTRAINT properties_onchain_property_id_key UNIQUE (onchain_property_id);

COMMENT ON COLUMN properties.onchain_property_id IS
    'Contract-assigned PropertyRegistry id (U256), written by the indexer from the PropertyCreated event; NULL until observed on-chain.';
