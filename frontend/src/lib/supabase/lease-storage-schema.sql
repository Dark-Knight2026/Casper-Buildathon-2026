-- ============================================================================
-- Lease Document Storage System - Supabase Schema
-- ============================================================================
-- Version: 1.0
-- Created: December 13, 2025
-- Purpose: Secure document storage with version control and audit trail
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Storage Buckets
-- ============================================================================

-- Create storage buckets for lease documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lease-documents', 'lease-documents', false, 52428800, ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]),
  ('lease-drafts', 'lease-drafts', false, 52428800, ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]),
  ('lease-amendments', 'lease-amendments', false, 52428800, ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('lease-backups', 'lease-backups', false, 104857600, ARRAY[
    'application/zip',
    'application/x-tar',
    'application/gzip'
  ])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE document_type AS ENUM (
  'lease_agreement',
  'amendment',
  'addendum',
  'signature_certificate',
  'attachment',
  'inspection_report',
  'maintenance_record',
  'payment_receipt',
  'notice',
  'other'
);

CREATE TYPE document_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'signed',
  'archived',
  'deleted'
);

CREATE TYPE audit_action AS ENUM (
  'upload',
  'download',
  'view',
  'edit',
  'delete',
  'share',
  'unshare',
  'sign',
  'approve',
  'reject',
  'archive',
  'restore',
  'version_create',
  'version_rollback'
);

CREATE TYPE share_permission AS ENUM (
  'view',
  'download',
  'edit'
);

-- ============================================================================
-- Main Tables
-- ============================================================================

-- Lease Documents Table
CREATE TABLE IF NOT EXISTS lease_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL,
  
  -- Document Info
  document_type document_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- Version Control
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current_version BOOLEAN NOT NULL DEFAULT true,
  parent_document_id UUID REFERENCES lease_documents(id),
  
  -- Status
  status document_status NOT NULL DEFAULT 'draft',
  
  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  -- Signature Info
  is_signed BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_request_id UUID,
  
  -- Security
  checksum VARCHAR(64), -- SHA-256 hash
  encryption_key_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Archival
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT,
  
  CONSTRAINT valid_version_number CHECK (version_number > 0),
  CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES lease_documents(id) ON DELETE CASCADE,
  
  -- Version Info
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  checksum VARCHAR(64),
  
  -- Changes
  change_summary TEXT,
  changes JSONB DEFAULT '[]', -- Array of change objects
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  CONSTRAINT unique_document_version UNIQUE (document_id, version_number),
  CONSTRAINT valid_version_number CHECK (version_number > 0)
);

-- Document Audit Log Table
CREATE TABLE IF NOT EXISTS document_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES lease_documents(id) ON DELETE CASCADE,
  
  -- Action Info
  action audit_action NOT NULL,
  action_details TEXT,
  
  -- User Info
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  
  -- Session Info
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  
  -- Context
  version_number INTEGER,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes will be created below
  CONSTRAINT valid_action CHECK (action IS NOT NULL)
);

-- Document Shares Table
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES lease_documents(id) ON DELETE CASCADE,
  
  -- Share Info
  share_token VARCHAR(64) NOT NULL UNIQUE,
  share_url TEXT NOT NULL,
  
  -- Permissions
  permission share_permission NOT NULL DEFAULT 'view',
  
  -- Security
  password_hash VARCHAR(255),
  requires_authentication BOOLEAN NOT NULL DEFAULT false,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  
  -- Recipients
  shared_with_email VARCHAR(255),
  shared_with_user_id UUID REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER NOT NULL DEFAULT 0,
  
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at),
  CONSTRAINT valid_max_downloads CHECK (max_downloads IS NULL OR max_downloads > 0)
);

-- Document Backups Table
CREATE TABLE IF NOT EXISTS document_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Backup Info
  backup_name VARCHAR(255) NOT NULL,
  backup_path TEXT NOT NULL,
  backup_size BIGINT NOT NULL,
  
  -- Content
  document_count INTEGER NOT NULL,
  lease_ids UUID[],
  
  -- Type
  backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Retention
  expires_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_document_count CHECK (document_count >= 0)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Lease Documents Indexes
