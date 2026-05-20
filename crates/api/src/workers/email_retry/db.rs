//! Database operations for the email retry-queue worker.
//!
//! All SQL touching `email_send_retries` lives here; the worker module
//! holds tokio plumbing and policy (backoff, max-attempts) but never
//! inlines queries (rust.md rule).

use core::time::Duration;

use chrono::{DateTime, Utc};
use sqlx::{Error, PgPool};
use uuid::Uuid;

/// Row returned by [`claim_pending_retries`].
///
/// `attempts` is the value **after** the claim-time increment - i.e. the
/// counter as it stands for the upcoming delivery attempt. The worker
/// compares this against `MAX_ATTEMPTS` to decide between reschedule and
/// terminal failure without an extra round-trip.
#[derive(Debug)]
pub struct ClaimedRetry {
    /// Row identifier; passed back to `mark_*` helpers after delivery.
    pub id: Uuid,
    /// Recipient address as enqueued by the original sender.
    pub to_address: String,
    /// Subject line, re-sent verbatim.
    pub subject: String,
    /// Plain-text body, re-sent verbatim.
    pub body: String,
    /// Delivery-attempt counter after the claim-time increment.
    pub attempts: i32,
}

/// Atomically claims due rows: SELECT eligible ids under
/// `FOR UPDATE SKIP LOCKED`, bump `attempts`, RETURN the payload.
///
/// One CTE-statement rather than two-step `SELECT FOR UPDATE` + separate
/// `UPDATE`. Row locks acquired by `SELECT FOR UPDATE` live only inside a
/// transaction, and we run this as a single auto-committed statement -
/// splitting it would release locks between the SELECT and UPDATE, so a
/// second worker could grab the same row. `SKIP LOCKED` lets concurrent
/// workers carve disjoint batches without blocking each other.
///
/// FIFO is best-effort: `ORDER BY next_retry_at` defines the lock-attempt
/// order, but `SKIP LOCKED` does not preserve a global queue position
/// across workers. Acceptable for verification emails; not suitable for
/// strict-ordering use cases.
///
/// # Errors
///
/// Propagates `sqlx::Error` from the database (connection, query, decode).
#[inline]
pub async fn claim_pending_retries(pool: &PgPool, limit: i64) -> Result<Vec<ClaimedRetry>, Error> {
    sqlx::query_as!(
        ClaimedRetry,
        r"
            WITH claimed AS (
                SELECT id
                FROM email_send_retries
                WHERE status = 'pending' AND next_retry_at <= NOW()
                ORDER BY next_retry_at
                FOR UPDATE SKIP LOCKED
                LIMIT $1
            )
            UPDATE email_send_retries r
            SET attempts = r.attempts + 1
            FROM claimed c
            WHERE r.id = c.id
            RETURNING r.id, r.to_address, r.subject, r.body, r.attempts
        ",
        limit,
    )
    .fetch_all(pool)
    .await
}

/// Marks a claimed row as successfully delivered.
///
/// # Errors
///
/// Propagates `sqlx::Error` from the database (connection, query).
#[inline]
pub async fn mark_completed(pool: &PgPool, id: Uuid) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE email_send_retries
            SET status = 'completed', completed_at = NOW()
            WHERE id = $1
        ",
        id,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Marks a claimed row as terminal (Permanent error or max-attempts hit).
///
/// `status = 'failed'` keeps the row out of future claim-CTE matches and
/// records `last_error` for operators inspecting deliverability.
///
/// # Errors
///
/// Propagates `sqlx::Error` from the database (connection, query).
#[inline]
pub async fn mark_failed(pool: &PgPool, id: Uuid, reason: &str) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE email_send_retries
            SET status = 'failed', completed_at = NOW(), last_error = $2
            WHERE id = $1
        ",
        id,
        reason,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Reschedules a transient failure for a later retry tick.
///
/// `attempts` was already incremented at claim time, so this only writes
/// `next_retry_at` (caller computes from the backoff schedule) and
/// `last_error`. `status` stays `pending`, so the next claim-tick that
/// runs after `next_retry_at` will pick the row up again.
///
/// # Errors
///
/// Propagates `sqlx::Error` from the database (connection, query).
#[inline]
pub async fn mark_transient_failure(
    pool: &PgPool,
    id: Uuid,
    next_retry_at: DateTime<Utc>,
    reason: &str,
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE email_send_retries
            SET next_retry_at = $2, last_error = $3
            WHERE id = $1
        ",
        id,
        next_retry_at,
        reason,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Hard-deletes terminal rows older than `older_than`.
///
/// Returns the number of rows deleted. Terminal rows have no business
/// value past the retention window; soft-delete would just grow the
/// partial index without making the analytics any richer.
///
/// # Errors
///
/// Propagates `sqlx::Error` from the database (connection, query).
#[inline]
pub async fn cleanup_terminal_retries(pool: &PgPool, older_than: Duration) -> Result<u64, Error> {
    let older_than_secs = older_than.as_secs_f64();
    let result = sqlx::query!(
        r"
            DELETE FROM email_send_retries
            WHERE status IN ('completed', 'failed')
              AND completed_at < NOW() - ($1 * INTERVAL '1 second')
        ",
        older_than_secs,
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}
