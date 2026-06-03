//! Integration tests for the email-verification HTTP flow
//! (`POST /api/v1/auth/verify/email/{send,confirm}`).
//!
//! These drive the full round-trip over the real HTTP transport: send issues a
//! token, confirm redeems it and rotates the token pair. The plaintext
//! verification token is recovered from the body of the outbound message via
//! a `CapturingMailer` test fixture - Redis stores only the SHA-256 hash, so
//! intercepting the message before it would reach an SMTP relay is the only
//! channel a test has to the plaintext.
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
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use api::common::{RedisStore, tokens};
use common::{CapturingMailer, PermanentMailer, TestEnv, TestOverrides, TransientMailer};

/// HTTP path of the verify-email send endpoint.
const SEND_URI: &str = "/api/v1/auth/verify/email/send";
/// HTTP path of the verify-email resend endpoint (alias onto the send handler,
/// sharing the same rate-limit slot and token slot).
const RESEND_URI: &str = "/api/v1/auth/verify/email/resend";
/// HTTP path of the verify-email confirm endpoint.
const CONFIRM_URI: &str = "/api/v1/auth/verify/email/confirm";

/// Posts to the send endpoint with the given access cookie, returning the raw
/// response so callers can assert any status (200 / 429 / 500).
async fn post_send(env: &TestEnv, access_token: &str) -> TestResponse {
    env.server
        .post(SEND_URI)
        .add_header(COOKIE, format!("access_token={access_token}"))
        .await
}

/// Posts to the resend endpoint with the given access cookie. Mirrors
/// [`post_send`] so the two paths can be driven interchangeably in tests that
/// assert they share a counter and token slot.
async fn post_resend(env: &TestEnv, access_token: &str) -> TestResponse {
    env.server
        .post(RESEND_URI)
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

/// Calls send and returns the plaintext token parsed out of the captured
/// outbound message body. Asserts the `200` so callers can assume a usable
/// token.
async fn send_and_take_token(
    env: &TestEnv,
    mailer: &CapturingMailer,
    access_token: &str,
) -> String {
    let response = post_send(env, access_token).await;
    assert_eq!(response.status_code(), StatusCode::OK, "send must succeed");
    common::extract_verify_token(mailer)
}

/// Flips `email_verified` to TRUE behind the handler's back, mirroring "the
/// address was verified by another path". Every other column - including any
/// live token slot in Redis - is left intact, so callers can drive the
/// already-verified branches without a second concurrent request.
async fn mark_email_verified(pool: &PgPool, user_id: Uuid) {
    sqlx::query!(
        r"
            UPDATE users
            SET email_verified = TRUE
            WHERE id = $1
        ",
        user_id,
    )
    .execute(pool)
    .await
    .expect("mark email verified out of band");
}

/// Happy path: send then confirm flips `email_verified`, lets the trigger
/// raise `verification_level` to `email`, and rotates both auth cookies.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_then_confirm_verifies_email_and_rotates_tokens(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let token = send_and_take_token(&env, &mailer, &session.access_token).await;

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
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &mailer, &session.access_token).await;

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
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;
    let real_token = send_and_take_token(&env, &mailer, &session.access_token).await;

    // Valid base64url shape (TOKEN_STR_LEN chars), guaranteed hash mismatch.
    let wrong_token = "A".repeat(tokens::TOKEN_STR_LEN);
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
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &mailer, &session.access_token).await;

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
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &mailer, &session.access_token).await;

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
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;

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
    let env = common::setup_test_server(pool, true).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .json(&json!({ "token": "A".repeat(tokens::TOKEN_STR_LEN) }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::UNAUTHORIZED);
}

/// Confirm against a row already flipped to `email_verified = TRUE` out of band
/// takes the `AlreadyVerified` branch: it answers `200` with the current
/// profile but issues NO `Set-Cookie`. The token slot is live and the hash
/// matches, so the only thing short-circuiting the re-issue is the
/// `WHERE email_verified = FALSE` guard inside `confirm_email_verification` -
/// re-minting tokens for a no-op would silently sign the user out of their
/// other devices.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_already_verified_returns_200_without_cookies(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    let email = common::seed_email(&env.state.db, session.user_id).await;
    let token = send_and_take_token(&env, &mailer, &session.access_token).await;

    // Flip the flag behind the handler's back, leaving the token slot intact.
    // This reproduces the "verified by another path between send and confirm"
    // race without needing two concurrent requests.
    mark_email_verified(&env.state.db, session.user_id).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::OK);

    // The body is the current profile, not an error envelope.
    let body = confirm.json::<Value>();
    assert_eq!(
        body["id"].as_str(),
        Some(session.user_id.to_string().as_str())
    );
    assert_eq!(body["email"].as_str(), Some(email.as_str()));

    // The defining contract: a no-op confirm must NOT rotate the token pair.
    assert!(
        confirm.maybe_cookie("access_token").is_none(),
        "AlreadyVerified must not re-issue the access cookie",
    );
    assert!(
        confirm.maybe_cookie("refresh_token").is_none(),
        "AlreadyVerified must not re-issue the refresh cookie",
    );

    // The pre-confirm refresh family is therefore still valid - the user was
    // not logged out elsewhere.
    let refresh = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        refresh.status_code(),
        StatusCode::NO_CONTENT,
        "no-op confirm leaves the existing session intact",
    );
}

