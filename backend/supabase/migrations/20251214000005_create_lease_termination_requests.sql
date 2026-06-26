-- ============================================================================
-- Lease Termination Requests Table
-- ============================================================================
-- Purpose: Handle lease termination workflow and early termination requests
-- Created: 2025-12-14
-- ============================================================================

-- Create termination status enum
CREATE TYPE termination_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'pending_approval',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'cancelled'
);

-- Create termination type enum
CREATE TYPE termination_type AS ENUM (
  'early_termination',
  'natural_expiration',
  'mutual_agreement',
  'breach_of_contract',
  'eviction',
  'military_clause',
  'job_relocation',
  'health_reasons',
  'other'
);

-- Create termination reason category enum
CREATE TYPE termination_reason_category AS ENUM (
  'tenant_initiated',
  'landlord_initiated',
  'mutual',
  'legal_requirement',
  'force_majeure'
);

-- Create lease termination requests table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_lease_termination_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES app_1fa2dc8566_leases(id) ON DELETE CASCADE,
  
  -- Termination Details
  termination_type termination_type NOT NULL,
  reason_category termination_reason_category NOT NULL,
  status termination_status NOT NULL DEFAULT 'draft',
  
  -- Dates
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proposed_termination_date DATE NOT NULL,
  actual_termination_date DATE,
  notice_period_days INTEGER,
  required_notice_days INTEGER, -- From lease agreement
  
  -- Requestor Information
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_by_role TEXT NOT NULL, -- 'tenant', 'landlord', 'agent'
  
  -- Reason & Details
  reason TEXT NOT NULL,
  detailed_explanation TEXT,
  supporting_documentation JSONB DEFAULT '[]', -- Array of document URLs
  
  -- Early Termination Fee
  early_termination_fee NUMERIC DEFAULT 0,
  fee_waived BOOLEAN DEFAULT false,
  fee_waiver_reason TEXT,
  fee_payment_status TEXT, -- 'pending', 'paid', 'waived'
  fee_paid_date DATE,
  
  -- Financial Settlement
  security_deposit_amount NUMERIC,
  security_deposit_deductions JSONB DEFAULT '[]', -- Array of deduction objects
  security_deposit_return_amount NUMERIC,
  security_deposit_return_date DATE,
  
  outstanding_rent NUMERIC DEFAULT 0,
  outstanding_utilities NUMERIC DEFAULT 0,
  outstanding_damages NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  total_amount_due NUMERIC,
  
  -- Property Condition
  move_out_inspection_required BOOLEAN DEFAULT true,
  move_out_inspection_date DATE,
  move_out_inspection_completed BOOLEAN DEFAULT false,
  property_condition_report JSONB,
  
  damages_found BOOLEAN DEFAULT false,
  damage_details JSONB DEFAULT '[]',
  repair_cost_estimate NUMERIC,
  repairs_completed BOOLEAN DEFAULT false,
  
  -- Keys & Access
  keys_returned BOOLEAN DEFAULT false,
  keys_return_date DATE,
  access_codes_deactivated BOOLEAN DEFAULT false,
  
  -- Utilities & Services
  utility_transfer_completed BOOLEAN DEFAULT false,
  utility_final_readings JSONB DEFAULT '{}',
  forwarding_address TEXT,
  
  -- Approval Workflow
  requires_landlord_approval BOOLEAN DEFAULT true,
  landlord_approved BOOLEAN,
  landlord_approved_by UUID REFERENCES auth.users(id),
  landlord_approved_at TIMESTAMP WITH TIME ZONE,
  landlord_notes TEXT,
  
  requires_legal_review BOOLEAN DEFAULT false,
  legal_review_completed BOOLEAN DEFAULT false,
  legal_reviewer_id UUID REFERENCES auth.users(id),
  legal_review_notes TEXT,
  
  -- Tenant Obligations
  tenant_obligations JSONB DEFAULT '[]', -- Array of obligation objects
  all_obligations_met BOOLEAN DEFAULT false,
  
  -- Landlord Obligations
  landlord_obligations JSONB DEFAULT '[]',
  landlord_obligations_met BOOLEAN DEFAULT false,
  
  -- Communication
  notice_sent BOOLEAN DEFAULT false,
  notice_sent_date TIMESTAMP WITH TIME ZONE,
  notice_method TEXT, -- 'email', 'certified_mail', 'personal_delivery'
  notice_received_confirmation BOOLEAN DEFAULT false,
  
  -- Documents
  termination_notice_url TEXT,
  signed_termination_agreement_url TEXT,
  move_out_checklist_url TEXT,
  final_statement_url TEXT,
  
  -- Re-rental
  property_relisted BOOLEAN DEFAULT false,
  property_relist_date DATE,
  new_tenant_found BOOLEAN DEFAULT false,
  new_lease_start_date DATE,
  
  -- Dispute
  disputed BOOLEAN DEFAULT false,
  dispute_reason TEXT,
  dispute_resolution TEXT,
  dispute_resolved BOOLEAN DEFAULT false,
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  final_walkthrough_completed BOOLEAN DEFAULT false,
  final_walkthrough_date DATE,
  
  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_termination_date CHECK (proposed_termination_date >= request_date),
  CONSTRAINT valid_fees CHECK (early_termination_fee >= 0),
  CONSTRAINT valid_amounts CHECK (
    (security_deposit_amount IS NULL OR security_deposit_amount >= 0) AND
    (outstanding_rent IS NULL OR outstanding_rent >= 0)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lease_termination_requests_lease_id_idx 
  ON app_1fa2dc8566_lease_termination_requests(lease_id);
CREATE INDEX IF NOT EXISTS lease_termination_requests_status_idx 
  ON app_1fa2dc8566_lease_termination_requests(status);
CREATE INDEX IF NOT EXISTS lease_termination_requests_type_idx 
  ON app_1fa2dc8566_lease_termination_requests(termination_type);
CREATE INDEX IF NOT EXISTS lease_termination_requests_requested_by_idx 
  ON app_1fa2dc8566_lease_termination_requests(requested_by);
CREATE INDEX IF NOT EXISTS lease_termination_requests_termination_date_idx 
  ON app_1fa2dc8566_lease_termination_requests(proposed_termination_date);
CREATE INDEX IF NOT EXISTS lease_termination_requests_inspection_date_idx 
  ON app_1fa2dc8566_lease_termination_requests(move_out_inspection_date) 
  WHERE move_out_inspection_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_termination_requests_deleted_idx 
  ON app_1fa2dc8566_lease_termination_requests(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE app_1fa2dc8566_lease_termination_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Landlords can view termination requests for their leases
CREATE POLICY "Landlords can view termination requests" 
  ON app_1fa2dc8566_lease_termination_requests
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND landlord_id = auth.uid()
    )
  );

