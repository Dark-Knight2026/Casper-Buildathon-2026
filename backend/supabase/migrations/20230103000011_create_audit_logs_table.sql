-- ============================================================
-- Migration: Create Audit Logs Table
-- Description: Track all system activities for compliance and debugging
-- Created: 2026-01-03
-- ============================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(20),
  
  -- Action
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  
  -- Request Details
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('success', 'failure', 'error')),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_action ON audit_logs(resource_type, resource_id, created_at DESC);

-- Comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all system activities';
COMMENT ON COLUMN audit_logs.changes IS 'Computed diff between old_values and new_values';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous state of the resource (for UPDATE/DELETE)';
COMMENT ON COLUMN audit_logs.new_values IS 'New state of the resource (for INSERT/UPDATE)';