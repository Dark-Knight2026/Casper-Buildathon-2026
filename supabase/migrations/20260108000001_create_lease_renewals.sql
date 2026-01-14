-- Create lease_renewals table for tracking lease renewal workflow
CREATE TABLE IF NOT EXISTS public.app_25a44123a6_lease_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  proposed_start_date DATE NOT NULL,
  proposed_end_date DATE NOT NULL,
  proposed_rent_amount DECIMAL(10, 2) NOT NULL,
  current_rent_amount DECIMAL(10, 2) NOT NULL,
  rent_increase_percentage DECIMAL(5, 2),
  tenant_response VARCHAR(50), -- 'accepted', 'rejected', 'negotiating', null
  tenant_response_date TIMESTAMP WITH TIME ZONE,
  landlord_notes TEXT,
  tenant_notes TEXT,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'completed')),
  CONSTRAINT valid_tenant_response CHECK (tenant_response IN ('accepted', 'rejected', 'negotiating') OR tenant_response IS NULL),
  CONSTRAINT valid_dates CHECK (proposed_end_date > proposed_start_date),
  CONSTRAINT valid_rent CHECK (proposed_rent_amount > 0 AND current_rent_amount > 0)
);

-- Create indexes for performance
CREATE INDEX idx_lease_renewals_lease_id ON public.app_25a44123a6_lease_renewals(lease_id);
CREATE INDEX idx_lease_renewals_status ON public.app_25a44123a6_lease_renewals(status);
CREATE INDEX idx_lease_renewals_proposed_start ON public.app_25a44123a6_lease_renewals(proposed_start_date);
CREATE INDEX idx_lease_renewals_created_at ON public.app_25a44123a6_lease_renewals(created_at);

-- Enable RLS
ALTER TABLE public.app_25a44123a6_lease_renewals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own lease renewals"
  ON public.app_25a44123a6_lease_renewals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leases
      WHERE leases.id = app_25a44123a6_lease_renewals.lease_id
      AND (
        leases.tenant_id = auth.uid()
        OR leases.landlord_id = auth.uid()
        OR leases.agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Landlords and agents can create lease renewals"
  ON public.app_25a44123a6_lease_renewals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leases
      WHERE leases.id = lease_id
      AND (leases.landlord_id = auth.uid() OR leases.agent_id = auth.uid())
    )
  );

CREATE POLICY "Landlords, agents, and tenants can update lease renewals"
  ON public.app_25a44123a6_lease_renewals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leases
      WHERE leases.id = app_25a44123a6_lease_renewals.lease_id
      AND (
        leases.tenant_id = auth.uid()
        OR leases.landlord_id = auth.uid()
        OR leases.agent_id = auth.uid()
      )
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER lease_renewals_updated_at
  BEFORE UPDATE ON public.app_25a44123a6_lease_renewals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.app_25a44123a6_lease_renewals IS 'Tracks lease renewal workflow and tenant responses';