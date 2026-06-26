-- Tenant Screening System Database Migration
-- Run this after the main database migration

-- Create background_checks table
CREATE TABLE IF NOT EXISTS background_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- 'credit', 'criminal', 'eviction', 'employment', 'rental'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  provider TEXT,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date TIMESTAMP WITH TIME ZONE,
  results JSONB,
  cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application_notes table
CREATE TABLE IF NOT EXISTS application_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update tenants table with application-specific columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS application_score INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS decision_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS decision_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS application_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS documents JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS personal_info JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS employment_info JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rental_history JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS references JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS additional_info JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_background_checks_application ON background_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_background_checks_status ON background_checks(status);
CREATE INDEX IF NOT EXISTS idx_application_notes_application ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_tenants_application_status ON tenants(application_status);
CREATE INDEX IF NOT EXISTS idx_tenants_submitted_at ON tenants(submitted_at);

-- Enable Row Level Security
ALTER TABLE background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for background_checks
CREATE POLICY "Landlords can view background checks for their properties"
  ON background_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE t.id = background_checks.application_id
      AND p.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can create background checks"
  ON background_checks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE t.id = background_checks.application_id
      AND p.landlord_id = auth.uid()
    )
  );

-- RLS Policies for application_notes
CREATE POLICY "Landlords can view notes for their applications"
  ON application_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE t.id = application_notes.application_id
      AND p.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can create notes"
  ON application_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE t.id = application_notes.application_id
      AND p.landlord_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for background_checks
CREATE TRIGGER update_background_checks_updated_at
  BEFORE UPDATE ON background_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE background_checks IS 'Stores background check requests and results for tenant applications';
COMMENT ON TABLE application_notes IS 'Internal notes for landlords regarding tenant applications';