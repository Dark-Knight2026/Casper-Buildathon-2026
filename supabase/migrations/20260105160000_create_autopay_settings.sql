-- Create autopay_settings table
CREATE TABLE IF NOT EXISTS autopay_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  payment_method_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  payment_day INTEGER NOT NULL CHECK (payment_day >= 1 AND payment_day <= 28),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(lease_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS autopay_settings_lease_id_idx ON autopay_settings(lease_id);
CREATE INDEX IF NOT EXISTS autopay_settings_enabled_idx ON autopay_settings(enabled);

-- Enable RLS
ALTER TABLE autopay_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own autopay settings"
  ON autopay_settings FOR SELECT
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases 
      WHERE tenant_id = auth.uid() OR landlord_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can insert their own autopay settings"
  ON autopay_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    lease_id IN (
      SELECT id FROM leases WHERE tenant_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can update their own autopay settings"
  ON autopay_settings FOR UPDATE
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE tenant_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can delete their own autopay settings"
  ON autopay_settings FOR DELETE
  TO authenticated
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE tenant_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE autopay_settings IS 'Stores autopay configuration for automatic rent payments';