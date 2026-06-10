//! Integration tests for the email retry-queue *worker* loop.
//!
//! Complements `email_retry.rs` (which covers the db-layer helpers in
//! isolation) by driving the worker's tick + run-loop end-to-end through a mock
//! mailer. Each test calls `process_retries` directly so we can advance the
//! queue one tick at a time without waiting on the 60-second
//! `tokio::time::interval` baked into `run`. The single test that does need the
//! full loop (`run_exits_on_shutdown_signal`) spawns `run` against a
//! `broadcast::Sender<()>` and asserts a graceful exit.

#![cfg(feature = "integration")]

mod common;

use core::time::Duration;
use std::{collections::VecDeque, sync::Arc};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use tokio::{
    sync::{Mutex, broadcast},
    time,
};
use uuid::Uuid;

use api::{
    providers::{EmailError, EmailMessage, EmailSender},
    workers::email_retry,
};
use common::{PermanentMailer, TransientMailer};

/// Mailer that always reports successful delivery.
#[derive(Debug, Default)]
struct OkMailer;

#[async_trait]
impl EmailSender for OkMailer {
    #[inline]
    async fn send(&self, _message: EmailMessage) -> Result<(), EmailError> {
        Ok(())
    }
}

/// Mailer with a programmable outcome sequence. `send` pops the next programmed
/// result; running out of programmed outcomes panics so a miscounted test fails
/// loudly rather than silently looping.
#[derive(Debug)]
struct SequencedMailer {
    outcomes: Mutex<VecDeque<Result<(), EmailError>>>,
}

impl SequencedMailer {
    fn new(outcomes: Vec<Result<(), EmailError>>) -> Self {
        Self {
            outcomes: Mutex::new(outcomes.into()),
        }
    }
}

#[async_trait]
impl EmailSender for SequencedMailer {
    // `tokio::sync::Mutex` only to stay in the async idiom: the guard never
    // crosses an `.await`. `pop_front` is synchronous and the guard is dropped
    // at the end of this expression, so the lock is held for a single
    // non-suspending pop - a `std::sync::Mutex` would be equally correct here.
    async fn send(&self, _message: EmailMessage) -> Result<(), EmailError> {
        self.outcomes
            .lock()
            .await
            .pop_front()
            .expect("send() called more times than programmed outcomes")
    }
}

/// Resets `next_retry_at` to `NOW()` so the next tick will claim the row. The
/// worker's backoff math is asserted separately - here we use this purely to
/// drive multi-tick paths without waiting on real time.
async fn force_due_now(pool: &PgPool, id: Uuid) {
    sqlx::query(
        r"
            UPDATE email_send_retries
            SET next_retry_at = NOW()
            WHERE id = $1
        ",
    )
    .bind(id)
    .execute(pool)
    .await
    .expect("force row due now");
}

/// Wraps a sender in `Arc<dyn EmailSender>` so test sites read without `dyn`.
///
/// `process_retries` takes `&Arc<dyn EmailSender>`, and the `Arc<T> -> Arc<dyn
/// Trait>` coercion only fires when the target type is visible at the
/// construction site. Behind a borrow it does not, so a bare
/// `Arc::new(OkMailer)` produces `Arc<OkMailer>` and the call site cannot pass
/// it. Funnelling the trait-object cast through one helper keeps every test
/// body free of the `dyn` noise.
fn shared<S>(sender: S) -> Arc<dyn EmailSender>
where
    S: EmailSender + 'static,
{
    Arc::new(sender)
}

// -----------------------------------------------------------------------------

/// One tick + Ok mailer marks the row delivered: status flips, `completed_at`
/// is set, and attempts reflects the single claim-time increment.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tick_marks_row_completed_on_success(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "ok@example.com").await;
    let mailer = shared(OkMailer);

    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick");

    let row = sqlx::query_as::<_, (String, i32, Option<DateTime<Utc>>)>(
        r"
            SELECT status, attempts, completed_at
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch row");

    assert_eq!(row.0, "completed");
    assert_eq!(row.1, 1);
    assert!(row.2.is_some(), "completed_at populated");
}

/// Permanent failure on a queued row terminates it with `status = 'failed'` and
/// the reason captured in `last_error`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tick_marks_row_failed_on_permanent(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "perm@example.com").await;
    let mailer = shared(PermanentMailer);

    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick");

    let row = sqlx::query_as::<_, (String, Option<DateTime<Utc>>, Option<String>)>(
        r"
            SELECT status, completed_at, last_error
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch row");

    assert_eq!(row.0, "failed");
    assert!(row.1.is_some(), "terminal row carries completed_at");
    assert!(
        row.2
            .as_deref()
            .unwrap_or_default()
            .starts_with("permanent: "),
        "last_error prefixed with `permanent:`, got {:?}",
        row.2,
    );
}

