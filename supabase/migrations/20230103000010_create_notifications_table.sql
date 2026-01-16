-- ============================================================
-- Migration: Create Notifications Table
-- Description: System notifications and alerts
-- Created: 2026-01-03
-- ============================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Details
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'lease_expiring', 'payment_due', 'payment_received', 'payment_failed',
    'maintenance_request', 'maintenance_completed', 'message_received',
    'signature_required', 'document_uploaded', 'lease_renewed',
    'system_announcement', 'other'
  )),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Related Resources
  related_resource_type VARCHAR(50),
  related_resource_id UUID,
  
  -- Action
  action_url TEXT,
  action_label VARCHAR(100),
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery
  delivery_channels TEXT[] DEFAULT ARRAY['app'], -- app, email, sms
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority) WHERE deleted_at IS NULL;

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) 
  WHERE is_read = false AND deleted_at IS NULL;

-- Comments
COMMENT ON TABLE notifications IS 'System notifications and alerts for users';
COMMENT ON COLUMN notifications.delivery_channels IS 'Array of channels to deliver notification (app, email, sms)';
COMMENT ON COLUMN notifications.related_resource_type IS 'Type of related resource (lease, payment, etc.)';
COMMENT ON COLUMN notifications.related_resource_id IS 'ID of related resource';