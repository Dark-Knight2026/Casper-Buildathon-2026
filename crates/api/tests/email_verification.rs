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

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use common::{TestEnv, login_and_extract, setup_test_server};

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

/// Calls send and returns the plaintext token surfaced by the dev escape
/// hatch. Asserts the `200` so callers can assume a usable token.
async fn send_and_take_token(env: &TestEnv, access_token: &str) -> String {
    let response = env
        .server
        .post(SEND_URI)
        .add_header(COOKIE, format!("access_token={access_token}"))
        .await;
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
