//! Integration tests for the `verify_email` audit-log row.
//!
//! Pins the contract that lives between `confirm_email_verification` and the
//! `audit_logs` table: a genuine email verify writes exactly one row carrying
//! the actor, the resource, `new_values.verification_level`,
//! `status = 'success'`, and the request context (IP, UA, method, path); an
//! idempotent re-confirm against an already-verified row writes *zero* new
//! rows so the trail never doubles up on a no-op.

#![cfg(feature = "integration")]

mod common;

use axum::http::{StatusCode, header::USER_AGENT};
use axum_test::http::header::COOKIE;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::services::auth::db::{self, VerifyConfirmOutcome};

/// Sets a unique email and clears `email_verified` so the next confirm runs
/// the genuine UPDATE branch. Wallet-only login synthesises a placeholder
/// email, but we want a known fixture value the assertion can read back.
async fn seed_email(pool: &PgPool, user_id: Uuid) -> String {
    let email = format!("audit-{user_id}@example.com");
    sqlx::query!(
        r"
            UPDATE users
            SET email = $1, email_verified = FALSE
            WHERE id = $2
        ",
        email,
        user_id,
    )
    .execute(pool)
    .await
    .expect("seed email");
    email
}

/// A successful confirm writes exactly one `verify_email` audit row carrying
/// the full request context. The audit trail is the primary record of "who
/// verified what, from where" - any silently-empty slot makes the trail
/// unauditable, so each field gets its own assertion.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_writes_verify_email_audit_row(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    let email = seed_email(&pool, session.user_id).await;

    let send = env
        .server
        .post("/api/v1/auth/verify/email/send")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;
    assert_eq!(send.status_code(), StatusCode::OK);
    let token = send.json::<Value>()["dev_verification_token"]
        .as_str()
        .expect("dev_verification_token surfaced under no-Postmark harness")
        .to_owned();

    let confirm = env
        .server
        .post("/api/v1/auth/verify/email/confirm")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .add_header(USER_AGENT, "ua-fixture/1.0")
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::OK);

    // `ip_address` is INET; sqlx is built without the `inet` type feature, so
    // cast to text for the read-back. `audit-write` time is the canonical
    // moment, so we order by created_at DESC + LIMIT 1 even though only one
    // row is expected.
    let row = sqlx::query!(
        r"
            SELECT
                user_id,
                user_email,
                user_role,
                action,
                resource_type,
                resource_id,
                new_values,
                status,
                request_method,
                request_path,
                ip_address::text AS ip_text,
                user_agent
            FROM audit_logs
            WHERE user_id = $1 AND action = 'verify_email'
            ORDER BY created_at DESC
            LIMIT 1
        ",
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("verify_email audit row must exist after successful confirm");

    assert_eq!(row.action, "verify_email");
    assert_eq!(row.resource_type, "user");
    assert_eq!(row.resource_id, Some(session.user_id));
    assert_eq!(
        row.user_id,
        Some(session.user_id),
        "actor = subject (self-verify)",
    );
    assert_eq!(row.user_email.as_deref(), Some(email.as_str()));
    // user_role is whatever wallet-login assigned (`tenant` by default); the
    // contract is that it is captured at audit-write time, not that it takes
    // any specific value here.
    assert!(
        row.user_role.is_some(),
        "user_role populated from the user row at audit-write time",
    );
    assert_eq!(row.status.as_deref(), Some("success"));
    assert_eq!(row.request_method.as_deref(), Some("POST"));
    assert_eq!(
        row.request_path.as_deref(),
        Some("/auth/verify/email/confirm"),
    );
    assert!(
        row.ip_text.is_some(),
        "ip_address populated from ConnectInfo",
    );
    assert_eq!(row.user_agent.as_deref(), Some("ua-fixture/1.0"));

    let new_values = row.new_values.expect("new_values JSON populated");
    assert_eq!(
        new_values["verification_level"].as_str(),
        Some("email"),
        "new_values reads the trigger-recomputed level off the same row",
    );
}

/// A no-op confirm against an already-verified user returns `AlreadyVerified`
/// and writes *no* audit row. The UPDATE is guarded by
/// `email_verified = FALSE`, so a duplicate confirm tap (or an admin manual
/// set followed by a confirm) does not pollute the trail with a second
/// `success` for an event that did not actually happen.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn idempotent_confirm_does_not_write_a_second_audit_row(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    seed_email(&pool, session.user_id).await;

    // First confirm runs the genuine UPDATE branch and writes one row.
    let first =
        db::confirm_email_verification(&pool, session.user_id, Some("127.0.0.1"), Some("ua"))
            .await
            .expect("first confirm");
    assert_eq!(first, VerifyConfirmOutcome::Verified);

    // Second confirm hits `email_verified = TRUE` and short-circuits.
    let second =
        db::confirm_email_verification(&pool, session.user_id, Some("127.0.0.1"), Some("ua"))
            .await
            .expect("second confirm");
    assert_eq!(second, VerifyConfirmOutcome::AlreadyVerified);

    let count = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM audit_logs
            WHERE user_id = $1 AND action = 'verify_email'
        ",
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("count audit rows");
    assert_eq!(
        count,
        Some(1),
        "idempotent confirm must not append a second verify_email audit row",
    );
}
