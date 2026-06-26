-- Persistent failure queue for transactional emails (Postmark MVP).
--
-- Design notes:
-- * Postgres-as-queue (not Redis): after `INSERT ... RETURNING id` commits,
--   we are guaranteed the row is on WAL-backed disk. Loss of an enqueued
--   email would be silent (the user already got a 200 OK from the
--   triggering endpoint), so durability is the requirement, not throughput.
--   Expected load is well under 1000 rows/day - SKIP LOCKED claiming on a
--   partial index is more than sufficient.
-- * Explicit `status` column rather than overloading `completed_at`: a NULL
--   `completed_at` semantically meant both "in flight" and "permanently
--   abandoned" in an earlier draft, which made deliverability analytics
--   ambiguous. With `status IN ('pending', 'completed', 'failed')` the
--   intent is local to the row.
-- * Partial index on `(next_retry_at) WHERE status = 'pending'` is the
--   worker's hot path. Completed and failed rows stay in the heap but
--   never bloat the index, so the worker's tick stays fast even after the
--   table accumulates millions of historical rows.
-- * Body stored verbatim (not a payload_json reference) because the MVP
--   `EmailMessage` is plain text and there is no template engine yet. If a
--   payload schema appears, it gets a new column - the existing rows stay
--   readable.

CREATE TABLE IF NOT EXISTS email_send_retries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Message payload (re-sent verbatim by the worker)
    to_address TEXT NOT NULL,
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,

    -- Retry state
    attempts      INT                      NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_error    TEXT,

    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Worker hot path: claim due rows in `next_retry_at` order. Partial on
-- `status = 'pending'` so completed/failed rows do not enter the index.
CREATE INDEX IF NOT EXISTS idx_email_send_retries_pending
    ON email_send_retries (next_retry_at)
    WHERE status = 'pending';

COMMENT ON TABLE email_send_retries IS
    'Persistent retry queue for transactional emails; one row per enqueued send, claimed by the background worker.';
COMMENT ON COLUMN email_send_retries.to_address IS
    'Recipient address as it will be passed to the mailer; validated at the call site, trusted here.';
COMMENT ON COLUMN email_send_retries.attempts IS
    'Number of completed delivery attempts. Worker increments before re-enqueueing on Transient failure; hitting MAX_ATTEMPTS marks the row failed.';
COMMENT ON COLUMN email_send_retries.next_retry_at IS
    'Earliest moment the worker may re-attempt delivery. Defaults to NOW() so freshly enqueued rows are eligible immediately.';
COMMENT ON COLUMN email_send_retries.last_error IS
    'Operator-only diagnostic text from the last Transient/Permanent failure; never surfaced to API clients.';
COMMENT ON COLUMN email_send_retries.status IS
    'Lifecycle state: pending (worker-eligible), completed (delivered), failed (terminal: Permanent or attempts exhausted).';
COMMENT ON COLUMN email_send_retries.completed_at IS
    'Set when status transitions out of pending; NULL while pending. Together with status drives retention cleanup.';
