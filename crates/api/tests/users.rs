//! Integration tests for the user-profile endpoints.

mod common;

use std::sync::Arc;

use async_trait::async_trait;
use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use redis::AsyncCommands;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use api::common::{CASPER_MESSAGE_PREFIX, EmailError, EmailMessage, EmailSender};

use crate::common::{TestOverrides, setup_test_server_with};

/// Mailer that always fails delivery.
///
/// Used to assert that `request_email_change` rolls back the Redis token
/// slot and the rate-limit counter when the transport step blows up.
#[derive(Debug, Default)]
struct FailingMailer;

#[async_trait]
impl EmailSender for FailingMailer {
    async fn send(&self, _message: EmailMessage) -> Result<(), EmailError> {
        Err(EmailError::Transport(
            "failing mailer (test fixture)".to_owned(),
        ))
    }
}

fn sign_with_prefix(message: &str, secret_key: &SecretKey, public_key: &PublicKey) -> String {
    let prefixed = format!("{CASPER_MESSAGE_PREFIX}{message}");
    crypto::sign(prefixed.as_bytes(), secret_key, public_key).to_hex()
}

/// Regression: when `mailer.send` fails inside `request_email_change`, the
/// handler must roll back the Redis token slot and the rate-limit counter
/// so the user can retry without burning one of their three daily attempts
/// and without leaving a 24h orphaned token in Redis.
///
/// On the buggy code, `save_email_change_token` and
/// `record_email_change_attempt` both run before `mailer.send`, so the
/// failure leaks both side effects.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn request_email_change_rolls_back_state_on_mailer_failure(pool: PgPool) {
    let env = setup_test_server_with(
        pool.clone(),
        true,
        TestOverrides {
            mailer: Some(Arc::new(FailingMailer)),
            ..TestOverrides::default()
        },
    )
    .await;

    let secret_key = SecretKey::ed25519_from_bytes([7u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_cookie = login_response.cookie("access_token");
    let access_token = access_cookie.value().to_owned();

    let user_id: Uuid = sqlx::query_scalar!(
        r"
            SELECT user_id
            FROM wallet_connections
            WHERE wallet_address = $1
        ",
        wallet_address.to_ascii_lowercase(),
    )
    .fetch_one(&pool)
    .await
    .expect("wallet must exist after first login");

    let response = env
        .server
        .post("/api/v1/users/me/email")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "new_email": "fresh@example.com" }))
        .await;

    assert_eq!(
        response.status_code(),
        StatusCode::INTERNAL_SERVER_ERROR,
        "mailer transport failure must surface as 500"
    );

    let redis_env = env.redis.as_ref().expect("Redis required for this test");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("Redis connection failed");

    let token_key = format!("email_change:{user_id}");
    let token_exists: i32 = conn.exists(&token_key).await.expect("EXISTS query failed");
    assert_eq!(
        token_exists, 0,
        "email-change token slot must be cleared when mailer fails, otherwise it lives 24h orphaned",
    );

    let attempts_key = format!("email_change_attempts:{user_id}");
    let attempts: Option<u64> = conn.get(&attempts_key).await.expect("GET query failed");
    assert!(
        attempts.is_none_or(|c| c == 0),
        "rate-limit counter must not be consumed on mailer failure (got {attempts:?}); otherwise the user burns 1 of 3 daily attempts on a transient SMTP outage",
    );
}

/// `confirm_email_change` with a well-shaped but incorrect token must
/// return 401, not 400. The shape validator passes (43 base64url-no-pad
/// chars), `take_email_change_token` returns `Some(stored_hash, ...)` for
/// the real prior request, and the hash mismatch triggers the
/// `Unauthorized("invalid_email_change_token")` branch.
///
/// Pins the difference between "malformed payload" (400) and "well-formed
/// but unauthorized" (401) - a future refactor that collapses both into
/// 400 (or drops the hash check) would weaken the contract that an
/// attacker who guesses token shape but not value cannot consume the
/// real one.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_email_change_with_wrong_token_returns_401(pool: PgPool) {
    let env = setup_test_server_with(pool, true, TestOverrides::default()).await;

    let secret_key = SecretKey::ed25519_from_bytes([11u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();

    let request_response = env
        .server
        .post("/api/v1/users/me/email")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "new_email": "fresh@example.com" }))
        .await;
    assert_eq!(
        request_response.status_code(),
        StatusCode::ACCEPTED,
        "request_email_change must succeed before we can probe a wrong-token confirm",
    );

    // 43 base64url-no-pad chars (correct shape), but not the stored value.
    let wrong_token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    let confirm_response = env
        .server
        .post("/api/v1/users/me/email/confirm")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "token": wrong_token }))
        .await;

    assert_eq!(
        confirm_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "confirm with a token whose hash differs from the stored one must return 401, not 400",
    );
}

/// `confirm_email_change` after the Redis slot has expired (24h TTL
/// elapsed) must return 401. Simulated here by manually `DEL`-ing the
/// `email_change:{user_id}` key right after `request_email_change` stores
/// it, before invoking confirm.
///
/// Pins the expiry contract: a confirmation link mailed and then ignored
/// for 24+ hours stops working, instead of silently allowing late use.
/// `take_email_change_token` returns `None` and the handler short-circuits
/// to `Unauthorized` before any hash comparison runs.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_email_change_with_expired_token_returns_401(pool: PgPool) {
    let env = setup_test_server_with(pool.clone(), true, TestOverrides::default()).await;

    let secret_key = SecretKey::ed25519_from_bytes([13u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();

    let user_id: Uuid = sqlx::query_scalar!(
        r"
            SELECT user_id
            FROM wallet_connections
            WHERE wallet_address = $1
        ",
        wallet_address.to_ascii_lowercase(),
    )
    .fetch_one(&pool)
    .await
    .expect("wallet must exist after first login");

    let request_response = env
        .server
        .post("/api/v1/users/me/email")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "new_email": "expired@example.com" }))
        .await;
    assert_eq!(request_response.status_code(), StatusCode::ACCEPTED);

    // Simulate the 24h TTL elapsing by wiping the slot directly.
    let redis_env = env.redis.as_ref().expect("Redis required for this test");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("Redis connection failed");
    let token_key = format!("email_change:{user_id}");
    let _ = conn
        .del::<_, u32>(&token_key)
        .await
        .expect("DEL query failed");

    // Any well-shaped token suffices - take_email_change_token returns
    // None before the hash comparison ever runs.
    let any_valid_shape_token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    let confirm_response = env
        .server
        .post("/api/v1/users/me/email/confirm")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "token": any_valid_shape_token }))
        .await;

    assert_eq!(
        confirm_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "confirm after the Redis slot has been wiped (TTL elapsed or manual delete) must return 401",
    );
}
