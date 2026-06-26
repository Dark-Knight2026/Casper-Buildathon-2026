-- ============================================================
-- Migration: Recreate lease_renewals + add negotiation history
-- Description: The pre-existing `lease_renewals` (migration 20260105151306) was
--   wired to the dead `landlords`/`tenants` parallel schema (FKs the canonical
--   users-with-role model never uses) and unread by any Rust code; its child
--   `renewal_reminders` (FK ON DELETE CASCADE, also unread) is dropped with it.
--   Both are replaced by a clean `lease_renewals` keyed to canonical
--   `leases`/`users`, plus a `lease_renewal_negotiations` history table, per the
--   kinder/20 reference §4. Status is VARCHAR + CHECK to match the project canon
--   (`leases.status`, `listings.state`); the orphaned `renewal_status` ENUM is
--   left untouched (still referenced by a prefixed orphan table we do not touch).
-- Created: 2026-06-16
-- ============================================================

-- Drop the orphaned renewals tables (renewal_reminders first: it FKs lease_renewals).
-- FK-dependency audit confirms renewal_reminders is the only inbound FK, so the
-- CASCADE drops nothing else. Verify against the target environment before
-- applying:
--   SELECT tc.table_name
--   FROM information_schema.table_constraints tc
--   JOIN information_schema.constraint_column_usage ccu
--     ON tc.constraint_name = ccu.constraint_name
--   WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'lease_renewals';
--   -- expected: renewal_reminders (only)
DROP TABLE IF EXISTS renewal_reminders CASCADE;
DROP TABLE IF EXISTS lease_renewals CASCADE;

-- Renewal offers: a landlord proposes new terms on an active lease; the tenant
-- accepts / rejects / counters. On accept, the lease is marked ready for the
-- on-chain prolong_lease_agreement (run by the landlord).
CREATE TABLE lease_renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships (canonical model)
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Proposed terms
  proposed_rent DECIMAL(10, 2) NOT NULL,
  proposed_term_months INTEGER NOT NULL,
  proposed_start_date DATE NOT NULL,
  rent_increase_reason TEXT,
  response_deadline DATE,

  -- Lifecycle: draft -> sent -> accepted | rejected | countered | expired
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'accepted', 'rejected', 'countered', 'expired'
  )),

  -- Tenant counter-offer ({ proposedRent, proposedTermMonths, notes }); null unless countered
  counter_offer JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_proposed_rent CHECK (proposed_rent >= 0),
  CONSTRAINT valid_proposed_term CHECK (proposed_term_months > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lease_renewals_lease_id ON lease_renewals(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lease_renewals_landlord_id ON lease_renewals(landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lease_renewals_tenant_id ON lease_renewals(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lease_renewals_status ON lease_renewals(status) WHERE deleted_at IS NULL;

-- updated_at trigger (shared function from 20230103000014)
DROP TRIGGER IF EXISTS update_lease_renewals_updated_at ON lease_renewals;
CREATE TRIGGER update_lease_renewals_updated_at
  BEFORE UPDATE ON lease_renewals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: parties see/act on their own renewals (backend connects as owner and
-- enforces RoleUser + ownership itself; these guard Supabase client-side access)
ALTER TABLE lease_renewals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lease_renewals_select_landlord ON lease_renewals;
CREATE POLICY lease_renewals_select_landlord ON lease_renewals
  FOR SELECT
  USING (landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS lease_renewals_select_tenant ON lease_renewals;
CREATE POLICY lease_renewals_select_tenant ON lease_renewals
  FOR SELECT
  USING (tenant_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS lease_renewals_insert_landlord ON lease_renewals;
CREATE POLICY lease_renewals_insert_landlord ON lease_renewals
  FOR INSERT
  WITH CHECK (landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS lease_renewals_update_landlord ON lease_renewals;
CREATE POLICY lease_renewals_update_landlord ON lease_renewals
  FOR UPDATE
  USING (landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS lease_renewals_update_tenant ON lease_renewals;
CREATE POLICY lease_renewals_update_tenant ON lease_renewals
  FOR UPDATE
  USING (tenant_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Negotiation history: messages and counter-offers exchanged on a renewal
CREATE TABLE lease_renewal_negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  renewal_id UUID NOT NULL REFERENCES lease_renewals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('message', 'counter_offer')),
  body TEXT,
  proposed_terms JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- A counter-offer must carry its terms; a message must not be mistaken for one.
  CONSTRAINT proposed_terms_required_for_counter_offer CHECK (
    kind <> 'counter_offer' OR proposed_terms IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_lease_renewal_negotiations_renewal_id
  ON lease_renewal_negotiations(renewal_id);

ALTER TABLE lease_renewal_negotiations ENABLE ROW LEVEL SECURITY;

-- Parties to the parent renewal can read its negotiation thread
DROP POLICY IF EXISTS lease_renewal_negotiations_select_parties ON lease_renewal_negotiations;
CREATE POLICY lease_renewal_negotiations_select_parties ON lease_renewal_negotiations
  FOR SELECT
  USING (
    renewal_id IN (
      SELECT id FROM lease_renewals
      WHERE landlord_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
         OR tenant_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- The author posts as themselves
DROP POLICY IF EXISTS lease_renewal_negotiations_insert_author ON lease_renewal_negotiations;
CREATE POLICY lease_renewal_negotiations_insert_author ON lease_renewal_negotiations
  FOR INSERT
  WITH CHECK (author_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Comments
COMMENT ON TABLE lease_renewals IS 'Lease renewal offers (reference §4): landlord proposes new terms, tenant accepts/rejects/counters';
COMMENT ON COLUMN lease_renewals.status IS 'Lifecycle: draft -> sent -> accepted | rejected | countered | expired';
COMMENT ON COLUMN lease_renewals.counter_offer IS 'Tenant counter-offer payload ({ proposedRent, proposedTermMonths, notes }); null unless countered';
COMMENT ON TABLE lease_renewal_negotiations IS 'Negotiation history (messages + counter-offers) on a renewal offer';
COMMENT ON COLUMN lease_renewal_negotiations.kind IS 'message (free text) or counter_offer (carries proposed_terms)';
