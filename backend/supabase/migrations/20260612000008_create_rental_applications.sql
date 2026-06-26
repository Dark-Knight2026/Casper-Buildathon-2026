-- ============================================================
-- Migration: Rental applications (ADR-007 downstream)
-- Description: A tenant's application against a listing (the offer), reviewed by
--   the landlord. Under the two-entity split the application targets a listing,
--   not the bare physical property. `landlord_id` is denormalized from the
--   listing at submit time so the review owner-check is a local predicate
--   (WHERE landlord_id = caller) with no join back to listings. The PII fields
--   (DOB, income, references) make RLS defense-in-depth especially relevant.
-- ============================================================

CREATE TABLE IF NOT EXISTS rental_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,      -- tenant
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- denormalized from listing.listed_by

  -- Personal info
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,

  -- Current address
  current_address TEXT NOT NULL,
  current_city TEXT NOT NULL,
  current_state TEXT NOT NULL,
  current_zip TEXT NOT NULL,
  move_in_date DATE NOT NULL,

  -- Employment / income
  employer TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employment_length TEXT NOT NULL,
  monthly_income NUMERIC(12, 2) NOT NULL,

  -- References (second reference optional)
  reference1_name TEXT NOT NULL,
  reference1_phone TEXT NOT NULL,
  reference2_name TEXT,
  reference2_phone TEXT,

  -- Additional
  pets BOOLEAN NOT NULL DEFAULT FALSE,
  pet_description TEXT,
  additional_info TEXT,
  background_check_consent BOOLEAN NOT NULL DEFAULT FALSE,

  -- Lifecycle: pending -> approved / rejected (landlord-driven, terminal)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- A tenant's own applications, newest first (the GET /applications order).
CREATE INDEX IF NOT EXISTS idx_rental_applications_user_created
  ON rental_applications(user_id, created_at DESC);
-- Applications for a listing (GET /listings/{id}/applications, landlord view).
CREATE INDEX IF NOT EXISTS idx_rental_applications_listing_id
  ON rental_applications(listing_id);

-- Keep updated_at fresh on UPDATE (shared trigger function from 20230103000014).
DROP TRIGGER IF EXISTS update_rental_applications_updated_at ON rental_applications;
CREATE TRIGGER update_rental_applications_updated_at
  BEFORE UPDATE ON rental_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: same posture as the other downstream tables - the policy guards the
-- Supabase-client path; the Rust backend connects as owner and enforces the
-- tenant-owns / landlord-reviews split in the db layer. Both parties to an
-- application (its tenant and its landlord) may read it.
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rental_applications_party ON rental_applications;
CREATE POLICY rental_applications_party ON rental_applications
  FOR ALL
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

COMMENT ON TABLE rental_applications IS 'Tenant rental applications against a listing (ADR-007); landlord_id denormalized from listing.listed_by for the review owner-check';
COMMENT ON COLUMN rental_applications.landlord_id IS 'Denormalized listing.listed_by at submit time - the review owner-check predicate';
