-- ============================================================
-- Migration: Create Signature Requests Table
-- Description: Manage e-signature workflows
-- Created: 2026-01-03
-- ============================================================

-- Create signature_requests table
CREATE TABLE IF NOT EXISTS signature_requests (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Request Details
  title VARCHAR(200) NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  document_url TEXT NOT NULL,
  
  -- Workflow
  workflow_type VARCHAR(50) DEFAULT 'sequential' CHECK (workflow_type IN ('sequential', 'parallel')),
  signers JSONB NOT NULL, -- Array of signer objects with details
  current_signer_index INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'partially_signed', 
    'completed', 'declined', 'expired', 'cancelled'
  )),
  
  -- Dates
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_frequency_days INTEGER DEFAULT 3,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  signed_document_url TEXT,
  certificate_url TEXT,
  
  -- Security
  require_authentication BOOLEAN DEFAULT true,
  require_geolocation BOOLEAN DEFAULT false,
  ip_restrictions TEXT[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_requests_lease_id ON signature_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_expires_at ON signature_requests(expires_at) 
  WHERE status IN ('pending', 'in_progress', 'partially_signed');
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_by ON signature_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_signature_requests_signers ON signature_requests USING gin(signers);

-- Comments
COMMENT ON TABLE signature_requests IS 'Manages e-signature workflows for lease documents';
COMMENT ON COLUMN signature_requests.signers IS 'JSONB array of signer objects: [{user_id, email, name, status, signed_at, signature_data, ip_address, geolocation}]';
COMMENT ON COLUMN signature_requests.workflow_type IS 'Sequential: signers sign in order; Parallel: all sign simultaneously';
COMMENT ON COLUMN signature_requests.current_signer_index IS 'Index of current signer in sequential workflow';