-- Tenants can view termination requests for their leases
CREATE POLICY "Tenants can view their termination requests" 
  ON app_1fa2dc8566_lease_termination_requests
  FOR SELECT 
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Agents can view termination requests for assigned leases
CREATE POLICY "Agents can view assigned termination requests" 
  ON app_1fa2dc8566_lease_termination_requests
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND agent_id = auth.uid()
    )
  );

-- Tenants can create termination requests
CREATE POLICY "Tenants can create termination requests" 
  ON app_1fa2dc8566_lease_termination_requests
  FOR INSERT 
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Landlords and agents can manage termination requests
CREATE POLICY "Landlords and agents can manage termination requests" 
  ON app_1fa2dc8566_lease_termination_requests
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND (landlord_id = auth.uid() OR agent_id = auth.uid())
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_lease_termination_requests_updated_at
  BEFORE UPDATE ON app_1fa2dc8566_lease_termination_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate total amount due
CREATE OR REPLACE FUNCTION calculate_termination_total_due(
  p_termination_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT 
    COALESCE(early_termination_fee, 0) +
    COALESCE(outstanding_rent, 0) +
    COALESCE(outstanding_utilities, 0) +
    COALESCE(outstanding_damages, 0) +
    COALESCE(other_charges, 0) -
    COALESCE(security_deposit_return_amount, 0)
  INTO v_total
  FROM app_1fa2dc8566_lease_termination_requests
  WHERE id = p_termination_id;
  
  UPDATE app_1fa2dc8566_lease_termination_requests
  SET total_amount_due = v_total
  WHERE id = p_termination_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE app_1fa2dc8566_lease_termination_requests IS 'Handles lease termination workflow and early termination requests';
COMMENT ON COLUMN app_1fa2dc8566_lease_termination_requests.termination_type IS 'Type of termination: early, natural expiration, mutual, breach, eviction, etc.';
COMMENT ON COLUMN app_1fa2dc8566_lease_termination_requests.security_deposit_deductions IS 'Array of deduction objects from security deposit';
COMMENT ON COLUMN app_1fa2dc8566_lease_termination_requests.tenant_obligations IS 'Array of obligations tenant must fulfill before termination';