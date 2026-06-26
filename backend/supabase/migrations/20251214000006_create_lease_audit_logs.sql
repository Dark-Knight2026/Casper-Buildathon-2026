-- ============================================================================
-- Lease Audit Logs Table
-- ============================================================================
-- Purpose: Comprehensive audit trail for all lease operations
-- Created: 2025-12-14
-- ============================================================================

-- Create audit action enum
CREATE TYPE lease_audit_action AS ENUM (
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'reject',
  'sign',
  'send',
  'download',
  'share',
  'export',
  'print',
  'archive',
  'restore',
  'status_change',
  'payment_recorded',
  'maintenance_requested',
  'renewal_offered',
  'termination_requested',
  'document_uploaded',
  'document_deleted',
  'comment_added',
  'notification_sent',
  'other'
);

-- Create audit severity enum
CREATE TYPE audit_severity AS ENUM (
  'info',
  'warning',
  'error',
  'critical'
);

-- Create lease audit logs table
CREATE TABLE IF NOT EXISTS app_1fa2dc8566_lease_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Related Entity
  lease_id UUID REFERENCES app_1fa2dc8566_leases(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- 'lease', 'payment', 'maintenance', 'renewal', 'termination', 'document'
  entity_id UUID, -- ID of the specific entity
  
  -- Action Details
  action lease_audit_action NOT NULL,
  action_description TEXT NOT NULL,
  severity audit_severity NOT NULL DEFAULT 'info',
  
  -- User Information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_role TEXT, -- 'tenant', 'landlord', 'agent', 'admin', 'system'
  
  -- Session Information
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  operating_system TEXT,
  
  -- Location
  location_country TEXT,
  location_city TEXT,
  location_coordinates POINT,
  
  -- Changes (for update actions)
  old_values JSONB, -- Previous state
  new_values JSONB, -- New state
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Request Details
  request_method TEXT, -- 'GET', 'POST', 'PUT', 'DELETE'
  request_url TEXT,
  request_params JSONB,
  request_body JSONB,
  
  -- Response Details
  response_status INTEGER,
  response_time_ms INTEGER, -- Response time in milliseconds
  
  -- Error Information (if applicable)
  error_occurred BOOLEAN DEFAULT false,
  error_message TEXT,
  error_code TEXT,
  error_stack_trace TEXT,
  
  -- Business Context
  business_context TEXT, -- Description of what was happening
  affected_parties TEXT[], -- Array of user IDs affected by this action
  
  -- Compliance & Legal
  compliance_relevant BOOLEAN DEFAULT false,
  retention_period_days INTEGER DEFAULT 2555, -- 7 years default
  legal_hold BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[], -- For categorization and filtering
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Indexes will be created below
  CONSTRAINT valid_response_status CHECK (response_status IS NULL OR (response_status >= 100 AND response_status < 600))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS lease_audit_logs_lease_id_idx 
  ON app_1fa2dc8566_lease_audit_logs(lease_id) 
  WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_audit_logs_entity_idx 
  ON app_1fa2dc8566_lease_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS lease_audit_logs_action_idx 
  ON app_1fa2dc8566_lease_audit_logs(action);
CREATE INDEX IF NOT EXISTS lease_audit_logs_user_id_idx 
  ON app_1fa2dc8566_lease_audit_logs(user_id) 
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_audit_logs_created_at_idx 
  ON app_1fa2dc8566_lease_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS lease_audit_logs_severity_idx 
  ON app_1fa2dc8566_lease_audit_logs(severity) 
  WHERE severity IN ('error', 'critical');
CREATE INDEX IF NOT EXISTS lease_audit_logs_error_idx 
  ON app_1fa2dc8566_lease_audit_logs(error_occurred) 
  WHERE error_occurred = true;
CREATE INDEX IF NOT EXISTS lease_audit_logs_ip_address_idx 
  ON app_1fa2dc8566_lease_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS lease_audit_logs_session_idx 
  ON app_1fa2dc8566_lease_audit_logs(session_id) 
  WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lease_audit_logs_compliance_idx 
  ON app_1fa2dc8566_lease_audit_logs(compliance_relevant) 
  WHERE compliance_relevant = true;
CREATE INDEX IF NOT EXISTS lease_audit_logs_legal_hold_idx 
  ON app_1fa2dc8566_lease_audit_logs(legal_hold) 
  WHERE legal_hold = true;

-- Create GIN index for JSONB fields
CREATE INDEX IF NOT EXISTS lease_audit_logs_metadata_idx 
  ON app_1fa2dc8566_lease_audit_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS lease_audit_logs_old_values_idx 
  ON app_1fa2dc8566_lease_audit_logs USING GIN (old_values);
CREATE INDEX IF NOT EXISTS lease_audit_logs_new_values_idx 
  ON app_1fa2dc8566_lease_audit_logs USING GIN (new_values);

-- Create index for tags array
CREATE INDEX IF NOT EXISTS lease_audit_logs_tags_idx 
  ON app_1fa2dc8566_lease_audit_logs USING GIN (tags);

-- Enable RLS
ALTER TABLE app_1fa2dc8566_lease_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Landlords can view audit logs for their leases
CREATE POLICY "Landlords can view audit logs" 
  ON app_1fa2dc8566_lease_audit_logs
  FOR SELECT 
  USING (
    lease_id IS NULL
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND landlord_id = auth.uid()
    )
  );