/// Transient failure on the first attempt: row stays pending, attempts bumps to
/// 1, and `next_retry_at` is pushed at least ~50s forward (the 60s backoff with
/// a margin for clock skew between the test and PG).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tick_reschedules_transient_with_backoff(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "trans@example.com").await;
    let mailer = shared(TransientMailer);

    let before = Utc::now();
    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick");

    let row = sqlx::query_as::<_, (String, i32, DateTime<Utc>, Option<String>)>(
        r"
            SELECT status, attempts, next_retry_at, last_error
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch row");

    assert_eq!(row.0, "pending", "transient leaves the row claimable again");
    assert_eq!(row.1, 1);
    let pushed_secs = (row.2 - before).num_seconds();
    assert!(
        pushed_secs >= 50,
        "next_retry_at pushed by ~60s backoff (got {pushed_secs}s)",
    );
    assert!(
        row.3
            .as_deref()
            .unwrap_or_default()
            .starts_with("transient: "),
        "last_error prefixed with `transient:`, got {:?}",
        row.3,
    );
}

/// Two transients followed by a success: attempts walks 1 -> 2 -> 3, the row
/// lands `completed`, and the final `last_error` is the last transient's
/// reason. Success deliberately does not clear `last_error` - operators see
/// what the row went through before delivery.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tick_succeeds_after_two_transient_failures(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "flap@example.com").await;
    let mailer = shared(SequencedMailer::new(vec![
        Err(EmailError::Transient("first attempt".to_owned())),
        Err(EmailError::Transient("second attempt".to_owned())),
        Ok(()),
    ]));

    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick 1");
    force_due_now(&pool, id).await;
    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick 2");
    force_due_now(&pool, id).await;
    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick 3");

    let row = sqlx::query_as::<_, (String, i32, Option<DateTime<Utc>>, Option<String>)>(
        r"
            SELECT status, attempts, completed_at, last_error
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch row");

    assert_eq!(row.0, "completed");
    assert_eq!(row.1, 3, "claim-time increment fires on every tick");
    assert!(row.2.is_some());
    assert_eq!(
        row.3.as_deref(),
        Some("transient: second attempt"),
        "success preserves the last transient reason for audit",
    );
}

/// A terminal row (status = 'failed') is invisible to the claim CTE, so the
/// tick must leave it strictly unchanged - even with a mailer that would
/// otherwise mutate state.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tick_does_not_reclaim_terminal_row(pool: PgPool) {
    let id = sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO email_send_retries
                (to_address, subject, body, attempts, status, completed_at, last_error)
            VALUES ($1, 'subj', 'body', 5, 'failed', NOW(), 'pre-existing')
            RETURNING id
        ",
    )
    .bind("terminal@example.com")
    .fetch_one(&pool)
    .await
    .expect("seed terminal row");

    let mailer = shared(PermanentMailer);
    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick");

    let row = sqlx::query_as::<_, (String, i32, Option<String>)>(
        r"
            SELECT status, attempts, last_error
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch row");
    assert_eq!(row.0, "failed");
    assert_eq!(row.1, 5, "terminal row attempts must not be bumped");
    assert_eq!(row.2.as_deref(), Some("pre-existing"));
}

/// A transient reaching `MAX_ATTEMPTS` (12) is promoted to terminal `failed`
/// rather than retried forever - a misclassified permanent stuck in the
/// transient classification cannot pollute the queue indefinitely.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tick_promotes_transient_to_failed_after_max_attempts(pool: PgPool) {
    // Seed at attempts = 11; the claim-time increment lifts it to 12, which
    // matches MAX_ATTEMPTS exactly and triggers the promote branch.
    let id = sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO email_send_retries
                (to_address, subject, body, attempts, status)
            VALUES ($1, 'subj', 'body', 11, 'pending')
            RETURNING id
        ",
    )
    .bind("max@example.com")
    .fetch_one(&pool)
    .await
    .expect("seed near-max row");

    let mailer = shared(TransientMailer);
    email_retry::process_retries(&pool, &mailer)
        .await
        .expect("tick");

    let row = sqlx::query_as::<_, (String, i32, Option<DateTime<Utc>>, Option<String>)>(
        r"
            SELECT status, attempts, completed_at, last_error
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch row");
    assert_eq!(row.0, "failed");
    assert_eq!(row.1, 12);
    assert!(row.2.is_some(), "max-attempts marks terminal");
    assert!(
        row.3
            .as_deref()
            .unwrap_or_default()
            .starts_with("transient (max attempts): "),
        "last_error tags the max-attempts promotion, got {:?}",
        row.3,
    );
}

/// The shutdown broadcast must terminate `run` promptly: the current tick
/// resolves and the next interval does not start. A 2-second timeout surfaces a
/// hang as a clean failure rather than a CI stall.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn run_exits_on_shutdown_signal(pool: PgPool) {
    let (shutdown_tx, shutdown_rx) = broadcast::channel::<()>(1);
    let mailer = shared(OkMailer);

    let handle = tokio::spawn(email_retry::run(pool.clone(), mailer, shutdown_rx));

    // Let the immediate first tick fire and settle before we signal shutdown.
    time::sleep(Duration::from_millis(100)).await;
    shutdown_tx.send(()).expect("broadcast shutdown");

    time::timeout(Duration::from_secs(2), handle)
        .await
        .expect("run exited within timeout")
        .expect("join handle");
}
