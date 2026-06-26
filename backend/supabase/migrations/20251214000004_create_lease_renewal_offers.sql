-- ============================================================================
-- Lease Renewal Offers Table
-- ============================================================================
-- Purpose: Track renewal offers and negotiations for existing leases
-- Created: 2025-12-14
-- ============================================================================

-- Create renewal status enum
CREATE TYPE renewal_status AS ENUM (
  'draft',
  'pending_landlord_approval',
  'sent_to_tenant',
  'tenant_reviewing',
  'tenant_accepted',
  'tenant_rejected',
  'tenant_counter_offered',
  'negotiating',
  'approved',
  'expired',
  'cancelled',
  'completed'
);

-- Create renewal type enum
CREATE TYPE renewal_type AS ENUM (
  'standard',
  'month_to_month',
  'short_term',
  'long_term',
  'modified_terms'
);

-- Create lease renewal offers table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_lease_renewal_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_lease_id UUID NOT NULL REFERENCES app_1fa2dc8566_leases(id) ON DELETE CASCADE,
  new_lease_id UUID REFERENCES app_1fa2dc8566_leases(id), -- Created when accepted
  
  -- Offer Details
  offer_type renewal_type NOT NULL DEFAULT 'standard',
  status renewal_status NOT NULL DEFAULT 'draft',
  
  -- Proposed Terms
  proposed_start_date DATE NOT NULL,
  proposed_end_date DATE NOT NULL,
  proposed_monthly_rent NUMERIC NOT NULL CHECK (proposed_monthly_rent >= 0),
  proposed_security_deposit NUMERIC,
  
  -- Rent Changes
  current_monthly_rent NUMERIC NOT NULL,
  rent_increase_amount NUMERIC,
  rent_increase_percentage NUMERIC,
  rent_justification TEXT,
  
  -- Modified Terms
  modified_clauses JSONB DEFAULT '[]', -- Array of modified clause objects
  new_clauses JSONB DEFAULT '[]', -- Array of new clause objects
  removed_clause_ids TEXT[], -- Array of clause IDs to remove
  
  -- Additional Terms
  additional_terms TEXT,
  special_conditions TEXT,
  incentives TEXT, -- e.g., "1 month free rent", "upgraded appliances"
  
  -- Tenant Response
  tenant_response TEXT, -- 'accepted', 'rejected', 'counter_offer'
  tenant_response_date TIMESTAMP WITH TIME ZONE,
  tenant_counter_offer JSONB, -- Counter offer details
  tenant_rejection_reason TEXT,
  tenant_notes TEXT,
  
  -- Negotiation History
  negotiation_rounds INTEGER DEFAULT 0,
  negotiation_history JSONB DEFAULT '[]', -- Array of negotiation events
  
  -- Deadlines
  offer_sent_date TIMESTAMP WITH TIME ZONE,
  response_deadline DATE,
  decision_deadline DATE,
  
  -- Reminders
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  
  -- Approval Workflow
  requires_landlord_approval BOOLEAN DEFAULT false,
  landlord_approved BOOLEAN,
  landlord_approved_by UUID REFERENCES auth.users(id),
  landlord_approved_at TIMESTAMP WITH TIME ZONE,
  landlord_notes TEXT,
  
  -- Market Data
  market_rent_estimate NUMERIC,
  market_data_source TEXT,
  market_data_date DATE,
  comparable_properties JSONB DEFAULT '[]',
  
  -- Tenant Information
  tenant_ids UUID[] NOT NULL,
  tenant_current_satisfaction INTEGER CHECK (tenant_current_satisfaction >= 1 AND tenant_current_satisfaction <= 5),
  tenant_payment_history TEXT, -- 'excellent', 'good', 'fair', 'poor'
  tenant_maintenance_history TEXT,
  
  -- Property Condition
  property_inspection_required BOOLEAN DEFAULT false,
  property_inspection_date DATE,
  property_condition_notes TEXT,
  repairs_required JSONB DEFAULT '[]',
  
  -- Financial Analysis
  estimated_vacancy_cost NUMERIC,
  estimated_turnover_cost NUMERIC,
  estimated_marketing_cost NUMERIC,
  renewal_cost_benefit_analysis TEXT,
  
  -- Documents
  offer_document_url TEXT,
  signed_renewal_document_url TEXT,
  supporting_documents JSONB DEFAULT '[]',
  
  -- Completion
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  expired_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (proposed_end_date > proposed_start_date),
  CONSTRAINT valid_rent_increase CHECK (rent_increase_amount IS NULL OR rent_increase_amount >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lease_renewal_offers_original_lease_id_idx 
  ON app_1fa2dc8566_lease_renewal_offers(original_lease_id);
CREATE INDEX IF NOT EXISTS lease_renewal_offers_new_lease_id_idx 
  ON app_1fa2dc8566_lease_renewal_offers(new_lease_id) 
  WHERE new_lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_renewal_offers_status_idx 
  ON app_1fa2dc8566_lease_renewal_offers(status);
CREATE INDEX IF NOT EXISTS lease_renewal_offers_response_deadline_idx 
  ON app_1fa2dc8566_lease_renewal_offers(response_deadline) 
  WHERE response_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_renewal_offers_created_by_idx 
  ON app_1fa2dc8566_lease_renewal_offers(created_by);
CREATE INDEX IF NOT EXISTS lease_renewal_offers_expires_idx 
  ON app_1fa2dc8566_lease_renewal_offers(expires_at) 
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_renewal_offers_deleted_idx 
  ON app_1fa2dc8566_lease_renewal_offers(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE app_1fa2dc8566_lease_renewal_offers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Landlords can view renewal offers for their leases
CREATE POLICY "Landlords can view renewal offers" 
  ON app_1fa2dc8566_lease_renewal_offers
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = original_lease_id 
      AND landlord_id = auth.uid()
    )
  );

