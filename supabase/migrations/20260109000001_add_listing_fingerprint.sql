-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add fingerprint and parcel_id columns
-- FIX: Changed 'listings' to 'properties' as 'listings' table does not exist
ALTER TABLE properties 
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
  normalized_address := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.address_line1, '') || 
    COALESCE(NEW.city, '') || 
    COALESCE(NEW.state, '') || 
    COALESCE(NEW.zip_code, ''), 
    '[^a-z0-9]', '', 'g'
  ));
  
  -- Geocode
  geo_lat := COALESCE(ROUND(CAST(NEW.latitude AS NUMERIC), 4)::TEXT, '');
  geo_lng := COALESCE(ROUND(CAST(NEW.longitude AS NUMERIC), 4)::TEXT, '');
  
  -- Unit (normalize) - Using address_line2 as unit if needed, or skip
  unit_val := LOWER(REGEXP_REPLACE(COALESCE(NEW.address_line2, ''), '[^a-z0-9]', '', 'g'));
  
  -- Lot Size & Living Area
  lot_val := COALESCE(NEW.lot_size::TEXT, '');
  area_val := COALESCE(NEW.square_feet::TEXT, '');
  
  -- Parcel ID
  parcel_val := LOWER(REGEXP_REPLACE(COALESCE(NEW.parcel_id, ''), '[^a-z0-9]', '', 'g'));

  -- Concatenate all parts with pipe separator
  raw_string := normalized_address || '|' || geo_lat || '|' || geo_lng || '|' || unit_val || '|' || lot_val || '|' || area_val || '|' || parcel_val;
  
  -- Generate SHA-256 hash
  NEW.fingerprint := encode(digest(raw_string, 'sha256'), 'hex');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger to update fingerprint on Insert or Update
DROP TRIGGER IF EXISTS set_property_fingerprint_trigger ON properties;
CREATE TRIGGER set_property_fingerprint_trigger
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION generate_property_fingerprint();

-- Add Unique Index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_fingerprint 
ON properties(fingerprint);