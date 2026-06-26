-- ============================================================
-- Migration: Listings entity with intent and lifecycle (ADR-007 D1)
-- Description: A listing is a time-bound offer against a physical
--   `properties` row. Many listings : one property over its life. Carries
--   intent (polymorphic terms), a lifecycle state machine, and the
--   provenance flags the authority-to-list gate (D2) will drive.
--   CHECK-enum style matches the existing `properties` table.
-- ============================================================

CREATE TABLE IF NOT EXISTS listings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships: offer -> physical asset, and the lister (was Property.landlord_id)
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  listed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Intent [D1] - MVP creates only 'rent_ltr'; others are schema-ready
  intent TEXT NOT NULL CHECK (intent IN ('rent_ltr', 'rent_str', 'sale', 'fractional')),

  -- Lifecycle [D1] - replaces the old flat property status enum
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'active', 'pending', 'leased', 'sold', 'withdrawn', 'expired')),
  days_on_market INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Offer content (Fair-Housing-screened free text) [D2 Gate 3]
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  utilities_included TEXT[] NOT NULL DEFAULT '{}',
  pet_policy TEXT,
  available_date DATE,
  surrounding_area JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pricing + terms, polymorphic by intent [D1] (RentLtrTerms on MVP)
  terms JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Provenance / authority gate [D2] - read-only, set by the gate, not the client
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  authority_tier TEXT NOT NULL DEFAULT 'T0'
    CHECK (authority_tier IN ('T0', 'T1', 'T2')),
  fair_housing_cleared BOOLEAN NOT NULL DEFAULT false,
  managed_by_pm BOOLEAN NOT NULL DEFAULT false,

  -- Engagement (unique registered tenants; see listing_view_events)
  views INTEGER NOT NULL DEFAULT 0,

  -- Timestamps (deleted_at = soft withdraw)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_property_id ON listings(property_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_listed_by ON listings(listed_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_state ON listings(state) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_listings_intent ON listings(intent) WHERE deleted_at IS NULL;
-- Public search is "active listings"; index that hot path directly.
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(state, intent) WHERE state = 'active' AND deleted_at IS NULL;

-- Keep updated_at fresh on UPDATE (shared trigger function from 20230103000014)
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: mirror the properties policy shape (landlord scoped by listed_by via
-- users.auth_id = auth.uid()). The Rust backend connects as owner and does its
-- own RoleUser + owner-check; these policies guard the Supabase-client path.
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listings_select_landlord ON listings;
CREATE POLICY listings_select_landlord ON listings
  FOR SELECT
  USING (
    listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS listings_select_active_public ON listings;
CREATE POLICY listings_select_active_public ON listings
  FOR SELECT
  USING (state = 'active' AND deleted_at IS NULL);

DROP POLICY IF EXISTS listings_insert_landlord ON listings;
CREATE POLICY listings_insert_landlord ON listings
  FOR INSERT
  WITH CHECK (
    listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS listings_update_landlord ON listings;
CREATE POLICY listings_update_landlord ON listings
  FOR UPDATE
  USING (
    listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS listings_delete_landlord ON listings;
CREATE POLICY listings_delete_landlord ON listings
  FOR DELETE
  USING (
    listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE listings IS 'Time-bound offer against a physical property (ADR-007 two-entity split); many listings : one property';
COMMENT ON COLUMN listings.intent IS 'Offer kind; MVP creates only rent_ltr, others are schema-ready';
COMMENT ON COLUMN listings.state IS 'Lifecycle state machine: draft -> active -> pending -> leased/sold -> withdrawn/expired';
COMMENT ON COLUMN listings.terms IS 'Polymorphic pricing/terms JSONB keyed by intent (RentLtrTerms on MVP)';
COMMENT ON COLUMN listings.authority_tier IS 'Authority-to-list tier; T0 self-attested / T1 documents-on-file (T2 deferred), set by the D2 gate';
