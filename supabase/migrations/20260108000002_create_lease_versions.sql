-- Create lease_versions table for lease history tracking
CREATE TABLE IF NOT EXISTS public.app_25a44123a6_lease_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  change_description TEXT,
  previous_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_change_type CHECK (change_type IN ('created', 'amended', 'renewed', 'terminated', 'updated')),
  CONSTRAINT unique_lease_version UNIQUE (lease_id, version_number)
);

-- Create indexes
CREATE INDEX idx_lease_versions_lease_id ON public.app_25a44123a6_lease_versions(lease_id);
CREATE INDEX idx_lease_versions_changed_at ON public.app_25a44123a6_lease_versions(changed_at);
CREATE INDEX idx_lease_versions_change_type ON public.app_25a44123a6_lease_versions(change_type);

-- Enable RLS
ALTER TABLE public.app_25a44123a6_lease_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their lease versions"
  ON public.app_25a44123a6_lease_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leases
      WHERE leases.id = app_25a44123a6_lease_versions.lease_id
      AND (
        auth.uid() = ANY(leases.tenant_ids)
        OR leases.landlord_id = auth.uid()
        OR leases.agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert lease versions"
  ON public.app_25a44123a6_lease_versions
  FOR INSERT
  WITH CHECK (true); -- Versions created by triggers/functions

-- Add comment
COMMENT ON TABLE public.app_25a44123a6_lease_versions IS 'Audit trail for lease changes and amendments';