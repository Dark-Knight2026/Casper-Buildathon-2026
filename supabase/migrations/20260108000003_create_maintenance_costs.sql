-- Create maintenance_costs table for tracking repair expenses
CREATE TABLE IF NOT EXISTS public.app_25a44123a6_maintenance_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  cost_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  vendor_id UUID REFERENCES users(id),
  vendor_name VARCHAR(255),
  invoice_number VARCHAR(100),
  invoice_date DATE,
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_date DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_cost_type CHECK (cost_type IN ('labor', 'materials', 'parts', 'equipment', 'other')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  CONSTRAINT valid_amount CHECK (amount >= 0)
);

-- Create indexes
CREATE INDEX idx_maintenance_costs_request_id ON public.app_25a44123a6_maintenance_costs(maintenance_request_id);
CREATE INDEX idx_maintenance_costs_vendor_id ON public.app_25a44123a6_maintenance_costs(vendor_id);
CREATE INDEX idx_maintenance_costs_payment_status ON public.app_25a44123a6_maintenance_costs(payment_status);
CREATE INDEX idx_maintenance_costs_invoice_date ON public.app_25a44123a6_maintenance_costs(invoice_date);

-- Enable RLS
ALTER TABLE public.app_25a44123a6_maintenance_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Landlords and agents can view maintenance costs"
  ON public.app_25a44123a6_maintenance_costs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
      JOIN public.properties p ON mr.property_id = p.id
      WHERE mr.id = app_25a44123a6_maintenance_costs.maintenance_request_id
      AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );

CREATE POLICY "Landlords and agents can insert maintenance costs"
  ON public.app_25a44123a6_maintenance_costs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
      JOIN public.properties p ON mr.property_id = p.id
      WHERE mr.id = maintenance_request_id
      AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );

CREATE POLICY "Landlords and agents can update maintenance costs"
  ON public.app_25a44123a6_maintenance_costs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_25a44123a6_maintenance_requests mr
      JOIN public.properties p ON mr.property_id = p.id
      WHERE mr.id = app_25a44123a6_maintenance_costs.maintenance_request_id
      AND (p.owner_id = auth.uid() OR p.agent_id = auth.uid())
    )
  );

-- Create updated_at trigger
CREATE TRIGGER maintenance_costs_updated_at
  BEFORE UPDATE ON public.app_25a44123a6_maintenance_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.app_25a44123a6_maintenance_costs IS 'Tracks costs and expenses for maintenance requests';