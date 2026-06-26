-- ============================================================
-- Migration: Create Payment Schedules Table
-- Description: Track scheduled/recurring payments
-- Created: 2026-01-03
-- ============================================================

-- Create payment_schedules table
CREATE TABLE IF NOT EXISTS payment_schedules (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Schedule Details
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('rent', 'utility', 'other')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  
  -- Recurrence
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('one_time', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'annually')),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Auto-pay
  auto_pay_enabled BOOLEAN DEFAULT false,
  payment_method_id VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_schedules_lease_id ON payment_schedules(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_tenant_id ON payment_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_next_due_date ON payment_schedules(next_due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

-- Comments
COMMENT ON TABLE payment_schedules IS 'Manages scheduled and recurring payments';
COMMENT ON COLUMN payment_schedules.frequency IS 'Payment recurrence frequency';
COMMENT ON COLUMN payment_schedules.next_due_date IS 'Next scheduled payment due date';
COMMENT ON COLUMN payment_schedules.payment_method_id IS 'Stripe payment method ID for auto-pay';