CREATE INDEX IF NOT EXISTS idx_lease_documents_lease_id ON lease_documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_type ON lease_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_lease_documents_status ON lease_documents(status);
CREATE INDEX IF NOT EXISTS idx_lease_documents_created_by ON lease_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_lease_documents_created_at ON lease_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lease_documents_current_version ON lease_documents(is_current_version) WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_lease_documents_parent ON lease_documents(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_documents_deleted ON lease_documents(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_documents_archived ON lease_documents(archived_at) WHERE archived_at IS NOT NULL;

-- Document Versions Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

-- Document Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON document_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON document_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON document_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON document_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_ip_address ON document_audit_log(ip_address);

-- Document Shares Indexes
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_token ON document_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_document_shares_created_by ON document_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_document_shares_active ON document_shares(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_document_shares_expires ON document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Document Backups Indexes
CREATE INDEX IF NOT EXISTS idx_document_backups_created_at ON document_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_backups_status ON document_backups(status);
CREATE INDEX IF NOT EXISTS idx_document_backups_expires ON document_backups(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_backups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Lease Documents Policies
-- ============================================================================

-- Policy: Users can view documents they created or have access to
CREATE POLICY "Users can view their own documents"
  ON lease_documents FOR SELECT
  USING (
    auth.uid() = created_by
    OR auth.uid() IN (
      SELECT landlord_id FROM leases WHERE id = lease_id
      UNION
      SELECT unnest(tenant_ids) FROM leases WHERE id = lease_id
      UNION
      SELECT agent_id FROM leases WHERE id = lease_id AND agent_id IS NOT NULL
    )
  );

-- Policy: Users can insert documents for leases they own
CREATE POLICY "Users can create documents for their leases"
  ON lease_documents FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT landlord_id FROM leases WHERE id = lease_id
      UNION
      SELECT agent_id FROM leases WHERE id = lease_id AND agent_id IS NOT NULL
    )
  );

-- Policy: Users can update documents they created
CREATE POLICY "Users can update their own documents"
  ON lease_documents FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can soft delete documents they created
CREATE POLICY "Users can delete their own documents"
  ON lease_documents FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- Document Versions Policies
-- ============================================================================

-- Policy: Users can view versions of documents they have access to
CREATE POLICY "Users can view document versions"
  ON document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lease_documents
      WHERE id = document_versions.document_id
      AND (
        auth.uid() = created_by
        OR auth.uid() IN (
          SELECT landlord_id FROM leases WHERE id = lease_id
          UNION
          SELECT unnest(tenant_ids) FROM leases WHERE id = lease_id
          UNION
          SELECT agent_id FROM leases WHERE id = lease_id AND agent_id IS NOT NULL
        )
      )
    )
  );

-- Policy: Users can create versions for documents they own
CREATE POLICY "Users can create document versions"
  ON document_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lease_documents
      WHERE id = document_versions.document_id
      AND auth.uid() = created_by
    )
  );

-- ============================================================================
-- Document Audit Log Policies
-- ============================================================================

-- Policy: Users can view audit logs for documents they have access to
CREATE POLICY "Users can view audit logs"
  ON document_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lease_documents
      WHERE id = document_audit_log.document_id
      AND (
        auth.uid() = created_by
        OR auth.uid() IN (
          SELECT landlord_id FROM leases WHERE id = lease_id
          UNION
          SELECT unnest(tenant_ids) FROM leases WHERE id = lease_id
          UNION
          SELECT agent_id FROM leases WHERE id = lease_id AND agent_id IS NOT NULL
        )
      )
    )
  );

-- Policy: System can insert audit logs (service role)
CREATE POLICY "Service role can insert audit logs"
  ON document_audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Document Shares Policies
-- ============================================================================

-- Policy: Users can view shares they created
CREATE POLICY "Users can view their shares"
  ON document_shares FOR SELECT
  USING (
    auth.uid() = created_by
    OR auth.uid() = shared_with_user_id
    OR EXISTS (
      SELECT 1 FROM lease_documents
      WHERE id = document_shares.document_id
      AND (
        auth.uid() = created_by
        OR auth.uid() IN (
          SELECT landlord_id FROM leases WHERE id = lease_id
          UNION
          SELECT unnest(tenant_ids) FROM leases WHERE id = lease_id
        )
      )
    )
  );

-- Policy: Users can create shares for documents they own
CREATE POLICY "Users can create shares"
  ON document_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lease_documents
      WHERE id = document_shares.document_id
      AND auth.uid() = created_by
    )
  );

-- Policy: Users can update shares they created
CREATE POLICY "Users can update their shares"
  ON document_shares FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete their shares"
  ON document_shares FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- Document Backups Policies
-- ============================================================================

-- Policy: Only admins can view backups (implement role check)
CREATE POLICY "Admins can view backups"
  ON document_backups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy: Only admins can create backups
CREATE POLICY "Admins can create backups"
  ON document_backups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- Storage Policies
-- ============================================================================

