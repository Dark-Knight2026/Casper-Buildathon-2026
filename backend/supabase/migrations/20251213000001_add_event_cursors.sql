-- Create event_cursors table for tracking blockchain event stream progress.
--
-- `stream_type` distinguishes the streaming vs backfill client.
-- `contract_hash` scopes the backfill cursor to a specific contract package hash.
-- For the streaming client (global cursor) `contract_hash` is always ''.
-- The composite UNIQUE (stream_type, contract_hash) allows one cursor row per
-- (client, contract) pair.
CREATE TABLE IF NOT EXISTS event_cursors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_type   TEXT   NOT NULL,          -- 'streaming' | 'backfill'
  contract_hash TEXT   NOT NULL DEFAULT '',-- '' for the streaming cursor
  last_event_id BIGINT NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (stream_type, contract_hash)
);

-- Create index for faster lookups by (stream_type, contract_hash).
CREATE INDEX IF NOT EXISTS idx_event_cursors_stream_type ON event_cursors(stream_type, contract_hash);

-- Enable Row Level Security
ALTER TABLE event_cursors ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage cursors (or authenticated users if needed for client-side sync)
-- For backend sync service, we typically use service role key which bypasses RLS.
-- Adding a policy for authenticated users to view sync status if needed.
CREATE POLICY "Authenticated users can view event cursors" ON event_cursors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Comment
COMMENT ON TABLE event_cursors IS 'Tracks the last processed event ID from Casper Network event streams to ensure resiliency';