-- Rename event_cursors.last_event_id → cursor_value.
--
-- The column stored two semantically different things depending on the row:
--   - streaming rows: CSPR.cloud event_id (a monotonic integer assigned by the API)
--   - backfill rows:  block height of the last successfully processed block
--
-- The name "last_event_id" was accurate only for streaming. "cursor_value" is
-- intentionally generic and signals that the meaning is determined by stream_type.

ALTER TABLE event_cursors RENAME COLUMN last_event_id TO cursor_value;
