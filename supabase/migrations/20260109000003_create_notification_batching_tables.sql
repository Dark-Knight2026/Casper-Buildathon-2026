-- Create notification_batching_preferences table
CREATE TABLE IF NOT EXISTS notification_batching_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  enabled BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  batch_time TEXT DEFAULT '09:00', -- HH:mm format
  batch_day INTEGER CHECK (batch_day >= 0 AND batch_day <= 6), -- 0 = Sunday, 6 = Saturday
  exclude_priorities TEXT[] DEFAULT ARRAY['urgent', 'high']::TEXT[],
  timezone TEXT DEFAULT 'America/Los_Angeles',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create notification_batch_queue table
CREATE TABLE IF NOT EXISTS notification_batch_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB,
  batch_id UUID, -- Removed forward reference to avoid dependency issues, or create tables in order
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notification_batches table
CREATE TABLE IF NOT EXISTS notification_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  notification_count INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  email_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add constraint after tables are created
DO $$ BEGIN
  ALTER TABLE notification_batch_queue ADD CONSTRAINT fk_batch 
  FOREIGN KEY (batch_id) REFERENCES notification_batches(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notification_batching_preferences_user_idx ON notification_batching_preferences(user_id);
CREATE INDEX IF NOT EXISTS notification_batching_preferences_enabled_idx ON notification_batching_preferences(enabled);

CREATE INDEX IF NOT EXISTS notification_batch_queue_user_idx ON notification_batch_queue(user_id);
CREATE INDEX IF NOT EXISTS notification_batch_queue_batch_idx ON notification_batch_queue(batch_id);
CREATE INDEX IF NOT EXISTS notification_batch_queue_created_idx ON notification_batch_queue(created_at);
CREATE INDEX IF NOT EXISTS notification_batch_queue_unbatched_idx ON notification_batch_queue(user_id, batch_id) WHERE batch_id IS NULL;

CREATE INDEX IF NOT EXISTS notification_batches_user_idx ON notification_batches(user_id);
CREATE INDEX IF NOT EXISTS notification_batches_status_idx ON notification_batches(status);
CREATE INDEX IF NOT EXISTS notification_batches_scheduled_idx ON notification_batches(scheduled_for);

-- Enable Row Level Security
ALTER TABLE notification_batching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batch_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own batching preferences"
  ON notification_batching_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batching preferences"
  ON notification_batching_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batching preferences"
  ON notification_batching_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own batch queue"
  ON notification_batch_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own batches"
  ON notification_batches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for notification_batching_preferences updated_at
CREATE OR REPLACE TRIGGER update_notification_batching_preferences_updated_at
  BEFORE UPDATE ON notification_batching_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default batching preferences for existing users
INSERT INTO notification_batching_preferences (user_id, enabled, frequency, batch_time, exclude_priorities, timezone)
SELECT 
  id,
  false,
  'daily',
  '09:00',
  ARRAY['urgent', 'high']::TEXT[],
  'America/Los_Angeles'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM notification_batching_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Function to clean up old batch queue items
CREATE OR REPLACE FUNCTION cleanup_old_batch_queue_items()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_batch_queue
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND batch_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old batches
CREATE OR REPLACE FUNCTION cleanup_old_batches()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_batches
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('sent', 'failed');
END;
$$ LANGUAGE plpgsql;