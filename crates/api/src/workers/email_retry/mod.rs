//! Retry-queue worker for transactional emails.
//!
//! Wakes on a 60-second tick to claim due rows from `email_send_retries`,
//! re-sends them through the bound [`EmailSender`], then marks each row
//! `completed`, `failed`, or reschedules with exponential backoff. A slower
//! second tick (one hour) deletes terminal rows older than [`RETENTION`] so the
//! table does not grow unbounded.
//!
//! Spawned by [`crate::server::main`] only when a real provider is wired in -
//! the worker is useless under `LoggingEmailSender`, which never returns a
//! transient error, so nothing would ever land in the queue.

pub mod db;

use core::time::Duration;
use std::sync::Arc;

use chrono::Utc;
use sqlx::{PgPool, Result as SqlxResult};
use tokio::{sync::broadcast, time};

use crate::{EmailError, EmailMessage, EmailSender};

/// Rows claimed per retry tick.
///
/// One slow upstream call should not be able to block delivery of every other
/// pending row, so the batch is bounded.
const CLAIM_LIMIT: i64 = 50;

/// Cadence at which due rows are claimed and re-sent.
const RETRY_TICK: Duration = Duration::from_secs(60);

/// Cadence at which terminal rows older than [`RETENTION`] are deleted.
const CLEANUP_TICK: Duration = Duration::from_secs(24 * 3600);

/// Rows in `completed` or `failed` status older than this are deleted by
/// the cleanup tick.
const RETENTION: Duration = Duration::from_secs(30 * 24 * 3600);

/// Hard-cap on delivery attempts. Past this, a [`EmailError::Transient`] is
/// promoted to terminal `failed` so a permanently-broken send (e.g. compromised
/// from-domain misclassified as Transient by the provider) cannot retry forever
/// and pollute operator dashboards.
const MAX_ATTEMPTS: i32 = 12;

/// Exponential backoff schedule indexed by `attempts - 1` (claim has already
/// incremented `attempts`, so a first failure looks up index 0). The last entry
/// saturates: any further attempts reuse the 24-hour gap rather than growing
/// past a day.
const BACKOFF_SECS: [u64; 6] = [
    60,    // 1m
    300,   // 5m
    1800,  // 30m
    7200,  // 2h
    43200, // 12h
    86400, // 24h
];

/// Runs the retry-queue worker until the shutdown broadcast resolves.
///
/// Two intervals share one `tokio::select!`: the fast retry tick (60s) drives
/// delivery, the slow cleanup tick (24h) keeps the table bounded. They are
/// independent on purpose - if one delivery batch runs long, the cleanup tick
/// still fires on its own schedule rather than slipping.
#[inline]
pub async fn run(
    pool: PgPool,
    mailer: Arc<dyn EmailSender>,
    mut shutdown_rx: broadcast::Receiver<()>,
) {
    let mut retry_tick = time::interval(RETRY_TICK);
    let mut cleanup_tick = time::interval(CLEANUP_TICK);
    // `tokio::time::interval` fires immediately on its first tick. The retry
    // tick wanting "run now" is correct (drain anything stranded from a
    // previous instance); the cleanup tick doing the same on startup is just
    // noise, so we discard its first tick.
    cleanup_tick.tick().await;

    tracing::info!("email_retry worker started");
    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                tracing::info!("email_retry worker shutting down");
                break;
            }
            _ = retry_tick.tick() => {
                if let Err(err) = process_retries(&pool, &mailer).await {
                    tracing::error!(?err, "email_retry tick failed");
                }
            }
            _ = cleanup_tick.tick() => {
                match db::cleanup_terminal_retries(&pool, RETENTION).await {
                    Ok(0) => {}
                    Ok(deleted) => tracing::info!(deleted, "email_retry cleanup"),
                    Err(err) => tracing::warn!(?err, "email_retry cleanup failed"),
                }
            }
        }
    }
}

/// Claims one batch of due rows and processes each through the mailer.
///
/// Per-row failures are logged but never abort the batch: one Postmark hiccup
/// must not strand the rest of the pending queue. Database failures propagate
/// (caller logs at error level for tick visibility).
///
/// Public so tests can drive a single tick without waiting on the 60s
/// `tokio::time::interval` inside [`run`]; the same entry point is convenient
/// for operational manual replays as well.
///
/// # Errors
///
/// Propagates `sqlx::Error` from the claim CTE; individual per-row delivery
/// failures are logged inside [`handle_row`] but do not abort the batch.
#[inline]
pub async fn process_retries(pool: &PgPool, mailer: &Arc<dyn EmailSender>) -> SqlxResult<()> {
    let batch = db::claim_pending_retries(pool, CLAIM_LIMIT).await?;
    for row in batch {
        handle_row(pool, mailer, row).await;
    }
    Ok(())
}

async fn handle_row(pool: &PgPool, mailer: &Arc<dyn EmailSender>, row: db::ClaimedRetry) {
    let id = row.id;
    let attempts = row.attempts;
    let message = EmailMessage {
        to: row.to_address,
        subject: row.subject,
        body: row.body,
    };

    match mailer.send(message).await {
        Ok(()) => {
            if let Err(err) = db::mark_completed(pool, id).await {
                tracing::warn!(?err, %id, "mark_completed failed");
            }
        }
        Err(EmailError::Permanent(reason)) => {
            let summary = format!("permanent: {reason}");
            if let Err(err) = db::mark_failed(pool, id, &summary).await {
                tracing::warn!(?err, %id, "mark_failed (permanent) failed");
            }
        }
        Err(EmailError::Transient(reason)) => {
            if attempts >= MAX_ATTEMPTS {
                let summary = format!("transient (max attempts): {reason}");
                if let Err(err) = db::mark_failed(pool, id, &summary).await {
                    tracing::warn!(?err, %id, "mark_failed (max attempts) failed");
                }
                return;
            }
            let backoff_index = usize::try_from(attempts)
                .unwrap_or(0)
                .saturating_sub(1)
                .min(BACKOFF_SECS.len() - 1);
            let delay = chrono::Duration::seconds(BACKOFF_SECS[backoff_index].cast_signed());
            let next_retry_at = Utc::now() + delay;
            let summary = format!("transient: {reason}");
            if let Err(err) = db::mark_transient_failure(pool, id, next_retry_at, &summary).await {
                tracing::warn!(?err, %id, "mark_transient_failure failed");
            }
        }
    }
}
