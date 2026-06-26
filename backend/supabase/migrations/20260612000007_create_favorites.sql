-- ============================================================
-- Migration: Favorites (tenant saved listings, ADR-007 downstream)
-- Description: A tenant's saved listings. Under the two-entity split a favorite
--   targets a listing (the offer), not the bare physical property. The
--   composite primary key (user_id, listing_id) makes a save idempotent: a
--   duplicate POST is a no-op at the database level, and a DELETE scoped by
--   user_id is the owner check.
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- Newest-first listing of a tenant's favorites (the GET /favorites order).
CREATE INDEX IF NOT EXISTS idx_favorites_user_created
  ON favorites(user_id, created_at DESC);
-- Reverse lookup ("who favorited this listing"), and the FK delete path.
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id
  ON favorites(listing_id);

-- RLS: same posture as the other listing-scoped tables - the policy guards the
-- Supabase-client path; the Rust backend connects as owner and scopes every
-- query by the authenticated tenant's user id in the db layer.
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_owner ON favorites;
CREATE POLICY favorites_owner ON favorites
  FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

COMMENT ON TABLE favorites IS 'Tenant saved listings (ADR-007: targets a listing offer, not the physical property)';
