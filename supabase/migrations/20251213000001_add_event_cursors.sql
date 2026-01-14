-- Create event_cursors table for tracking blockchain event stream progress
CREATE TABLE IF NOT EXISTS event_cursors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_type TEXT UNIQUE NOT NULL, -- e.g., 'main', 'deploys'
  last_event_id BIGINT NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_cursors_stream_type ON event_cursors(stream_type);

-- Enable Row Level Security
ALTER TABLE event_cursors ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage cursors (or authenticated users if needed for client-side sync)
-- For backend sync service, we typically use service role key which bypasses RLS.
-- Adding a policy for authenticated users to view sync status if needed.
CREATE POLICY "Authenticated users can view event cursors" ON event_cursors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Comment
COMMENT ON TABLE event_cursors IS 'Tracks the last processed event ID from Casper Network event streams to ensure resiliency';