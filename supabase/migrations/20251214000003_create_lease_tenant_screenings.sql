-- ============================================================================
-- Lease Tenant Screenings Table
-- ============================================================================
-- Purpose: Store tenant screening results and background check information
-- Created: 2025-12-14
-- ============================================================================

-- Create screening status enum
CREATE TYPE screening_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'approved',
  'rejected',
  'expired',
  'cancelled'
);

-- Create screening result enum
CREATE TYPE screening_result AS ENUM (
  'pass',
  'fail',
  'conditional',
  'pending_review',
  'incomplete'
);

-- Create lease tenant screenings table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_lease_tenant_screenings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES app_1fa2dc8566_leases(id) ON DELETE CASCADE,
  
  -- Tenant Information
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_name VARCHAR(255) NOT NULL,
  tenant_email VARCHAR(255) NOT NULL,
  tenant_phone VARCHAR(50),
  
  -- Screening Details
  screening_type TEXT NOT NULL, -- 'credit', 'criminal', 'eviction', 'employment', 'rental_history', 'comprehensive'
  status screening_status NOT NULL DEFAULT 'pending',
  overall_result screening_result,
  
  -- Credit Check
  credit_score INTEGER,
  credit_report_url TEXT,
  credit_check_date DATE,
  credit_result screening_result,
  credit_notes TEXT,
  
  -- Criminal Background Check
  criminal_check_result screening_result,
  criminal_check_date DATE,
  criminal_records_found BOOLEAN,
  criminal_report_url TEXT,
  criminal_notes TEXT,
  
  -- Eviction History
  eviction_check_result screening_result,
  eviction_check_date DATE,
  evictions_found BOOLEAN,
  eviction_report_url TEXT,
  eviction_notes TEXT,
  
  -- Employment Verification
  employment_verified BOOLEAN,
  employer_name VARCHAR(255),
  employer_contact TEXT,
  employment_start_date DATE,
  monthly_income NUMERIC,
  employment_verification_date DATE,
  employment_notes TEXT,
  
  -- Rental History
  rental_history_verified BOOLEAN,
  previous_landlord_name VARCHAR(255),
  previous_landlord_contact TEXT,
  previous_rental_address TEXT,
  rental_history_result screening_result,
  rental_history_notes TEXT,
  
  -- Income Verification
  income_verified BOOLEAN,
  annual_income NUMERIC,
  income_to_rent_ratio NUMERIC, -- Calculated ratio
  income_documents JSONB DEFAULT '[]', -- Array of document URLs
  
  -- References
  "references" JSONB DEFAULT '[]', -- Array of reference objects
  references_verified BOOLEAN DEFAULT false,
  
  -- Identity Verification
  identity_verified BOOLEAN DEFAULT false,
  identity_document_type TEXT, -- 'drivers_license', 'passport', 'state_id'
  identity_document_number VARCHAR(100),
  identity_verification_date DATE,
  
  -- Screening Provider
  screening_provider TEXT, -- 'TransUnion', 'Experian', 'RentPrep', etc.
  screening_provider_reference TEXT,
  screening_cost NUMERIC,
  
  -- Decision
  approved BOOLEAN,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  conditional_approval_terms TEXT,
  
  -- Additional Requirements
  requires_cosigner BOOLEAN DEFAULT false,
  requires_additional_deposit BOOLEAN DEFAULT false,
  additional_deposit_amount NUMERIC,
  special_conditions TEXT,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Documents
  documents JSONB DEFAULT '[]', -- Array of all screening documents
  
  -- Consent
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE,
  consent_ip_address INET,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_credit_score CHECK (credit_score IS NULL OR (credit_score >= 300 AND credit_score <= 850)),
  CONSTRAINT valid_income CHECK (annual_income IS NULL OR annual_income >= 0),
  CONSTRAINT valid_ratio CHECK (income_to_rent_ratio IS NULL OR income_to_rent_ratio >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_lease_id_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(lease_id);
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_tenant_id_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(tenant_id);
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_status_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(status);
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_result_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(overall_result) 
  WHERE overall_result IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_approved_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(approved) 
  WHERE approved IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_expires_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(expires_at) 
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_tenant_screenings_deleted_idx 
  ON app_1fa2dc8566_lease_tenant_screenings(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE app_1fa2dc8566_lease_tenant_screenings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Landlords can view screenings for their leases
CREATE POLICY "Landlords can view tenant screenings" 
  ON app_1fa2dc8566_lease_tenant_screenings
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND landlord_id = auth.uid()
    )
  );

-- Agents can view screenings for assigned leases
CREATE POLICY "Agents can view tenant screenings" 
  ON app_1fa2dc8566_lease_tenant_screenings
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND agent_id = auth.uid()
    )
  );

-- Tenants can view their own screenings (limited fields)
CREATE POLICY "Tenants can view their own screenings" 
  ON app_1fa2dc8566_lease_tenant_screenings
  FOR SELECT 
  USING (tenant_id = auth.uid());

-- Landlords and agents can manage screenings
CREATE POLICY "Landlords and agents can manage screenings" 
  ON app_1fa2dc8566_lease_tenant_screenings
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND (landlord_id = auth.uid() OR agent_id = auth.uid())
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_lease_tenant_screenings_updated_at
  BEFORE UPDATE ON app_1fa2dc8566_lease_tenant_screenings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate income to rent ratio
CREATE OR REPLACE FUNCTION calculate_income_to_rent_ratio(
  p_screening_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_monthly_income NUMERIC;
  v_monthly_rent NUMERIC;
  v_ratio NUMERIC;
BEGIN
  -- Get monthly income from screening
  SELECT monthly_income INTO v_monthly_income
  FROM app_1fa2dc8566_lease_tenant_screenings
  WHERE id = p_screening_id;
  
  -- Get monthly rent from lease
  SELECT monthly_rent INTO v_monthly_rent
  FROM app_1fa2dc8566_leases l
  JOIN app_1fa2dc8566_lease_tenant_screenings s ON s.lease_id = l.id
  WHERE s.id = p_screening_id;
  
  -- Calculate ratio
  IF v_monthly_rent > 0 AND v_monthly_income > 0 THEN
    v_ratio := v_monthly_income / v_monthly_rent;
    
    -- Update the screening record
    UPDATE app_1fa2dc8566_lease_tenant_screenings
    SET income_to_rent_ratio = v_ratio
    WHERE id = p_screening_id;
    
    RETURN v_ratio;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE app_1fa2dc8566_lease_tenant_screenings IS 'Stores tenant screening results and background check information';
COMMENT ON COLUMN app_1fa2dc8566_lease_tenant_screenings.screening_type IS 'Type of screening: credit, criminal, eviction, employment, rental_history, comprehensive';
COMMENT ON COLUMN app_1fa2dc8566_lease_tenant_screenings.income_to_rent_ratio IS 'Ratio of monthly income to monthly rent (higher is better)';
COMMENT ON COLUMN app_1fa2dc8566_lease_tenant_screenings.consent_given IS 'Tenant consent for background check (required by law)';