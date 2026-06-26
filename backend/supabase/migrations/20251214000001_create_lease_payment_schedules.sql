-- ============================================================================
-- Lease Payment Schedules Table
-- ============================================================================
-- Purpose: Track payment schedules, history, and status for lease agreements
-- Created: 2025-12-14
-- ============================================================================

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',
  'scheduled',
  'processing',
  'completed',
  'failed',
  'refunded',
  'disputed',
  'cancelled'
);

-- Create payment method enum
CREATE TYPE payment_method AS ENUM (
  'cash',
  'check',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'ach',
  'wire_transfer',
  'online_payment',
  'other'
);

-- Create lease payment schedules table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_lease_payment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES app_1fa2dc8566_leases(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_type TEXT NOT NULL, -- 'rent', 'security_deposit', 'late_fee', 'pet_deposit', 'utility', 'other'
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  
  -- Schedule Information
  due_date DATE NOT NULL,
  payment_date DATE,
  scheduled_date DATE, -- For auto-payments
  
  -- Status
  status payment_status NOT NULL DEFAULT 'pending',
  
  -- Payment Method
  payment_method payment_method,
  payment_reference TEXT, -- Transaction ID, check number, etc.
  payment_processor TEXT, -- Stripe, PayPal, etc.
  
  -- Late Fee Tracking
  is_late BOOLEAN DEFAULT false,
  late_fee_amount NUMERIC DEFAULT 0,
  grace_period_days INTEGER DEFAULT 0,
  
  -- Recurring Payment
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'monthly', 'quarterly', 'annually'
  next_payment_date DATE,
  
  -- Additional Information
  description TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Payment Proof
  receipt_url TEXT,
  receipt_uploaded_at TIMESTAMP WITH TIME ZONE,
  
  -- Tenant Information
  tenant_id UUID, -- Who made the payment
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount >= 0),
  CONSTRAINT valid_dates CHECK (due_date IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lease_payment_schedules_lease_id_idx 
  ON app_1fa2dc8566_lease_payment_schedules(lease_id);
CREATE INDEX IF NOT EXISTS lease_payment_schedules_status_idx 
  ON app_1fa2dc8566_lease_payment_schedules(status);
CREATE INDEX IF NOT EXISTS lease_payment_schedules_due_date_idx 
  ON app_1fa2dc8566_lease_payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS lease_payment_schedules_tenant_id_idx 
  ON app_1fa2dc8566_lease_payment_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS lease_payment_schedules_payment_date_idx 
  ON app_1fa2dc8566_lease_payment_schedules(payment_date) 
  WHERE payment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_payment_schedules_is_late_idx 
  ON app_1fa2dc8566_lease_payment_schedules(is_late) 
  WHERE is_late = true;
CREATE INDEX IF NOT EXISTS lease_payment_schedules_deleted_idx 
  ON app_1fa2dc8566_lease_payment_schedules(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE app_1fa2dc8566_lease_payment_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Landlords can view payment schedules for their leases
CREATE POLICY "Landlords can view payment schedules" 
  ON app_1fa2dc8566_lease_payment_schedules
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND landlord_id = auth.uid()
    )
  );

-- Tenants can view their own payment schedules
CREATE POLICY "Tenants can view their payment schedules" 
  ON app_1fa2dc8566_lease_payment_schedules
  FOR SELECT 
  USING (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Agents can view payment schedules for assigned leases
CREATE POLICY "Agents can view assigned lease payments" 
  ON app_1fa2dc8566_lease_payment_schedules
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND agent_id = auth.uid()
    )
  );

-- Landlords and agents can manage payment schedules
CREATE POLICY "Landlords and agents can manage payment schedules" 
  ON app_1fa2dc8566_lease_payment_schedules
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND (landlord_id = auth.uid() OR agent_id = auth.uid())
    )
  );

-- Tenants can update payment information (limited)
CREATE POLICY "Tenants can update payment info" 
  ON app_1fa2dc8566_lease_payment_schedules
  FOR UPDATE 
  USING (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  )
  WITH CHECK (
    tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_lease_payment_schedules_updated_at
  BEFORE UPDATE ON app_1fa2dc8566_lease_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically mark late payments
CREATE OR REPLACE FUNCTION mark_late_payments()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE app_1fa2dc8566_lease_payment_schedules
  SET 
    is_late = true,
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND due_date < CURRENT_DATE
    AND is_late = false
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE app_1fa2dc8566_lease_payment_schedules IS 'Tracks payment schedules, history, and status for lease agreements';
COMMENT ON COLUMN app_1fa2dc8566_lease_payment_schedules.payment_type IS 'Type of payment: rent, security_deposit, late_fee, pet_deposit, utility, other';
COMMENT ON COLUMN app_1fa2dc8566_lease_payment_schedules.is_recurring IS 'Indicates if this is a recurring payment';
COMMENT ON COLUMN app_1fa2dc8566_lease_payment_schedules.metadata IS 'Additional payment metadata in JSON format';