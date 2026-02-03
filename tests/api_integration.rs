//! Integration tests for API endpoints.
//!
//! Uses #[sqlx::test] for isolated PostgreSQL databases per test.
//! Redis uses testcontainers (one container per test that needs it).
//!
//! Requires:
//! - Docker running
//! - PostgreSQL via: docker compose -f docker-compose.test.yml up -d
//!
//! Run with: `cargo test --test api_integration`

mod common;

use axum::http::{Method, StatusCode};
use sqlx::PgPool;

#[sqlx::test(migrations = "./supabase/migrations")]
async fn health_check_returns_status(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, true).await;

    let response = env.server.get("/health").await;

    // Should return 200 if services are up, 503 if down
    assert!(
        response.status_code() == StatusCode::OK
            || response.status_code() == StatusCode::SERVICE_UNAVAILABLE
    );

    let body: serde_json::Value = response.json();
    assert!(body.get("status").is_some());
    assert!(body.get("redis").is_some());
    assert!(body.get("database").is_some());
    assert_eq!(body["service"], "leasefi-backend");
}

#[sqlx::test(migrations = "./supabase/migrations")]
async fn nonce_endpoint_requires_wallet_address(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, true).await;

    // Missing wallet_address parameter
    let response = env.server.get("/nonce").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrations = "./supabase/migrations")]
async fn nonce_endpoint_returns_challenge(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, true).await;

    let response = env
        .server
        .get("/nonce")
        .add_query_param(
            "wallet_address",
            "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef",
        )
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);

    let body: serde_json::Value = response.json();
    assert!(body.get("nonce").is_some());
    assert!(body.get("message").is_some());

    let message = body["message"].as_str().unwrap();
    assert!(message.starts_with("Sign this message to login to LeaseFi. Nonce:"));
}

#[sqlx::test(migrations = "./supabase/migrations")]
async fn login_rejects_invalid_wallet_address(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, false).await;

    let response = env
        .server
        .post("/login")
        .json(&serde_json::json!({
            "wallet_address": "invalid",
            "signature": "fake_signature"
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrations = "./supabase/migrations")]
async fn login_rejects_invalid_signature_format(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, false).await;

    // Valid length wallet address but invalid Casper signature format
    // Returns 400 (BAD_REQUEST) because signature parsing fails before nonce check
    let response = env
        .server
        .post("/login")
        .json(&serde_json::json!({
            "wallet_address": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef",
            "signature": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef"
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrations = "./supabase/migrations")]
async fn protected_endpoint_requires_auth(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, false).await;

    let response = env
        .server
        .post("/api/v1/tax/calculate-liability")
        .json(&serde_json::json!({
            "fiscal_year": 2024,
            "property_ids": []
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrations = "./supabase/migrations")]
async fn protected_endpoint_rejects_invalid_token(pool: PgPool) {
    let env = common::setup_test_server_with_pool(pool, false).await;

    let (status, _): (StatusCode, Option<serde_json::Value>) = common::authed_request(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        "invalid_token",
        &serde_json::json!({
            "fiscal_year": 2024,
            "property_ids": []
        }),
    )
    .await;

    assert_eq!(status, StatusCode::UNAUTHORIZED);
}
