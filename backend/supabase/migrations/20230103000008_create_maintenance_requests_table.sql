-- ============================================================
-- Migration: Create Maintenance Requests Table
-- Description: Track property maintenance requests
-- Created: 2026-01-03
-- ============================================================

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Request Details
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliance', 
    'structural', 'pest_control', 'landscaping', 'other'
  )),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  
  -- Location
  location_details TEXT,
  access_instructions TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'acknowledged', 'scheduled', 'in_progress', 
    'completed', 'cancelled', 'on_hold'
  )),
  
  -- Scheduling
  preferred_date DATE,
  preferred_time_slot VARCHAR(50),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  
  -- Cost
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  tenant_responsible_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Media
  images JSONB DEFAULT '[]'::jsonb,
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,
  
  -- Resolution
  resolution_notes TEXT,
  work_performed TEXT,
  parts_used JSONB DEFAULT '[]'::jsonb,
  
  -- Vendor
  vendor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_invoice_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_lease_id ON maintenance_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_id ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_category ON maintenance_requests(category);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at ON maintenance_requests(created_at DESC);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_property_status ON maintenance_requests(property_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_status ON maintenance_requests(tenant_id, status);

-- Comments
COMMENT ON TABLE maintenance_requests IS 'Tracks property maintenance and repair requests';
COMMENT ON COLUMN maintenance_requests.images IS 'Array of image URLs showing the issue';
COMMENT ON COLUMN maintenance_requests.parts_used IS 'JSONB array of parts used in repair';