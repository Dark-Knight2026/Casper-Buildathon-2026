-- ============================================================================
-- Lease Maintenance Requests Table
-- ============================================================================
-- Purpose: Link leases to maintenance system and track maintenance requests
-- Created: 2025-12-14
-- ============================================================================

-- Create maintenance priority enum
CREATE TYPE maintenance_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent',
  'emergency'
);

-- Create maintenance status enum
CREATE TYPE maintenance_status AS ENUM (
  'submitted',
  'pending_review',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'rejected'
);

-- Create maintenance category enum
CREATE TYPE maintenance_category AS ENUM (
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'pest_control',
  'landscaping',
  'security',
  'cleaning',
  'general',
  'other'
);

-- Create lease maintenance requests table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_lease_maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES app_1fa2dc8566_leases(id) ON DELETE CASCADE,
  
  -- Request Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category maintenance_category NOT NULL,
  priority maintenance_priority NOT NULL DEFAULT 'medium',
  
  -- Status
  status maintenance_status NOT NULL DEFAULT 'submitted',
  
  -- Location
  property_id UUID NOT NULL,
  unit_number VARCHAR(50),
  specific_location TEXT, -- e.g., "Kitchen sink", "Master bedroom"
  
  -- Requestor Information
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_by_role TEXT, -- 'tenant', 'landlord', 'agent'
  tenant_id UUID,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  vendor_id UUID, -- Reference to vendor/contractor
  vendor_name TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  estimated_duration INTEGER, -- in minutes
  
  -- Access Information
  access_instructions TEXT,
  requires_tenant_presence BOOLEAN DEFAULT false,
  entry_permission_granted BOOLEAN DEFAULT false,
  
  -- Cost Information
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  cost_approved BOOLEAN DEFAULT false,
  cost_approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Responsibility
  responsible_party TEXT, -- 'landlord', 'tenant', 'shared'
  tenant_caused BOOLEAN DEFAULT false,
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  completion_notes TEXT,
  
  -- Quality & Satisfaction
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  tenant_satisfaction INTEGER CHECK (tenant_satisfaction >= 1 AND tenant_satisfaction <= 5),
  feedback TEXT,
  
  -- Attachments
  photos JSONB DEFAULT '[]', -- Array of photo URLs
  documents JSONB DEFAULT '[]', -- Array of document URLs
  before_photos JSONB DEFAULT '[]',
  after_photos JSONB DEFAULT '[]',
  
  -- Follow-up
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Additional Information
  is_emergency BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  warranty_claim BOOLEAN DEFAULT false,
  insurance_claim BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT valid_actual_cost CHECK (actual_cost IS NULL OR actual_cost >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_lease_id_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(lease_id);
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_property_id_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_status_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(status);
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_priority_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_category_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(category);
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_requested_by_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(requested_by);
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_assigned_to_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(assigned_to) 
  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_scheduled_date_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(scheduled_date) 
  WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_is_emergency_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(is_emergency) 
  WHERE is_emergency = true;
CREATE INDEX IF NOT EXISTS lease_maintenance_requests_deleted_idx 
  ON app_1fa2dc8566_lease_maintenance_requests(deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE app_1fa2dc8566_lease_maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Landlords can view maintenance requests for their properties
CREATE POLICY "Landlords can view maintenance requests" 
  ON app_1fa2dc8566_lease_maintenance_requests
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND landlord_id = auth.uid()
    )
  );

-- Tenants can view their own maintenance requests
CREATE POLICY "Tenants can view their maintenance requests" 
  ON app_1fa2dc8566_lease_maintenance_requests
  FOR SELECT 
  USING (
    requested_by = auth.uid()
    OR tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Agents can view maintenance requests for assigned leases
CREATE POLICY "Agents can view assigned maintenance requests" 
  ON app_1fa2dc8566_lease_maintenance_requests
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND agent_id = auth.uid()
    )
  );

-- Tenants can create maintenance requests
CREATE POLICY "Tenants can create maintenance requests" 
  ON app_1fa2dc8566_lease_maintenance_requests
  FOR INSERT 
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND auth.uid() = ANY(tenant_ids::uuid[])
    )
  );

-- Landlords and agents can manage maintenance requests
CREATE POLICY "Landlords and agents can manage maintenance requests" 
  ON app_1fa2dc8566_lease_maintenance_requests
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND (landlord_id = auth.uid() OR agent_id = auth.uid())
    )
  );

-- Assigned users can update their maintenance requests
CREATE POLICY "Assigned users can update maintenance requests" 
  ON app_1fa2dc8566_lease_maintenance_requests
  FOR UPDATE 
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_lease_maintenance_requests_updated_at
  BEFORE UPDATE ON app_1fa2dc8566_lease_maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE app_1fa2dc8566_lease_maintenance_requests IS 'Links leases to maintenance system and tracks maintenance requests';
COMMENT ON COLUMN app_1fa2dc8566_lease_maintenance_requests.priority IS 'Request priority: low, medium, high, urgent, emergency';
COMMENT ON COLUMN app_1fa2dc8566_lease_maintenance_requests.responsible_party IS 'Who is responsible for the cost: landlord, tenant, shared';
COMMENT ON COLUMN app_1fa2dc8566_lease_maintenance_requests.photos IS 'Array of photo URLs in JSON format';