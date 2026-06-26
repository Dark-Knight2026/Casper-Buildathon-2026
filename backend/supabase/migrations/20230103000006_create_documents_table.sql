-- ============================================================
-- Migration: Create Documents Table
-- Description: Store document metadata (files stored in Supabase Storage)
-- Created: 2026-01-03
-- ============================================================

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Document Type
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'lease_agreement', 'amendment', 'addendum', 'notice', 
    'inspection_report', 'maintenance_record', 'receipt', 
    'tax_document', 'insurance', 'photo', 'other'
  )),
  category VARCHAR(50),
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_extension VARCHAR(10),
  
  -- Document Details
  title VARCHAR(200),
  description TEXT,
  tags TEXT[],
  
  -- Version Control
  version INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  is_latest_version BOOLEAN DEFAULT true,
  
  -- Access Control
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'shared')),
  shared_with UUID[], -- Array of user IDs who have access
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  uploaded_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accessed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON documents(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_shared_with ON documents USING gin(shared_with) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(parent_document_id, version) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE documents IS 'Stores document metadata; actual files stored in Supabase Storage';
COMMENT ON COLUMN documents.file_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN documents.shared_with IS 'Array of user IDs who have access to this document';
COMMENT ON COLUMN documents.version IS 'Document version number for version control';
COMMENT ON COLUMN documents.parent_document_id IS 'Reference to parent document for versioning';