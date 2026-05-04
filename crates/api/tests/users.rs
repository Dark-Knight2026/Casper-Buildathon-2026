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