-- Tenants can view renewal offers for their leases
CREATE POLICY "Tenants can view their renewal offers" 
  ON app_1fa2dc8566_lease_renewal_offers
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = original_lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Agents can view renewal offers for assigned leases
CREATE POLICY "Agents can view assigned renewal offers" 
  ON app_1fa2dc8566_lease_renewal_offers
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = original_lease_id 
      AND agent_id = auth.uid()
    )
  );

-- Landlords and agents can manage renewal offers
CREATE POLICY "Landlords and agents can manage renewal offers" 
  ON app_1fa2dc8566_lease_renewal_offers
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = original_lease_id 
      AND (landlord_id = auth.uid() OR agent_id = auth.uid())
    )
  );

-- Tenants can update their response
CREATE POLICY "Tenants can respond to renewal offers" 
  ON app_1fa2dc8566_lease_renewal_offers
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = original_lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = original_lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_lease_renewal_offers_updated_at
  BEFORE UPDATE ON app_1fa2dc8566_lease_renewal_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate rent increase percentage
CREATE OR REPLACE FUNCTION calculate_rent_increase_percentage(
  p_offer_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_current_rent NUMERIC;
  v_proposed_rent NUMERIC;
  v_percentage NUMERIC;
BEGIN
  SELECT current_monthly_rent, proposed_monthly_rent
  INTO v_current_rent, v_proposed_rent
  FROM app_1fa2dc8566_lease_renewal_offers
  WHERE id = p_offer_id;
  
  IF v_current_rent > 0 THEN
    v_percentage := ((v_proposed_rent - v_current_rent) / v_current_rent) * 100;
    
    UPDATE app_1fa2dc8566_lease_renewal_offers
    SET 
      rent_increase_amount = v_proposed_rent - v_current_rent,
      rent_increase_percentage = v_percentage
    WHERE id = p_offer_id;
    
    RETURN v_percentage;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark expired offers
CREATE OR REPLACE FUNCTION mark_expired_renewal_offers()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE app_1fa2dc8566_lease_renewal_offers
  SET 
    status = 'expired',
    expired_reason = 'Response deadline passed',
    updated_at = NOW()
  WHERE 
    status IN ('sent_to_tenant', 'tenant_reviewing')
    AND response_deadline < CURRENT_DATE
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE app_1fa2dc8566_lease_renewal_offers IS 'Tracks renewal offers and negotiations for existing leases';
COMMENT ON COLUMN app_1fa2dc8566_lease_renewal_offers.negotiation_history IS 'Array of negotiation events in JSON format';
COMMENT ON COLUMN app_1fa2dc8566_lease_renewal_offers.rent_increase_percentage IS 'Percentage increase from current rent';
COMMENT ON COLUMN app_1fa2dc8566_lease_renewal_offers.incentives IS 'Special incentives offered to tenant for renewal';