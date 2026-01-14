-- Create payment_receipts table for payment documentation
CREATE TABLE IF NOT EXISTS public.app_25a44123a6_payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  receipt_number VARCHAR(100) NOT NULL UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  payer_name VARCHAR(255) NOT NULL,
  payer_email VARCHAR(255),
  property_address TEXT NOT NULL,
  lease_id UUID REFERENCES public.leases(id),
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
CREATE INDEX idx_payment_receipts_payment_id ON public.app_25a44123a6_payment_receipts(payment_id);
CREATE INDEX idx_payment_receipts_receipt_number ON public.app_25a44123a6_payment_receipts(receipt_number);
CREATE INDEX idx_payment_receipts_receipt_date ON public.app_25a44123a6_payment_receipts(receipt_date);
CREATE INDEX idx_payment_receipts_lease_id ON public.app_25a44123a6_payment_receipts(lease_id);

-- Enable RLS
ALTER TABLE public.app_25a44123a6_payment_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment receipts"
  ON public.app_25a44123a6_payment_receipts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = app_25a44123a6_payment_receipts.payment_id
      AND (p.tenant_id = auth.uid() OR p.landlord_id = auth.uid())
    )
  );

CREATE POLICY "System can create payment receipts"
  ON public.app_25a44123a6_payment_receipts
  FOR INSERT
  WITH CHECK (true); -- Created by payment processing function

-- Add comment
COMMENT ON TABLE public.app_25a44123a6_payment_receipts IS 'Payment receipts and documentation';