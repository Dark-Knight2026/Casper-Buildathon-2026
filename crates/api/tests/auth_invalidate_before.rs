//! Integration tests for the `users.jwt_invalidate_before` force-revoke
//! cutoff and the matching middleware enforcement.
//!
//! These tests pin the foundational invariant that role change, revoke-all
//! sessions, and self-delete (added in later commits of this PR) will rely
//! on: writing `users.jwt_invalidate_before = NOW()` must immediately reject
//! any access token whose `iat` claim is at or below that cutoff, even
//! though its `exp` is still in the future and its `jti` is not on the
//! logout blocklist.

mod common;

use core::time::Duration;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use casper_types::AsymmetricType;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Baseline: a freshly issued access token works against `GET /me` when
/// `users.jwt_invalidate_before IS NULL` (the default after `/auth/login`).
/// Pins that the new middleware DB lookup does not regress the happy path.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn null_jwt_invalidate_before_allows_request(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;

    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;

    assert_eq!(
        me_response.status_code(),
        StatusCode::OK,
        "NULL jwt_invalidate_before must not block requests",
    );
}

/// A cutoff strictly in the past must NOT invalidate a token whose `iat` is
/// after the cutoff. Pins the comparison direction (`iat <= cutoff` rejects;
/// `iat > cutoff` allows). A bug that flipped the inequality would surface
/// here as a 401.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cutoff_in_past_does_not_invalidate_newer_token(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    // Set the cutoff 1 hour BEFORE login. Any token issued at login time
    // has `iat ~= NOW()`, so `iat > cutoff` and the token must be accepted.
    sqlx::query!(
        r"
            UPDATE users
            SET jwt_invalidate_before = NOW() - INTERVAL '1 hour'
            WHERE id = $1
        ",
        session.user_id,
    )
    .execute(&pool)
    .await
    .expect("seed cutoff in past");

    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;

    assert_eq!(
        me_response.status_code(),
        StatusCode::OK,
        "Token with iat > cutoff must be accepted; got {}",
        me_response.status_code(),
    );
}

/// A cutoff at or after the token's `iat` must invalidate the token. This
/// is the "force-revoke" semantic that PATCH /me/role, revoke-all, and
/// self-delete will rely on. We seed the cutoff `+5 seconds` past `NOW()` to
/// ensure it is strictly greater than the token's `iat` (which was captured
/// at login time, milliseconds earlier) regardless of clock skew.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cutoff_after_iat_invalidates_token(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    sqlx::query!(
        r"
            UPDATE users
            SET jwt_invalidate_before = NOW() + INTERVAL '5 seconds'
            WHERE id = $1
        ",
        session.user_id,
    )
    .execute(&pool)
    .await
    .expect("seed cutoff in future");

    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;

    assert_eq!(
        me_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "Token with iat <= cutoff must be rejected by middleware",
    );

    let body = me_response.json::<Value>();
    // The variant collapses to the generic `invalid_token` code on purpose -
    // exposing "force-revoked" specifically would leak attacker-useful state.
    // The variant-specific tracing log is what operators see. This asserts pins
    // the public contract.
    assert_eq!(
        body["error"].as_str().unwrap(),
        "invalid_token",
        "Force-revoke must surface as the generic invalid_token code, not a distinct one",
    );
}

/// After a force-revoke event, a brand-new login must succeed: the cutoff
/// applies only to tokens whose `iat` is `<= cutoff`, and a token issued
/// AFTER the cutoff has `iat > cutoff` and must pass. This pins the
/// "force-revoke is not a permanent ban" invariant - the PATCH /me/role
/// flow specifically depends on it (user re-logs in to mint a token with
/// the new role).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn fresh_login_after_cutoff_succeeds(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (secret_key, public_key) = common::generate_random_ed25519();
    let wallet_address = public_key.to_hex();

    // First login.
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let signature_hex = common::sign_with_prefix(
        nonce_body["message"].as_str().unwrap(),
        &secret_key,
        &public_key,
    );
    let first_login = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    let user_id =
        Uuid::parse_str(first_login.json::<Value>()["user"]["id"].as_str().unwrap()).unwrap();

    // Force-revoke.
    sqlx::query!(
        r"
            UPDATE users
            SET jwt_invalidate_before = NOW()
            WHERE id = $1
        ",
        user_id,
    )
    .execute(&pool)
    .await
    .expect("seed cutoff at NOW()");

    // Second login - must succeed and yield a fresh, working token.
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let signature_hex = common::sign_with_prefix(
        nonce_body["message"].as_str().unwrap(),
        &secret_key,
        &public_key,
    );
    // Sleep one second so the new token's `iat` is strictly greater than
    // the cutoff (timestamp resolution is per-second).
    tokio::time::sleep(Duration::from_secs(1)).await;
    let second_login = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(second_login.status_code(), StatusCode::OK);
    let new_access = second_login.cookie("access_token").value().to_owned();

    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={new_access}"))
        .await;
    assert_eq!(
        me_response.status_code(),
        StatusCode::OK,
        "Token issued after cutoff must be accepted",
    );
}
