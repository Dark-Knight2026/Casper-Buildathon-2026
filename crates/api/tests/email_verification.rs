//! Integration tests for the email-verification HTTP flow
//! (`POST /api/v1/auth/verify/email/{send,confirm}`).
//!
//! These drive the full round-trip over the real HTTP transport: send issues a
//! token, confirm redeems it and rotates the token pair. The plaintext
//! verification token is read back from the `dev_verification_token` escape
//! hatch, which the test harness enables by configuring no Postmark token -
//! Redis stores only the hash, so this is the only place a test can obtain the
//! plaintext to feed into confirm.
//!
//! Verification-level *gating* (the `VerifiedUser` extractor) is covered
//! separately: with no gated HTTP route mounted yet, it is exercised against
//! the extractor directly rather than through this surface.

#![cfg(feature = "integration")]

mod common;

use std::sync::Arc;

use axum::http::StatusCode;
use axum_test::{TestResponse, http::header::COOKIE};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::common::RedisStore;
use common::{
    PermanentMailer, TestEnv, TestOverrides, TransientMailer, login_and_extract, setup_test_server,
    setup_test_server_with,
};

/// HTTP path of the verify-email send endpoint.
const SEND_URI: &str = "/api/v1/auth/verify/email/send";
/// HTTP path of the verify-email confirm endpoint.
const CONFIRM_URI: &str = "/api/v1/auth/verify/email/confirm";

/// Sets a unique email on the user so verify-send clears the `email IS NULL`
/// guard. A wallet-only login leaves `email` NULL, which would otherwise make
/// send return `400 email_not_set`.
async fn seed_email(pool: &PgPool, user_id: Uuid) -> String {
    let email = format!("verify-{user_id}@example.com");
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

/// Posts to the send endpoint with the given access cookie, returning the raw
/// response so callers can assert any status (200 / 429 / 500).
async fn post_send(env: &TestEnv, access_token: &str) -> TestResponse {
    env.server
        .post(SEND_URI)
        .add_header(COOKIE, format!("access_token={access_token}"))
        .await
}

/// Deletes the per-minute send counter to simulate the 1-minute window having
/// elapsed, without sleeping in CI. The hourly counter is left untouched, so
/// callers can still drive the 5/hour cap.
async fn clear_minute_window(env: &TestEnv, user_id: Uuid) {
    let redis_env = env.redis.as_ref().expect("redis env");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("redis connection");
    redis::cmd("DEL")
        .arg(RedisStore::verify_email_send_minute_key(user_id))
        .query_async::<()>(&mut conn)
        .await
        .expect("DEL minute key");
}

/// Calls send and returns the plaintext token surfaced by the dev escape
/// hatch. Asserts the `200` so callers can assume a usable token.
async fn send_and_take_token(env: &TestEnv, access_token: &str) -> String {
    let response = post_send(env, access_token).await;
    assert_eq!(response.status_code(), StatusCode::OK, "send must succeed");
    response.json::<Value>()["dev_verification_token"]
        .as_str()
        .expect("dev_verification_token present (no Postmark token in tests)")
        .to_owned()
}

/// Happy path: send then confirm flips `email_verified`, lets the trigger
/// raise `verification_level` to `email`, and rotates both auth cookies.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_then_confirm_verifies_email_and_rotates_tokens(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;

    let token = send_and_take_token(&env, &session.access_token).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::OK);

    // Both cookies must be re-issued and differ from the pre-confirm pair.
    let new_access = confirm.cookie("access_token").value().to_owned();
    let new_refresh = confirm.cookie("refresh_token").value().to_owned();
    assert_ne!(new_access, session.access_token, "access token rotated");
    assert_ne!(new_refresh, session.refresh_token, "refresh token rotated");

    // DB state: flag flipped, trigger raised the level in the same statement.
    let row = sqlx::query!(
        r"
            SELECT email_verified, verification_level
            FROM users
            WHERE id = $1
        ",
        session.user_id,
    )
    .fetch_one(&env.state.db)
    .await
    .expect("fetch user");
    assert!(
        row.email_verified.unwrap_or(false),
        "email_verified set to true"
    );
    assert_eq!(row.verification_level, "email", "level raised to email");
}

/// Confirm mints a fresh refresh family: the pre-confirm refresh cookie is
/// revoked, while the one returned by confirm rotates cleanly.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_rotates_refresh_family_old_invalid_new_valid(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &session.access_token).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::OK);
    let new_refresh = confirm.cookie("refresh_token").value().to_owned();

    // Old refresh, captured at login, is revoked by the re-issue.
    let old = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        old.status_code(),
        StatusCode::UNAUTHORIZED,
        "pre-confirm refresh family revoked"
    );

    // New refresh rotates without error.
    let new = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={new_refresh}"))
        .await;
    assert_eq!(
        new.status_code(),
        StatusCode::NO_CONTENT,
        "post-confirm refresh works"
    );
}

/// A wrong but well-formed token consumes the slot via `GETDEL` before the
/// compare fails, so the genuine token can no longer be redeemed afterwards.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_with_wrong_token_consumes_slot(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;
    let real_token = send_and_take_token(&env, &session.access_token).await;

    // Valid 43-char base64url shape, guaranteed hash mismatch.
    let wrong_token = "A".repeat(43);
    let bad = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": wrong_token }))
        .await;
    assert_eq!(bad.status_code(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        bad.json::<Value>()["error"].as_str(),
        Some("invalid_or_expired_token")
    );

    // Slot was consumed by the GETDEL, so the real token now misses.
    let after = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": real_token }))
        .await;
    assert_eq!(
        after.status_code(),
        StatusCode::NOT_FOUND,
        "slot already consumed by the wrong attempt"
    );
}