// Rate limiting and failure-path compensation ---------------------------------

/// First send succeeds; an immediate second hits the per-minute cap (1/min).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_rate_limited_after_first_within_minute(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let first = post_send(&env, &session.access_token).await;
    assert_eq!(first.status_code(), StatusCode::OK);

    let second = post_send(&env, &session.access_token).await;
    assert_eq!(second.status_code(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        second.json::<Value>()["error"].as_str(),
        Some("rate_limited")
    );
}

/// TOCTOU regression: two *concurrent* sends must not both clear the 1/min cap.
/// With the read-only check and the `INCR` as separate round-trips, both
/// requests could read count=0, both pass, and both increment past
/// `VERIFY_EMAIL_SEND_PER_MINUTE_MAX = 1` - two 200s and a counter of 2. The
/// fused atomic reserve serializes them in Redis, so exactly one wins (200) and
/// the other is rejected (429).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn concurrent_sends_serialize_one_winner(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let cookie_header = format!("access_token={}", session.access_token);
    let first = env
        .server
        .post(SEND_URI)
        .add_header(COOKIE, cookie_header.clone());
    let second = env.server.post(SEND_URI).add_header(COOKIE, cookie_header);

    let (a, b) = tokio::join!(first, second);

    let codes = [a.status_code(), b.status_code()];
    assert!(
        codes.contains(&StatusCode::OK),
        "expected exactly one concurrent send to pass the 1/min cap, got {codes:?}",
    );
    assert!(
        codes.contains(&StatusCode::TOO_MANY_REQUESTS),
        "expected the losing concurrent send to be rate-limited, got {codes:?}",
    );
}

/// Once the per-minute window elapses, a send is allowed again - the hourly
/// cap of 5 is not yet reached.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_succeeds_again_after_minute_window(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

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
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

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
    let env = common::setup_test_server_with(
        pool,
        true,
        TestOverrides {
            mailer: Some(Arc::new(PermanentMailer)),
            ..TestOverrides::default()
        },
    )
    .await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

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
    let env = common::setup_test_server_with(
        pool,
        true,
        TestOverrides {
            mailer: Some(Arc::new(TransientMailer)),
            ..TestOverrides::default()
        },
    )
    .await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

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

// Edge cases ------------------------------------------------------------------

/// A user with no stored email cannot start the verify flow: the handler
/// rejects before touching the rate-limit counter, so an unactionable request
/// never burns a slot.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_returns_400_when_email_not_set(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;
    // Login synthesizes a placeholder `wallet_*@leasefi.local` email so that
    // `users.email` is non-NULL after wallet sign-in. To exercise the
    // `email_not_set` branch we explicitly clear it back to NULL.
    sqlx::query!(
        r"
            UPDATE users
            SET email = NULL
            WHERE id = $1
        ",
        session.user_id,
    )
    .execute(&env.state.db)
    .await
    .expect("clear email");

    let response = post_send(&env, &session.access_token).await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert_eq!(
        response.json::<Value>()["error"].as_str(),
        Some("email_not_set"),
    );
}

/// Send is behind `AuthUser`: an unauthenticated request never reaches the
/// per-user counter or the mailer.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_without_auth_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let response = env.server.post(SEND_URI).await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// A second send while the first token is still live overwrites the slot:
/// only the newest hash survives, so an interrupted flow can be restarted
/// without leaving two redeemable tokens in flight.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_overwrites_previous_token_slot(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let first_token = send_and_take_token(&env, &mailer, &session.access_token).await;
    // Step past the 1/min cap so the second send is not rate-limited.
    clear_minute_window(&env, session.user_id).await;
    let second_token = send_and_take_token(&env, &mailer, &session.access_token).await;
    assert_ne!(first_token, second_token, "each send mints fresh entropy");

    // GETDEL the slot directly: it must hold the hash of the *second* token,
    // proving the second send replaced the first rather than appending.
    let stored = env
        .state
        .redis
        .take_verify_email_token(session.user_id)
        .await
        .expect("take token slot")
        .expect("slot non-empty after send");

    let first_hash = <[u8; 32]>::from(Sha256::digest(first_token.as_bytes()));
    let second_hash = <[u8; 32]>::from(Sha256::digest(second_token.as_bytes()));
    assert_eq!(stored, second_hash, "slot holds the latest token's hash");
    assert_ne!(stored, first_hash, "the previous hash is gone");
}

