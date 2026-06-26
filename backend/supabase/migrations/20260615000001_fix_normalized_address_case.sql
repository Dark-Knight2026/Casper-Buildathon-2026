-- ============================================================
-- Migration: fix case-folding in the address normalization (dedup bug)
-- Description: Both the dedup fingerprint (trigger function, migration
--   20260109000001) and the materialized `normalized_address` column
--   (migration 20260612000002) ran `LOWER(REGEXP_REPLACE(text, '[^a-z0-9]',
--   ''))`. Because the regex class is lowercase-only and runs BEFORE the outer
--   LOWER(), uppercase letters were STRIPPED instead of folded:
--   "100 MAIN ST" -> "100" while "100 Main St" -> "100ainst". Two spellings of
--   the same address therefore produced different fingerprints, so the dedup
--   `ON CONFLICT (fingerprint)` upsert let case-variant duplicates through.
--
--   Fix: lowercase BEFORE stripping - `REGEXP_REPLACE(LOWER(text), '[^a-z0-9]',
--   '')` - so "100 MAIN ST" and "100 Main St" both normalize to "100mainst".
--
--   Existing rows keep their previously-computed `fingerprint` (a backfill
--   would risk colliding case-variant rows onto one fingerprint and is left as
--   a separate data task); the regenerated `normalized_address` column is
--   recomputed for all rows on the column rebuild below.
-- ============================================================

-- Trigger function: drives the dedup `fingerprint`. The address, unit, and
-- parcel parts each lowercase before the alphanumeric strip now.
CREATE OR REPLACE FUNCTION generate_property_fingerprint()
RETURNS TRIGGER AS $$
DECLARE
  normalized_address TEXT;
  geo_lat TEXT;
  geo_lng TEXT;
  unit_val TEXT;
  lot_val TEXT;
  area_val TEXT;
  parcel_val TEXT;
  raw_string TEXT;
BEGIN
  -- Normalize Address (street + city + state + zip)
  normalized_address := REGEXP_REPLACE(LOWER(
    COALESCE(NEW.address_line1, '') ||
    COALESCE(NEW.city, '') ||
    COALESCE(NEW.state, '') ||
    COALESCE(NEW.zip_code, '')
  ), '[^a-z0-9]', '', 'g');

  -- Geocode
  geo_lat := COALESCE(ROUND(CAST(NEW.latitude AS NUMERIC), 4)::TEXT, '');
  geo_lng := COALESCE(ROUND(CAST(NEW.longitude AS NUMERIC), 4)::TEXT, '');

  -- Unit (normalize) - Using address_line2 as unit if needed, or skip
  unit_val := REGEXP_REPLACE(LOWER(COALESCE(NEW.address_line2, '')), '[^a-z0-9]', '', 'g');

  -- Lot Size & Living Area
  lot_val := COALESCE(NEW.lot_size::TEXT, '');
  area_val := COALESCE(NEW.square_feet::TEXT, '');

  -- Parcel ID
  parcel_val := REGEXP_REPLACE(LOWER(COALESCE(NEW.parcel_id, '')), '[^a-z0-9]', '', 'g');

  -- Concatenate all parts with pipe separator
  raw_string := normalized_address || '|' || geo_lat || '|' || geo_lng || '|' || unit_val || '|' || lot_val || '|' || area_val || '|' || parcel_val;

  -- Generate SHA-256 hash
  NEW.fingerprint := encode(digest(raw_string, 'sha256'), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Materialized `normalized_address`: a generated column's expression cannot be
-- altered in place, so drop and re-add it (the value is derived, so no source
-- data is lost; all rows recompute on rebuild). The dependent index is dropped
-- with the column and recreated afterwards.
DROP INDEX IF EXISTS idx_properties_normalized_address;

ALTER TABLE properties DROP COLUMN IF EXISTS normalized_address;

ALTER TABLE properties
  ADD COLUMN normalized_address TEXT
    GENERATED ALWAYS AS (
      -- Keep this expression in sync with generate_property_fingerprint():
      -- lowercase first, then strip to alphanumerics.
      REGEXP_REPLACE(LOWER(
        COALESCE(address_line1, '') ||
        COALESCE(city, '') ||
        COALESCE(state, '') ||
        COALESCE(zip_code, '')
      ), '[^a-z0-9]', '', 'g')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_normalized_address
  ON properties(normalized_address) WHERE deleted_at IS NULL;

COMMENT ON COLUMN properties.normalized_address IS 'Lowercased, alphanumeric-only address key; mirrors the normalization used for the dedup fingerprint';