-- Agents can view audit logs for assigned leases
CREATE POLICY "Agents can view audit logs" 
  ON app_1fa2dc8566_lease_audit_logs
  FOR SELECT 
  USING (
    lease_id IS NULL
    OR EXISTS (
      SELECT 1 FROM app_1fa2dc8566_leases 
      WHERE id = lease_id 
      AND agent_id = auth.uid()
    )
  );

-- Tenants can view limited audit logs for their leases
CREATE POLICY "Tenants can view their audit logs" 
  ON app_1fa2dc8566_lease_audit_logs
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR (
      lease_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM app_1fa2dc8566_leases 
        WHERE id = lease_id 
        AND auth.uid() = ANY(tenant_ids::uuid[])
      )
    )
  );

-- System can insert audit logs (service role only)
CREATE POLICY "Service role can insert audit logs" 
  ON app_1fa2dc8566_lease_audit_logs
  FOR INSERT 
  WITH CHECK (true);

-- Prevent updates and deletes (audit logs are immutable)
CREATE POLICY "Audit logs are immutable" 
  ON app_1fa2dc8566_lease_audit_logs
  FOR UPDATE 
  USING (false);

CREATE POLICY "Audit logs cannot be deleted" 
  ON app_1fa2dc8566_lease_audit_logs
  FOR DELETE 
  USING (false);

-- Create function to log lease actions
CREATE OR REPLACE FUNCTION log_lease_action(
  p_lease_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action lease_audit_action,
  p_description TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_user_email VARCHAR(255);
  v_user_name VARCHAR(255);
  v_changed_fields TEXT[];
BEGIN
  -- Get user information
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Calculate changed fields if old and new values provided
  IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM jsonb_each(p_new_values)
    WHERE value != COALESCE(p_old_values->key, 'null'::jsonb);
  END IF;
  
  -- Insert audit log
  INSERT INTO app_1fa2dc8566_lease_audit_logs (
    lease_id,
    entity_type,
    entity_id,
    action,
    action_description,
    user_id,
    user_email,
    user_role,
    old_values,
    new_values,
    changed_fields,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_lease_id,
    p_entity_type,
    p_entity_id,
    p_action,
    p_description,
    auth.uid(),
    v_user_email,
    current_setting('request.jwt.claims', true)::json->>'role',
    p_old_values,
    p_new_values,
    v_changed_fields,
    p_metadata,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old audit logs (respecting retention period)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM app_1fa2dc8566_lease_audit_logs
  WHERE 
    created_at < NOW() - INTERVAL '1 day' * retention_period_days
    AND legal_hold = false
    AND compliance_relevant = false;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get audit trail for a lease
CREATE OR REPLACE FUNCTION get_lease_audit_trail(
  p_lease_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  action lease_audit_action,
  description TEXT,
  user_email VARCHAR(255),
  user_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  changed_fields TEXT[],
  severity audit_severity
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.action,
    l.action_description,
    l.user_email,
    l.user_role,
    l.created_at,
    l.changed_fields,
    l.severity
  FROM app_1fa2dc8566_lease_audit_logs l
  WHERE l.lease_id = p_lease_id
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE app_1fa2dc8566_lease_audit_logs IS 'Comprehensive audit trail for all lease operations - immutable records';
COMMENT ON COLUMN app_1fa2dc8566_lease_audit_logs.entity_type IS 'Type of entity: lease, payment, maintenance, renewal, termination, document';
COMMENT ON COLUMN app_1fa2dc8566_lease_audit_logs.changed_fields IS 'Array of field names that were modified in update actions';
COMMENT ON COLUMN app_1fa2dc8566_lease_audit_logs.compliance_relevant IS 'Indicates if this log entry is relevant for compliance audits';
COMMENT ON COLUMN app_1fa2dc8566_lease_audit_logs.legal_hold IS 'Prevents deletion even after retention period expires';
COMMENT ON COLUMN app_1fa2dc8566_lease_audit_logs.retention_period_days IS 'Number of days to retain this log entry (default 7 years)';