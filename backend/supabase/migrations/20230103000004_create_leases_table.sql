-- ============================================================
-- Migration: Create Leases Table
-- Description: Store lease agreements between landlords and tenants
-- Created: 2026-01-03
-- ============================================================

-- Create leases table
CREATE TABLE IF NOT EXISTS leases (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  landlord_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Tenant Information (supports multiple tenants)
  tenant_ids UUID[] NOT NULL,
  primary_tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Lease Details
  lease_number VARCHAR(50) UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('fixed_term', 'month_to_month', 'sublease', 'commercial')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_signatures', 'under_review', 'pending_approval', 
    'active', 'expiring_soon', 'expired', 'terminated', 'renewed'
  )),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  move_in_date DATE,
  move_out_date DATE,
  notice_period_days INTEGER DEFAULT 30,
  
  -- Financial Terms
  monthly_rent DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NOT NULL,
  first_month_rent DECIMAL(10, 2),
  last_month_rent DECIMAL(10, 2),
  pet_deposit DECIMAL(10, 2) DEFAULT 0,
  
  -- Payment Terms
  payment_due_day INTEGER DEFAULT 1 CHECK (payment_due_day BETWEEN 1 AND 31),
  late_fee_amount DECIMAL(10, 2),
  late_fee_grace_period_days INTEGER DEFAULT 5,
  payment_methods TEXT[] DEFAULT ARRAY['bank_transfer', 'credit_card', 'check'],
  
  -- Utilities & Services
  utilities_included TEXT[],
  utilities_tenant_responsibility TEXT[],
  
  -- Policies
  pet_policy JSONB,
  smoking_policy VARCHAR(20) DEFAULT 'no_smoking' CHECK (smoking_policy IN ('allowed', 'no_smoking', 'outside_only')),
  guest_policy JSONB,
  sublease_allowed BOOLEAN DEFAULT false,
  
  -- Maintenance
  maintenance_responsibilities JSONB DEFAULT '{
    "landlord": [],
    "tenant": []
  }'::jsonb,
  
  -- Renewal
  auto_renew BOOLEAN DEFAULT false,
  renewal_terms JSONB,
  renewal_notice_days INTEGER DEFAULT 60,
  
  -- Special Terms
  special_terms TEXT,
  addendums JSONB DEFAULT '[]'::jsonb,
  
  -- Documents
  lease_document_url TEXT,
  signed_document_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  last_modified_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_lease_dates CHECK (end_date > start_date),
  CONSTRAINT valid_rent CHECK (monthly_rent > 0),
  CONSTRAINT valid_deposit CHECK (security_deposit >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leases_landlord_id ON leases(landlord_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_primary_tenant_id ON leases(primary_tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_tenant_ids ON leases USING gin(tenant_ids) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_type ON leases(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_expiring ON leases(end_date) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_lease_number ON leases(lease_number) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leases_landlord_status ON leases(landlord_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leases_property_status ON leases(property_id, status) WHERE deleted_at IS NULL;

-- Partial index for active leases
CREATE INDEX IF NOT EXISTS idx_active_leases ON leases(id, status, end_date) 
  WHERE status = 'active' AND deleted_at IS NULL;

-- Covering index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_leases_dashboard ON leases(landlord_id, status, start_date, end_date) 
  INCLUDE (monthly_rent, property_id) 
  WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE leases IS 'Stores lease agreements between landlords and tenants';
COMMENT ON COLUMN leases.tenant_ids IS 'Array of tenant user IDs (supports multiple tenants per lease)';
COMMENT ON COLUMN leases.lease_number IS 'Unique lease identifier for reference';
COMMENT ON COLUMN leases.addendums IS 'Array of lease amendments and addendums';
COMMENT ON COLUMN leases.maintenance_responsibilities IS 'JSONB object defining landlord and tenant maintenance responsibilities';