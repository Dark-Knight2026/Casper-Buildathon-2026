-- ============================================================
-- Migration: Create Payments Table
-- Description: Track all payment transactions
-- Created: 2026-01-03
-- ============================================================

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  
  -- Payment Details
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN (
    'rent', 'security_deposit', 'pet_deposit', 'late_fee', 
    'utility', 'maintenance', 'other'
  )),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Payment Method
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
    'credit_card', 'debit_card', 'bank_transfer', 'ach', 
    'check', 'cash', 'money_order', 'other'
  )),
  
  -- Status
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'completed', 'failed', 
    'cancelled', 'refunded', 'disputed'
  )),
  
  -- Transaction Details
  transaction_id VARCHAR(255) UNIQUE,
  external_payment_id VARCHAR(255), -- Stripe payment intent ID, etc.
  confirmation_number VARCHAR(100),
  
  -- Dates
  due_date DATE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Late Fee
  is_late BOOLEAN DEFAULT false,
  late_fee_amount DECIMAL(10, 2) DEFAULT 0,
  days_late INTEGER,
  
  -- Refund Information
  refund_amount DECIMAL(10, 2),
  refund_reason TEXT,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment Details
  description TEXT,
  notes TEXT,
  receipt_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_lease_status ON payments(lease_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_due_status ON payments(due_date, payment_status) 
  WHERE payment_status IN ('pending', 'processing');

-- Partial index for pending payments
CREATE INDEX IF NOT EXISTS idx_pending_payments ON payments(id, due_date, amount) 
  WHERE payment_status IN ('pending', 'processing');

-- Covering index for payment history
CREATE INDEX IF NOT EXISTS idx_payments_history ON payments(lease_id, payment_date DESC) 
  INCLUDE (amount, payment_status, payment_type);

-- Comments
COMMENT ON TABLE payments IS 'Tracks all payment transactions including rent, deposits, and fees';
COMMENT ON COLUMN payments.external_payment_id IS 'Payment gateway transaction ID (e.g., Stripe payment intent)';
COMMENT ON COLUMN payments.is_late IS 'Automatically calculated based on due_date and payment_date';
COMMENT ON COLUMN payments.transaction_id IS 'Internal unique transaction identifier';