/// `/send` has no `email_verified` short-circuit: an already-verified user who
/// taps it still gets `200` and a fresh token. That is safe by design - the
/// guard lives one layer down, so redeeming the token takes the
/// `AlreadyVerified` branch (`200 + profile`, NO `Set-Cookie`) and the user is
/// not signed out of their other devices. This pins the intended idempotency.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn send_to_already_verified_user_yields_noop_confirm(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    let email = common::seed_email(&env.state.db, session.user_id).await;
    mark_email_verified(&env.state.db, session.user_id).await;

    // No short-circuit: the send proceeds and mints a redeemable token.
    let token = send_and_take_token(&env, &mailer, &session.access_token).await;

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::OK);

    // AlreadyVerified branch: the body is the current profile, not an error.
    let body = confirm.json::<Value>();
    assert_eq!(
        body["id"].as_str(),
        Some(session.user_id.to_string().as_str())
    );
    assert_eq!(body["email"].as_str(), Some(email.as_str()));

    // The defining contract: a no-op confirm must NOT rotate the token pair.
    assert!(
        confirm.maybe_cookie("access_token").is_none(),
        "send-to-verified confirm must not re-issue the access cookie",
    );
    assert!(
        confirm.maybe_cookie("refresh_token").is_none(),
        "send-to-verified confirm must not re-issue the refresh cookie",
    );

    // The pre-existing session therefore survives untouched.
    let refresh = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        refresh.status_code(),
        StatusCode::NO_CONTENT,
        "sending to an already-verified user leaves the session intact",
    );
}

// /resend endpoint ------------------------------------------------------------
//
// `/resend` is a thin alias onto the send handler. These pin that the alias is
// wired up (mints a real, redeemable token) and that it is NOT a second
// independent quota - it shares both the rate-limit counter and the token slot
// with `/send`.

/// `/resend` on its own issues a usable verification token: the link it mints
/// confirms end-to-end, proving the alias routes into the real send logic
/// rather than a stub.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn resend_issues_a_usable_token(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let resend = post_resend(&env, &session.access_token).await;
    assert_eq!(resend.status_code(), StatusCode::OK, "resend must succeed");
    let token = common::extract_verify_token(&mailer);

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(
        confirm.status_code(),
        StatusCode::OK,
        "a token minted by /resend redeems like a /send one",
    );
}

/// `/send` then `/resend` within the same minute hits the shared 1/min cap:
/// the resend is `429`, proving the two routes increment one counter rather
/// than each having its own quota.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn resend_shares_rate_limit_with_send(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let send = post_send(&env, &session.access_token).await;
    assert_eq!(send.status_code(), StatusCode::OK);

    let resend = post_resend(&env, &session.access_token).await;
    assert_eq!(
        resend.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "resend draws from the same per-minute slot as send",
    );
    assert_eq!(
        resend.json::<Value>()["error"].as_str(),
        Some("rate_limited"),
    );
}

/// `/resend` overwrites the token slot left by a prior `/send`: only the
/// newest hash survives, so the two routes target one slot rather than each
/// holding an independently redeemable token.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn resend_overwrites_send_token_slot(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    common::seed_email(&env.state.db, session.user_id).await;

    let send_token = send_and_take_token(&env, &mailer, &session.access_token).await;
    // Step past the 1/min cap so the resend is not rate-limited.
    clear_minute_window(&env, session.user_id).await;
    let resend = post_resend(&env, &session.access_token).await;
    assert_eq!(resend.status_code(), StatusCode::OK);
    let resend_token = common::extract_verify_token(&mailer);
    assert_ne!(send_token, resend_token, "resend mints fresh entropy");

    let stored = env
        .state
        .redis
        .take_verify_email_token(session.user_id)
        .await
        .expect("take token slot")
        .expect("slot non-empty after resend");

    let send_hash = <[u8; 32]>::from(Sha256::digest(send_token.as_bytes()));
    let resend_hash = <[u8; 32]>::from(Sha256::digest(resend_token.as_bytes()));
    assert_eq!(stored, resend_hash, "slot holds the resend token's hash");
    assert_ne!(stored, send_hash, "the prior send hash is gone");
}

/// `/resend` shares the send handler, so it inherits the same lack of an
/// `email_verified` short-circuit: an already-verified user who resends gets
/// `200` and a fresh token whose confirm is the same `AlreadyVerified` no-op -
/// profile body, no cookie rotation, session preserved.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn resend_to_already_verified_user_yields_noop_confirm(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let session = common::login_and_extract(&env).await;
    let email = common::seed_email(&env.state.db, session.user_id).await;
    mark_email_verified(&env.state.db, session.user_id).await;

    let resend = post_resend(&env, &session.access_token).await;
    assert_eq!(
        resend.status_code(),
        StatusCode::OK,
        "resend has no verified short-circuit either",
    );
    let token = common::extract_verify_token(&mailer);

    let confirm = env
        .server
        .post(CONFIRM_URI)
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "token": token }))
        .await;
    assert_eq!(confirm.status_code(), StatusCode::OK);

    let body = confirm.json::<Value>();
    assert_eq!(body["email"].as_str(), Some(email.as_str()));
    assert!(
        confirm.maybe_cookie("access_token").is_none(),
        "resend-to-verified confirm must not re-issue the access cookie",
    );
    assert!(
        confirm.maybe_cookie("refresh_token").is_none(),
        "resend-to-verified confirm must not re-issue the refresh cookie",
    );

    let refresh = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        refresh.status_code(),
        StatusCode::NO_CONTENT,
        "resending to an already-verified user leaves the session intact",
    );
}
