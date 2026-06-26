-- Create payment_receipts table for payment documentation
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number VARCHAR(100) NOT NULL UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  payer_name VARCHAR(255) NOT NULL,
  payer_email VARCHAR(255),
  property_address TEXT NOT NULL,
  lease_id UUID REFERENCES leases(id),
  description TEXT,
  notes TEXT,
  pdf_url TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('card', 'bank_transfer', 'check', 'cash', 'other'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_id ON payment_receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_date ON payment_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_lease_id ON payment_receipts(lease_id);

-- Enable RLS
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment receipts"
  ON payment_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_receipts.payment_id
      AND (p.tenant_id = auth.uid() OR p.lease_id IN (
          SELECT id FROM leases WHERE landlord_id = auth.uid()
      ))
    )
  );

CREATE POLICY "System can create payment receipts"
  ON payment_receipts
  FOR INSERT
  WITH CHECK (true); -- Created by payment processing function

-- Add comment
COMMENT ON TABLE payment_receipts IS 'Payment receipts and documentation';