-- Policy: Users can upload to lease-documents bucket
CREATE POLICY "Users can upload lease documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lease-documents'
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can view documents they have access to
CREATE POLICY "Users can view lease documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lease-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM lease_documents
        WHERE file_path = name
        AND (
          auth.uid() = created_by
          OR auth.uid() IN (
            SELECT landlord_id FROM leases WHERE id = lease_id
            UNION
            SELECT unnest(tenant_ids) FROM leases WHERE id = lease_id
            UNION
            SELECT agent_id FROM leases WHERE id = lease_id AND agent_id IS NOT NULL
          )
        )
      )
    )
  );

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their lease documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'lease-documents'
    AND EXISTS (
      SELECT 1 FROM lease_documents
      WHERE file_path = name
      AND auth.uid() = created_by
    )
  );

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their lease documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lease-documents'
    AND EXISTS (
      SELECT 1 FROM lease_documents
      WHERE file_path = name
      AND auth.uid() = created_by
    )
  );

-- Similar policies for other buckets
CREATE POLICY "Users can upload lease drafts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lease-drafts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view lease drafts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lease-drafts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload lease amendments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lease-amendments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view lease amendments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lease-amendments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin-only backup policies
CREATE POLICY "Admins can upload backups"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lease-backups'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view backups"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lease-backups'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on lease_documents
CREATE TRIGGER update_lease_documents_updated_at
  BEFORE UPDATE ON lease_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log_entry(
  p_document_id UUID,
  p_action audit_action,
  p_action_details TEXT DEFAULT NULL,
  p_version_number INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_user_email VARCHAR(255);
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Insert audit log
  INSERT INTO document_audit_log (
    document_id,
    action,
    action_details,
    user_id,
    user_email,
    version_number,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_document_id,
    p_action,
    p_action_details,
    auth.uid(),
    v_user_email,
    p_version_number,
    p_metadata,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if share is valid
CREATE OR REPLACE FUNCTION is_share_valid(p_share_token VARCHAR(64))
RETURNS BOOLEAN AS $$
DECLARE
  v_share RECORD;
BEGIN
  SELECT * INTO v_share
  FROM document_shares
  WHERE share_token = p_share_token
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
  AND (max_downloads IS NULL OR download_count < max_downloads);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment share access count
CREATE OR REPLACE FUNCTION increment_share_access(p_share_token VARCHAR(64))
RETURNS VOID AS $$
BEGIN
  UPDATE document_shares
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE share_token = p_share_token;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment share download count
CREATE OR REPLACE FUNCTION increment_share_download(p_share_token VARCHAR(64))
RETURNS VOID AS $$
BEGIN
  UPDATE document_shares
  SET 
    download_count = download_count + 1,
    last_accessed_at = NOW()
  WHERE share_token = p_share_token;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old documents
CREATE OR REPLACE FUNCTION archive_old_documents(p_days_old INTEGER DEFAULT 2555)
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  UPDATE lease_documents
  SET 
    archived_at = NOW(),
    archived_by = auth.uid(),
    archive_reason = 'Automatic archival - older than ' || p_days_old || ' days'
  WHERE created_at < NOW() - INTERVAL '1 day' * p_days_old
  AND archived_at IS NULL
  AND deleted_at IS NULL;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  v_cleaned_count INTEGER;
BEGIN
  UPDATE document_shares
  SET is_active = false
  WHERE is_active = true
  AND (
    (expires_at IS NOT NULL AND expires_at < NOW())
    OR (max_downloads IS NOT NULL AND download_count >= max_downloads)
  );

  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Scheduled Jobs (using pg_cron if available)
-- ============================================================================

-- Note: These require pg_cron extension
-- Uncomment if pg_cron is available

-- -- Clean up expired shares daily
-- SELECT cron.schedule(
--   'cleanup-expired-shares',
--   '0 2 * * *', -- Run at 2 AM daily
--   $$ SELECT cleanup_expired_shares(); $$
-- );

-- -- Archive old documents (7 years)
-- SELECT cron.schedule(
--   'archive-old-documents',
--   '0 3 1 * *', -- Run at 3 AM on 1st of each month
--   $$ SELECT archive_old_documents(2555); $$
-- );

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Create admin role table if not exists
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE lease_documents IS 'Stores metadata for all lease-related documents';
COMMENT ON TABLE document_versions IS 'Tracks version history for documents';
COMMENT ON TABLE document_audit_log IS 'Audit trail for all document operations';
COMMENT ON TABLE document_shares IS 'Secure document sharing with expiration and access control';
COMMENT ON TABLE document_backups IS 'Backup metadata for disaster recovery';

COMMENT ON COLUMN lease_documents.checksum IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN lease_documents.is_current_version IS 'Indicates if this is the latest version';
COMMENT ON COLUMN document_shares.share_token IS 'Unique token for secure document access';
COMMENT ON COLUMN document_audit_log.ip_address IS 'IP address of the user performing the action';

-- ============================================================================
-- End of Schema
-- ============================================================================