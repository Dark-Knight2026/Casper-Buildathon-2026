-- ============================================================
-- Migration: RESO physical-asset columns on properties (ADR-007 D1)
-- Description: Additively extend `properties` (the physical asset in the
--   two-entity split) with the RESO-aligned fields the listing domain
--   needs. No drops, no renames: the 2023 columns (state, zip_code,
--   bedrooms, bathrooms, square_feet, year_built, parking_spaces) stay as
--   the single source of truth; the RESO names (stateOrProvince,
--   postalCode, bedroomsTotal, ...) are surfaced as serde aliases in the
--   Rust models, not duplicated here.
-- ============================================================

-- Only the fields that physically do not exist yet:
--   normalized_address - materialized dedup/display key (was computed
--     inline inside generate_property_fingerprint() and thrown away).
--   parking_features    - RESO list, richer than the flat parking_spaces.
--   geog                - PostGIS geography point, derived from the
--     existing lat/lng so it can never drift out of sync.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS normalized_address TEXT
    GENERATED ALWAYS AS (
      -- Keep this expression in sync with generate_property_fingerprint()
      -- (migration 20260109000001): same normalization feeds the dedup hash.
      LOWER(REGEXP_REPLACE(
        COALESCE(address_line1, '') ||
        COALESCE(city, '') ||
        COALESCE(state, '') ||
        COALESCE(zip_code, ''),
        '[^a-z0-9]', '', 'g'
      ))
    ) STORED,
  ADD COLUMN IF NOT EXISTS parking_features TEXT[],
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(
        ST_MakePoint(longitude::double precision, latitude::double precision),
        4326
      )::geography
    ) STORED;

-- GIST index for radius / bounding-box search over the materialized point.
CREATE INDEX IF NOT EXISTS idx_properties_geog ON properties USING gist (geog);

-- Index the dedup key so POST /properties can probe by normalized address.
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address
  ON properties(normalized_address) WHERE deleted_at IS NULL;

COMMENT ON COLUMN properties.normalized_address IS 'Lowercased, alphanumeric-only address key; mirrors the normalization used for the dedup fingerprint';
COMMENT ON COLUMN properties.parking_features IS 'RESO ParkingFeatures list; supersedes the flat parking_spaces count for display';
COMMENT ON COLUMN properties.geog IS 'PostGIS geography(Point,4326) derived from latitude/longitude for geo search';
