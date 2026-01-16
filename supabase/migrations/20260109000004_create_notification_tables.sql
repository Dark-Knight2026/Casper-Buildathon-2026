-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  channels JSONB DEFAULT '{"in_app": true, "email": false, "sms": false, "push": false}'::jsonb,
  priority_thresholds JSONB DEFAULT '{"email": "high", "sms": "urgent"}'::jsonb,
  quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00", "timezone": "America/Los_Angeles"}'::jsonb,
  email_address TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS notification_preferences_user_idx ON notification_preferences(user_id);

-- Create notification_delivery_log table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  message_id TEXT,
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS notification_delivery_log_channel_idx ON notification_delivery_log(channel);
CREATE INDEX IF NOT EXISTS notification_delivery_log_status_idx ON notification_delivery_log(status);
CREATE INDEX IF NOT EXISTS notification_delivery_log_sent_at_idx ON notification_delivery_log(sent_at);
CREATE INDEX IF NOT EXISTS notification_delivery_log_recipient_idx ON notification_delivery_log(recipient);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for notification_delivery_log (read-only for users, write for service role)
CREATE POLICY "Users can view their own notification delivery logs"
  ON notification_delivery_log FOR SELECT
  TO authenticated
  USING (
    recipient = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR recipient = (SELECT phone FROM auth.users WHERE id = auth.uid())
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default preferences for existing users
INSERT INTO notification_preferences (user_id, channels, priority_thresholds, quiet_hours)
SELECT 
  id,
  '{"in_app": true, "email": false, "sms": false, "push": false}'::jsonb,
  '{"email": "high", "sms": "urgent"}'::jsonb,
  '{"enabled": false, "start": "22:00", "end": "08:00", "timezone": "America/Los_Angeles"}'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;