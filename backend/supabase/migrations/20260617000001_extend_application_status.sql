-- ============================================================
-- Migration: Extend rental-application status set
-- Description: Broadens the landlord review lifecycle beyond the original
--   pending -> approved/rejected. Adds 'draft' (pre-submit, used by the later
--   draft-then-submit flow), 'under_review' (landlord actively reviewing) and
--   'conditional' (conditional approval). The DEFAULT stays 'pending'
--   (submit-on-create); 'draft' is set explicitly by the draft flow.
-- ============================================================

ALTER TABLE rental_applications DROP CONSTRAINT IF EXISTS rental_applications_status_check;
ALTER TABLE rental_applications
  ADD CONSTRAINT rental_applications_status_check
  CHECK (status IN ('draft', 'pending', 'under_review', 'conditional', 'approved', 'rejected'));

COMMENT ON COLUMN rental_applications.status IS 'Lifecycle: draft -> pending -> under_review/conditional -> approved/rejected (landlord-driven review)';
