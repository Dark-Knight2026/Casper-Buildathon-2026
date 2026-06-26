-- ============================================================
-- Migration: Application internal notes
-- Description: Private landlord notes attached to a rental application - the
--   landlord's own review annotations, never shown to the applicant. Only the
--   application's landlord (rental_applications.landlord_id) may add or read
--   them; the Rust backend enforces that in the db layer and the RLS policy
--   guards the Supabase-client path. author_id keeps who wrote each note for a
--   later multi-reviewer (PM) world; today it equals the application landlord.
-- ============================================================

CREATE TABLE IF NOT EXISTS application_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Notes for an application, newest first (the GET /applications/{id}/notes order).
CREATE INDEX IF NOT EXISTS idx_application_notes_application
  ON application_notes(application_id, created_at DESC);

-- RLS: same posture as rental_applications - the backend connects as owner and
-- enforces the landlord-only rule in the db layer; this guards the Supabase
-- path. Only the note's application's landlord may touch it.
ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_notes_landlord ON application_notes;
CREATE POLICY application_notes_landlord ON application_notes
  FOR ALL
  USING (
    application_id IN (
      SELECT id FROM rental_applications
      WHERE landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT id FROM rental_applications
      WHERE landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

COMMENT ON TABLE application_notes IS 'Private landlord review notes on a rental application (never shown to the applicant)';
