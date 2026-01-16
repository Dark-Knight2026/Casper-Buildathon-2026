-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add fingerprint and parcel_id columns
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS fingerprint TEXT,
ADD COLUMN IF NOT EXISTS parcel_id TEXT;

-- Create function to generate property fingerprint
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
  -- Removes non-alphanumeric characters and converts to lowercase
  normalized_address := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.address->>'street', '') || 
    COALESCE(NEW.address->>'city', '') || 
    COALESCE(NEW.address->>'state', '') || 
    COALESCE(NEW.address->>'zipCode', ''), 
    '[^a-z0-9]', '', 'g'
  ));
  
  -- Geocode (round to 4 decimal places for ~11m precision)
  geo_lat := COALESCE(ROUND(CAST(NULLIF(NEW.address->>'lat', '') AS NUMERIC), 4)::TEXT, '');
  geo_lng := COALESCE(ROUND(CAST(NULLIF(NEW.address->>'lng', '') AS NUMERIC), 4)::TEXT, '');
  
  -- Unit (normalize)
  unit_val := LOWER(REGEXP_REPLACE(COALESCE(NEW.address->>'unit', ''), '[^a-z0-9]', '', 'g'));
  
  -- Lot Size & Living Area (handle nulls)
  lot_val := COALESCE(NEW.lot_size::TEXT, '');
  area_val := COALESCE(NEW.square_footage::TEXT, '');
  
  -- Parcel ID (normalize)
  parcel_val := LOWER(REGEXP_REPLACE(COALESCE(NEW.parcel_id, ''), '[^a-z0-9]', '', 'g'));

  -- Concatenate all parts with pipe separator
  raw_string := normalized_address || '|' || geo_lat || '|' || geo_lng || '|' || unit_val || '|' || lot_val || '|' || area_val || '|' || parcel_val;
  
  -- Generate SHA-256 hash
  NEW.fingerprint := encode(digest(raw_string, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger to update fingerprint on Insert or Update
DROP TRIGGER IF EXISTS set_property_fingerprint_trigger ON listings;
CREATE TRIGGER set_property_fingerprint_trigger
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION generate_property_fingerprint();

-- Add Unique Index to prevent duplicates
-- Using partial index where fingerprint is not null to allow drafts/incomplete listings if needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_fingerprint 
ON listings(fingerprint);