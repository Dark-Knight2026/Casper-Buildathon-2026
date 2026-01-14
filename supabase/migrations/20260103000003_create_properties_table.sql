-- ============================================================
-- Migration: Create Properties Table
-- Description: Store rental property information
-- Created: 2026-01-03
-- ============================================================

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Basic Information
  name VARCHAR(200),
  property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('single_family', 'multi_family', 'apartment', 'condo', 'townhouse', 'commercial', 'other')),
  
  -- Address
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Property Details
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  square_feet INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  parking_spaces INTEGER,
  
  -- Amenities & Features
  amenities TEXT[],
  appliances TEXT[],
  utilities_included TEXT[],
  pet_policy JSONB DEFAULT '{
    "allowed": false,
    "types": [],
    "deposit": 0,
    "monthly_fee": 0,
    "restrictions": ""
  }'::jsonb,
  
  -- Financial
  purchase_price DECIMAL(12, 2),
  current_market_value DECIMAL(12, 2),
  property_tax_annual DECIMAL(10, 2),
  insurance_annual DECIMAL(10, 2),
  hoa_fee_monthly DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'unavailable')),
  listing_status VARCHAR(20) DEFAULT 'unlisted' CHECK (listing_status IN ('listed', 'unlisted', 'pending', 'leased')),
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  virtual_tour_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_listing_status ON properties(listing_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(city, state, zip_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type) WHERE deleted_at IS NULL;

-- Geospatial index (if PostGIS is enabled)
CREATE INDEX IF NOT EXISTS idx_properties_coordinates ON properties USING gist(
  ST_MakePoint(longitude::double precision, latitude::double precision)::geography
) WHERE deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties USING gin(
  to_tsvector('english', 
    coalesce(name, '') || ' ' || 
    coalesce(address_line1, '') || ' ' || 
    coalesce(city, '') || ' ' || 
    coalesce(state, '')
  )
);

-- Comments
COMMENT ON TABLE properties IS 'Stores rental property information';
COMMENT ON COLUMN properties.pet_policy IS 'JSONB object containing pet policy details';
COMMENT ON COLUMN properties.images IS 'Array of image URLs stored in Supabase Storage';
COMMENT ON COLUMN properties.latitude IS 'Property latitude for geospatial queries';
COMMENT ON COLUMN properties.longitude IS 'Property longitude for geospatial queries';