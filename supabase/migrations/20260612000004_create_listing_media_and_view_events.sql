-- ============================================================
-- Migration: Listing media and view events (ADR-007 D1)
-- Description: Two listing-scoped child tables.
--   listing_media       - the media pipeline output (EXIF-stripped URL,
--     IPFS cid, ordering, moderation status). Distinct from the legacy
--     listing_photos (which FK'd properties in the dead single-entity model).
--   listing_view_events - per-registered-tenant view dedup. Named
--     `listing_view_events` to avoid the existing `listing_views` table
--     (20260109000002), which is dead/replaced.
-- ============================================================

-- --- Media -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cid TEXT,                                   -- IPFS content id; null until pinned
  position INTEGER NOT NULL DEFAULT 0,        -- display ordering
  moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media(listing_id);
-- Public display reads approved media in order; index that path.
CREATE INDEX IF NOT EXISTS idx_listing_media_ordered
  ON listing_media(listing_id, position) WHERE moderation_status = 'approved';

DROP TRIGGER IF EXISTS update_listing_media_updated_at ON listing_media;
CREATE TRIGGER update_listing_media_updated_at
  BEFORE UPDATE ON listing_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- --- View events -------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_view_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One registered tenant = one view; ON CONFLICT DO NOTHING gates the counter.
  CONSTRAINT uq_listing_view_events_listing_user UNIQUE (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_view_events_listing_id ON listing_view_events(listing_id);

-- --- RLS ---------------------------------------------------------------
-- Same posture as listings: policies guard the Supabase-client path; the
-- Rust backend connects as owner and enforces authz in the db layer.
ALTER TABLE listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_view_events ENABLE ROW LEVEL SECURITY;

-- Media is readable when its listing is publicly visible or owned by the caller.
DROP POLICY IF EXISTS listing_media_select ON listing_media;
CREATE POLICY listing_media_select ON listing_media
  FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE (state = 'active' AND deleted_at IS NULL)
         OR listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS listing_media_write_landlord ON listing_media;
CREATE POLICY listing_media_write_landlord ON listing_media
  FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- A tenant may record and see their own view events.
DROP POLICY IF EXISTS listing_view_events_own ON listing_view_events;
CREATE POLICY listing_view_events_own ON listing_view_events
  FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE listing_media IS 'Listing media pipeline output: EXIF-stripped URL, IPFS cid, ordering, moderation status';
COMMENT ON TABLE listing_view_events IS 'Per-registered-tenant view dedup (unique listing_id+user_id); renamed to avoid the legacy listing_views table';
COMMENT ON COLUMN listing_media.cid IS 'IPFS content id from the ContentPinner; null until pinned';
COMMENT ON COLUMN listing_media.moderation_status IS 'pending excluded from public display until approved';
