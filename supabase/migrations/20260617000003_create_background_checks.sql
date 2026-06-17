-- ============================================================
-- Migration: Background checks
-- Description: Bureau background checks (credit/criminal/eviction) the reviewing
--   landlord requests against a rental application. The applicant must have
--   consented (rental_applications.background_check_consent) before one can be
--   requested - enforced in the db/handler layer. `result` holds the bureau's
--   report (JSONB, null until resolved); a real bureau resolves asynchronously,
--   the hackathon fake completes synchronously. requested_by is the landlord.
-- ============================================================

CREATE TABLE IF NOT EXISTS background_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES rental_applications(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  check_type TEXT NOT NULL CHECK (check_type IN ('credit', 'criminal', 'eviction')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  result JSONB,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Checks for an application, newest first (the GET .../background-checks order).
CREATE INDEX IF NOT EXISTS idx_background_checks_application
  ON background_checks(application_id, created_at DESC);

-- RLS: same posture as rental_applications - the backend connects as owner and
-- enforces the landlord-only rule in the db layer; this guards the Supabase
-- path. Only the check's application's landlord may touch it.
ALTER TABLE background_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS background_checks_landlord ON background_checks;
CREATE POLICY background_checks_landlord ON background_checks
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

COMMENT ON TABLE background_checks IS 'Bureau background checks on a rental application, requested by the reviewing landlord (requires applicant consent)';
