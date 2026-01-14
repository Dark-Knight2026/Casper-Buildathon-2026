-- ============================================================
-- Migration: Create Messages Table
-- Description: Internal messaging between users
-- Created: 2026-01-03
-- ============================================================

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  
  -- Thread
  thread_id UUID,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Message Content
  subject VARCHAR(200),
  body TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'direct' CHECK (message_type IN (
    'direct', 'lease_related', 'maintenance', 'payment', 'system'
  )),
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_lease_id ON messages(lease_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(recipient_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC) WHERE deleted_at IS NULL;

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages(recipient_id, created_at DESC) 
  WHERE is_read = false AND deleted_at IS NULL;

-- Partial index for unread messages
CREATE INDEX IF NOT EXISTS idx_unread_messages ON messages(recipient_id, created_at DESC) 
  WHERE is_read = false AND deleted_at IS NULL;

-- Comments
COMMENT ON TABLE messages IS 'Internal messaging system between users';
COMMENT ON COLUMN messages.thread_id IS 'Groups related messages together';
COMMENT ON COLUMN messages.attachments IS 'Array of document IDs or file URLs';
COMMENT ON COLUMN messages.parent_message_id IS 'Reference to parent message for threading';