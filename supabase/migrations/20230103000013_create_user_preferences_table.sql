-- ============================================================
-- Migration: Create User Preferences Table
-- Description: Store user-specific settings and preferences
-- Created: 2026-01-03
-- ============================================================

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  -- Primary Key
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  
  -- Notification Types
  notify_payment_due BOOLEAN DEFAULT true,
  notify_payment_received BOOLEAN DEFAULT true,
  notify_lease_expiring BOOLEAN DEFAULT true,
  notify_maintenance_updates BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  notify_documents BOOLEAN DEFAULT true,
  
  -- Display Preferences
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Dashboard Preferences
  dashboard_layout JSONB DEFAULT '{}'::jsonb,
  default_view VARCHAR(50),
  
  -- Privacy
  profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'contacts_only')),
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE user_preferences IS 'Stores user-specific settings and preferences';
COMMENT ON COLUMN user_preferences.dashboard_layout IS 'JSONB object storing dashboard widget layout';
COMMENT ON COLUMN user_preferences.timezone IS 'User preferred timezone';