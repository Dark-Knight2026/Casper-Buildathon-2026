-- Create leases table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  tenant_ids TEXT[], -- Array of UUIDs stored as text or UUID[] if supported easily
  type TEXT,
  status TEXT DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  monthly_rent NUMERIC,
  security_deposit NUMERIC,
  clauses JSONB DEFAULT '[]',
  
  -- Agent workflow fields
  agent_id UUID,
  agent_commission NUMERIC, -- Added numeric commission field
  agent_commission_structure JSONB, -- Renamed from agent_commission to avoid conflict, stores detailed structure
  created_by_role TEXT,
  approval_status TEXT DEFAULT 'not_required',
  approval_history JSONB DEFAULT '[]',
  
  -- Signature tracking
  signature_status TEXT, -- 'pending' | 'signed'
  signature_progress JSONB, -- Detailed signature status object
  signature_request_id TEXT,
  
  -- Commission tracking
  commission_status TEXT,
  
  -- Version history
  version_history JSONB DEFAULT '[]',
  current_version INTEGER DEFAULT 1,
  
  -- Document management
  document_links JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS leases_property_id_idx ON app_1fa2dc8566_leases(property_id);
CREATE INDEX IF NOT EXISTS leases_landlord_id_idx ON app_1fa2dc8566_leases(landlord_id);
CREATE INDEX IF NOT EXISTS leases_agent_id_idx ON app_1fa2dc8566_leases(agent_id);
CREATE INDEX IF NOT EXISTS leases_status_idx ON app_1fa2dc8566_leases(status);

-- Enable RLS
ALTER TABLE app_1fa2dc8566_leases ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Landlords can view their own leases
CREATE POLICY "Landlords can view own leases" ON app_1fa2dc8566_leases
  FOR SELECT USING (landlord_id = auth.uid());

-- Agents can view leases they created or are assigned to
CREATE POLICY "Agents can view assigned leases" ON app_1fa2dc8566_leases
  FOR SELECT USING (agent_id = auth.uid());

-- Landlords can insert/update their own leases
CREATE POLICY "Landlords can manage own leases" ON app_1fa2dc8566_leases
  FOR ALL USING (landlord_id = auth.uid());

-- Agents can insert/update assigned leases
CREATE POLICY "Agents can manage assigned leases" ON app_1fa2dc8566_leases
  FOR ALL USING (agent_id = auth.uid());

-- Allow public read for development (optional, remove in production)
-- CREATE POLICY "Allow public read" ON app_1fa2dc8566_leases FOR SELECT USING (true);