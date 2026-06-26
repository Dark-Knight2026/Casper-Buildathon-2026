-- ============================================================
-- Migration: Viewings (in-person viewing bookings, ADR-007 downstream)
-- Description: A tenant books an in-person viewing of a listing; the landlord
--   confirms or rejects it. Under the two-entity split the booking targets a
--   listing, not the bare physical property. `landlord_id` is denormalized from
--   the listing at booking time so reads/updates need no join back to listings.
--   `viewing_time` is kept as TEXT ('14:00') to match the wire contract's
--   separate date/time string fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS viewings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,      -- tenant
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- denormalized from listing.listed_by
  viewing_date DATE NOT NULL,
  viewing_time TEXT NOT NULL,

  -- Lifecycle: pending -> confirmed / cancelled (landlord-driven, terminal).
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- A tenant's own bookings, newest first (the GET /viewings order).
CREATE INDEX IF NOT EXISTS idx_viewings_user_created
  ON viewings(user_id, created_at DESC);
-- Bookings for a listing (GET /listings/{id}/viewings, landlord view).
CREATE INDEX IF NOT EXISTS idx_viewings_listing_id
  ON viewings(listing_id);

-- Keep updated_at fresh on UPDATE (shared trigger function from 20230103000014).
DROP TRIGGER IF EXISTS update_viewings_updated_at ON viewings;
CREATE TRIGGER update_viewings_updated_at
  BEFORE UPDATE ON viewings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: same posture as the other downstream tables - the policy guards the
-- Supabase-client path; the Rust backend connects as owner and enforces the
-- tenant-books / landlord-reviews split in the db layer. Both parties to a
-- booking (its tenant and its landlord) may read it.
ALTER TABLE viewings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS viewings_party ON viewings;
CREATE POLICY viewings_party ON viewings
  FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

COMMENT ON TABLE viewings IS 'In-person viewing bookings against a listing (ADR-007); landlord_id denormalized from listing.listed_by';
