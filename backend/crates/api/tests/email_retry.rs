//! Integration tests for the email retry-queue db layer
//! (`api::workers::email_retry::db`).
//!
//! Each test inserts seed rows directly via raw SQL (the queue is fed by
//! handlers we have not built yet), then exercises one db helper and
//! asserts the resulting row state. The full worker loop is not driven
//! here - that needs a mock mailer and clock control which buy little
//! over directly testing the db contract.

#![cfg(feature = "integration")]

mod common;

use core::time::Duration;

use chrono::{DateTime, Duration as ChronoDuration, Utc};
use sqlx::PgPool;

use api::workers::email_retry;

/// Claim returns due rows and bumps `attempts` to 1.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn claim_marks_attempt_and_returns_payload(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "user@example.com").await;

    let claimed = email_retry::db::claim_pending_retries(&pool, 10)
        .await
        .expect("claim");

    assert_eq!(claimed.len(), 1, "exactly one due row");
    let row = &claimed[0];
    assert_eq!(row.id, id);
    assert_eq!(row.to_address, "user@example.com");
    assert_eq!(
        row.attempts, 1,
        "CTE increments attempts at claim time (0 -> 1)",
    );
}

/// Claim ignores rows whose `next_retry_at` is in the future.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn claim_skips_rows_scheduled_in_future(pool: PgPool) {
    sqlx::query(
        r"
            INSERT INTO email_send_retries (to_address, subject, body, next_retry_at)
            VALUES ('later@example.com', 's', 'b', NOW() + INTERVAL '1 hour')
        ",
    )
    .execute(&pool)
    .await
    .expect("seed future row");

    let claimed = email_retry::db::claim_pending_retries(&pool, 10)
        .await
        .expect("claim");

    assert!(
        claimed.is_empty(),
        "future-scheduled row must not be claimed"
    );
}

/// Claim ignores rows whose `status` is no longer `pending`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn claim_skips_terminal_rows(pool: PgPool) {
    sqlx::query(
        r"
            INSERT INTO email_send_retries (to_address, subject, body, status, completed_at)
            VALUES
                ('done@example.com', 's', 'b', 'completed', NOW()),
                ('dead@example.com', 's', 'b', 'failed', NOW())
        ",
    )
    .execute(&pool)
    .await
    .expect("seed terminal rows");

    let claimed = email_retry::db::claim_pending_retries(&pool, 10)
        .await
        .expect("claim");

    assert!(claimed.is_empty(), "terminal rows must not be claimed");
}

/// Claim honours its `LIMIT` argument.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn claim_respects_limit(pool: PgPool) {
    for i in 0..5 {
        common::seed_pending_retry(&pool, &format!("u{i}@example.com")).await;
    }

    let claimed = email_retry::db::claim_pending_retries(&pool, 2)
        .await
        .expect("claim");

    assert_eq!(claimed.len(), 2, "LIMIT 2 must cap returned rows");
}

/// `mark_completed` moves a row to terminal `completed` state.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn mark_completed_sets_status_and_completed_at(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "ok@example.com").await;

    email_retry::db::mark_completed(&pool, id)
        .await
        .expect("mark_completed");

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
    .expect("fetch");
    assert_eq!(row.0, "completed");
    assert!(row.1.is_some());
    assert!(row.2.is_none(), "happy path leaves last_error NULL");
}

/// `mark_failed` records the reason and transitions to terminal `failed`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn mark_failed_records_reason(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "bad@example.com").await;

    email_retry::db::mark_failed(&pool, id, "permanent: bad recipient")
        .await
        .expect("mark_failed");

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
    .expect("fetch");
    assert_eq!(row.0, "failed");
    assert!(row.1.is_some());
    assert_eq!(row.2.as_deref(), Some("permanent: bad recipient"));
}

/// `mark_transient_failure` reschedules without leaving `pending`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn mark_transient_failure_keeps_pending_and_pushes_next_retry(pool: PgPool) {
    let id = common::seed_pending_retry(&pool, "retry@example.com").await;
    let new_when = Utc::now() + ChronoDuration::minutes(5);

    email_retry::db::mark_transient_failure(&pool, id, new_when, "transient: timeout")
        .await
        .expect("mark_transient_failure");

    let row = sqlx::query_as::<_, (String, DateTime<Utc>, Option<String>)>(
        r"
            SELECT status, next_retry_at, last_error
            FROM email_send_retries
            WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .expect("fetch");
    assert_eq!(row.0, "pending", "transient failure stays in queue");
    assert_eq!(row.2.as_deref(), Some("transient: timeout"));
    let drift = (row.1 - new_when).num_milliseconds().abs();
    assert!(
        drift < 1000,
        "next_retry_at should match the scheduled instant (drift={drift}ms)",
    );
}

/// Cleanup deletes terminal rows older than the retention window.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cleanup_deletes_terminal_rows_past_retention(pool: PgPool) {
    sqlx::query(
        r"
            INSERT INTO email_send_retries (to_address, subject, body, status, completed_at)
            VALUES
                ('old@example.com',     's', 'b', 'completed', NOW() - INTERVAL '40 days'),
                ('recent@example.com',  's', 'b', 'completed', NOW() - INTERVAL '5 days'),
                ('pending@example.com', 's', 'b', 'pending',   NULL)
        ",
    )
    .execute(&pool)
    .await
    .expect("seed cleanup mix");

    let deleted = email_retry::db::cleanup_terminal_retries(&pool, Duration::from_hours(30 * 24))
        .await
        .expect("cleanup");

    assert_eq!(
        deleted, 1,
        "only the 40-day-old terminal row is past retention"
    );
    let kept_addresses = sqlx::query_scalar::<_, String>(
        r"
            SELECT to_address FROM email_send_retries ORDER BY to_address
        ",
    )
    .fetch_all(&pool)
    .await
    .expect("fetch survivors");
    assert_eq!(
        kept_addresses,
        vec![
            "pending@example.com".to_owned(),
            "recent@example.com".to_owned(),
        ],
    );
}
