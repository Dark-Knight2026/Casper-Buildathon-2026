-- Phase 1: Core Tables Migration
-- Creates essential tables for lease management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(255) UNIQUE,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1 CHECK (version > 0),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Create signature_requests table
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID NOT NULL,
  document_url TEXT NOT NULL,
  workflow_type VARCHAR(50) DEFAULT 'sequential',
  signers JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_lease_id ON documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_signature_requests_lease_id ON signature_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at ON signature_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_lease_id ON messages(lease_id) WHERE lease_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT
  USING (
    tenant_id = auth.uid() OR
    lease_id IN (
      SELECT id FROM leases WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can insert their own payments" ON payments
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Landlords can view payments for their leases" ON payments
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE landlord_id = auth.uid()
    )
  );

-- RLS Policies for documents
CREATE POLICY "Landlords can view documents for their leases" ON documents
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view documents for their leases" ON documents
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE auth.uid() = ANY(tenant_ids)
    )
  );

CREATE POLICY "Authenticated users can upload documents" ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Document owners can update their documents" ON documents
  FOR UPDATE
  USING (uploaded_by = auth.uid());

-- RLS Policies for signature_requests
CREATE POLICY "Users can view signature requests for their leases" ON signature_requests
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases 
      WHERE landlord_id = auth.uid() 
         OR auth.uid() = ANY(tenant_ids)
    )
  );

CREATE POLICY "Lease creators can create signature requests" ON signature_requests
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can mark messages as read" ON messages
  FOR UPDATE
  USING (recipient_id = auth.uid());

-- RLS Policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to payments
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on tables
COMMENT ON TABLE payments IS 'Stores payment transactions for leases';
COMMENT ON TABLE documents IS 'Stores document metadata for lease-related files';
COMMENT ON TABLE signature_requests IS 'Tracks electronic signature workflows';
COMMENT ON TABLE messages IS 'Stores messages between users';
COMMENT ON TABLE audit_logs IS 'Tracks all user actions for compliance and security';