/// A token is single-use: the second confirm with the same token misses.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_is_single_use(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &session.access_token).await;

    let first = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(first.status_code(), StatusCode::OK);

    let second = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(
        second.status_code(),
        StatusCode::NOT_FOUND,
        "consumed token cannot be redeemed twice"
    );
}

/// An expired token (here: the slot cleared out of band, mirroring TTL
/// expiry) confirms as `404`, not a server error.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_expired_token_returns_404(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &session.access_token).await;

    // Drop the slot the way a 24h TTL expiry eventually would.
    env.state
        .redis
        .clear_verify_email_token(session.user_id)
        .await
        .expect("clear token slot");

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::NOT_FOUND);
    assert_eq!(
        confirm.json::<Value>()["error"].as_str(),
        Some("invalid_or_expired_token")
    );
}

/// A token of the wrong length fails the shape check as `400` without ever
/// touching Redis.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_bad_token_format_returns_400(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": "too-short" }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::BAD_REQUEST);
    assert_eq!(
        confirm.json::<Value>()["error"].as_str(),
        Some("bad_token_format")
    );
}

/// Confirm is guarded by `AuthUser`: no access cookie is `401`, regardless of
/// the body.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_without_auth_returns_401(pool: PgPool) {
    let env = setup_test_server(pool, true).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .json(&json!({ "token": "A".repeat(43) }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::UNAUTHORIZED);
}

// Rate limiting and failure-path compensation ---------------------------------

/// First send succeeds; an immediate second hits the per-minute cap (1/min).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_rate_limited_after_first_within_minute(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;

    let first = post_send(&env, &session.access_token).await;
    assert_eq!(first.status_code(), StatusCode::OK);

    let second = post_send(&env, &session.access_token).await;
    assert_eq!(second.status_code(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        second.json::<Value>()["error"].as_str(),
        Some("rate_limited")
    );
}

/// Once the per-minute window elapses, a send is allowed again - the hourly
/// cap of 5 is not yet reached.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_succeeds_again_after_minute_window(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;

    assert_eq!(
        post_send(&env, &session.access_token).await.status_code(),
        StatusCode::OK
    );
    assert_eq!(
        post_send(&env, &session.access_token).await.status_code(),
        StatusCode::TOO_MANY_REQUESTS
    );

    clear_minute_window(&env, session.user_id).await;

    assert_eq!(
        post_send(&env, &session.access_token).await.status_code(),
        StatusCode::OK,
        "a fresh minute window allows another send"
    );
}

/// The hourly cap (5) blocks the sixth send even when each minute window is
/// cleared between requests.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_hour_cap_blocks_sixth_request(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;

    for i in 0..5 {
        let resp = post_send(&env, &session.access_token).await;
        assert_eq!(
            resp.status_code(),
            StatusCode::OK,
            "send {i} is within the hourly cap"
        );
        // Clear only the minute slot so the next request is not blocked by the
        // 1/min cap before we reach the 5/hour cap.
        clear_minute_window(&env, session.user_id).await;
    }

    let sixth = post_send(&env, &session.access_token).await;
    assert_eq!(
        sixth.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "the sixth send within the hour is capped"
    );
}

/// A permanent mailer failure rolls back the rate-limit counter: the next send
/// is NOT `429`. Since the same mailer fails again, the proof of compensation
/// is that the second request reaches the mailer (500) rather than being
/// rejected by the limiter (429).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn permanent_failure_compensates_send_counter(pool: PgPool) {
    let env = setup_test_server_with(
        pool,
        true,
        TestOverrides {
            mailer: Some(Arc::new(PermanentMailer)),
            ..TestOverrides::default()
        },
    )
    .await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;

    let first = post_send(&env, &session.access_token).await;
    // A 500 here is necessarily the send-failure branch - the only 500 send
    // can produce. The internal `email_send_failed` code is deliberately not
    // leaked into the body (it maps to a generic message), so we assert on the
    // status, not on the error string.
    assert_eq!(first.status_code(), StatusCode::INTERNAL_SERVER_ERROR);

    let second = post_send(&env, &session.access_token).await;
    assert_eq!(
        second.status_code(),
        StatusCode::INTERNAL_SERVER_ERROR,
        "the compensated counter lets the request reach the mailer, not the limiter"
    );
}

/// A transient failure does NOT compensate: the mail is queued, the user still
/// gets `200`, and the counter stays spent - so an immediate retry is `429`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn transient_failure_queues_and_keeps_counter(pool: PgPool) {
    let env = setup_test_server_with(
        pool,
        true,
        TestOverrides {
            mailer: Some(Arc::new(TransientMailer)),
            ..TestOverrides::default()
        },
    )
    .await;
    let session = login_and_extract(&env).await;
    seed_email(&env.state.db, session.user_id).await;

    let first = post_send(&env, &session.access_token).await;
    assert_eq!(
        first.status_code(),
        StatusCode::OK,
        "transient failure still answers sent"
    );

    // The message was queued for background retry rather than rolled back.
    let queued = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM email_send_retries WHERE status = 'pending'
        ",
    )
    .fetch_one(&env.state.db)
    .await
    .expect("count queued rows");
    assert_eq!(queued, Some(1), "transient failure enqueues one retry row");

    let second = post_send(&env, &session.access_token).await;
    assert_eq!(
        second.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "transient does not refund the rate-limit slot"
    );
}
