-- ============================================================
-- Migration: Listing authority documents (ADR-007 D2, Gate 2)
-- Description: Proof-of-authority files (deed / title / management
--   agreement) uploaded against a listing. Their presence is what lifts
--   the listing's authority_tier from T0 (self-attested) to T1 (documents
--   on file). The tier itself lives on `listings`; this table is the audit
--   trail of what backs it. T2 (county/title-data source-verification) is
--   deferred and not represented here.
-- ============================================================

CREATE TABLE IF NOT EXISTS listing_authority_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  -- deed/title => proof of ownership; management_agreement => delegated PM authority
  document_type TEXT NOT NULL CHECK (document_type IN ('deed', 'title', 'management_agreement')),
  url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_authority_documents_listing_id
  ON listing_authority_documents(listing_id);

-- RLS: same posture as the other listing-scoped tables - policies guard the
-- Supabase-client path; the Rust backend connects as owner and enforces the
-- lister-owns-listing check in the db layer.
ALTER TABLE listing_authority_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_authority_documents_landlord ON listing_authority_documents;
CREATE POLICY listing_authority_documents_landlord ON listing_authority_documents
  FOR ALL
  USING (
    listing_id IN (
      SELECT id FROM listings
      WHERE listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM listings
      WHERE listed_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

COMMENT ON TABLE listing_authority_documents IS 'Proof-of-authority files (deed/title/management agreement) backing a listing T1 authority tier';
COMMENT ON COLUMN listing_authority_documents.document_type IS 'deed/title => ownership proof; management_agreement => delegated PM authority (sets listings.managed_by_pm)';
