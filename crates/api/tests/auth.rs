//! Integration tests for authentication endpoints.

mod common;

use axum::http::{Method, StatusCode};
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use rand::Rng;
use redis::AsyncCommands;
use sqlx::PgPool;

fn generate_random_ed25519() -> (SecretKey, PublicKey) {
    let mut rng = rand::rng();
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);

    let secret_key = SecretKey::ed25519_from_bytes(bytes).unwrap();
    let public_key = PublicKey::from(&secret_key);
    (secret_key, public_key)
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn nonce_endpoint_requires_wallet_address(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    // Missing wallet_address parameter
    let response = env.server.get("/api/v1/auth/nonce").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn nonce_endpoint_returns_challenge(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let response = env
        .server
        .get("/api/v1/auth/nonce")
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

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn login_rejects_invalid_wallet_address(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": "invalid",
            "signature": "fake_signature"
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn login_rejects_invalid_signature_format(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    // Valid length wallet address but invalid Casper signature format
    // Returns 400 (BAD_REQUEST) because signature parsing fails before nonce check
    let response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef",
            "signature": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef"
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn protected_endpoint_requires_auth(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

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

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn protected_endpoint_rejects_invalid_token(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

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

/// End-to-end: generate keypair -> get nonce -> sign -> login -> receive JWT.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn full_auth_flow_nonce_sign_login(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    // 1. Generate deterministic Ed25519 keypair
    let secret_key = SecretKey::ed25519_from_bytes([1u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // 2. Get nonce
    let nonce_response = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await;
    assert_eq!(nonce_response.status_code(), StatusCode::OK);

    let nonce_body: serde_json::Value = nonce_response.json();
    let message = nonce_body["message"]
        .as_str()
        .expect("message field required");

    // 3. Sign the message with the private key
    let signature = crypto::sign(message.as_bytes(), &secret_key, &public_key);
    let signature_hex = signature.to_hex();

    // 4. Login
    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex
        }))
        .await;

    // 5. Verify success
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let login_body: serde_json::Value = login_response.json();
    assert!(
        login_body.get("token").is_some(),
        "Response must contain token"
    );
    assert!(
        login_body.get("user").is_some(),
        "Response must contain user info"
    );
}

/// Replay attack: nonce is deleted after successful login, second attempt must fail.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn replay_attack_prevention(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([2u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // Get nonce and sign
    let nonce_body: serde_json::Value = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = crypto::sign(message.as_bytes(), &secret_key, &public_key).to_hex();

    // First login succeeds
    let first = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex
        }))
        .await;
    assert_eq!(first.status_code(), StatusCode::OK);

    // Second login with same signature fails (nonce was deleted)
    let second = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex
        }))
        .await;
    assert_eq!(
        second.status_code(),
        StatusCode::UNAUTHORIZED,
        "Replay attack must be rejected after nonce deletion"
    );
}

/// Requesting a new nonce overwrites the previous one; only the latest nonce is valid.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn concurrent_nonce_overwrites_previous(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([3u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // Request first nonce
    let first_body: serde_json::Value = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json();
    let first_message = first_body["message"].as_str().unwrap();
    let first_sig = crypto::sign(first_message.as_bytes(), &secret_key, &public_key).to_hex();

    // Request second nonce (overwrites first in Redis)
    let second_body: serde_json::Value = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json();
    let second_message = second_body["message"].as_str().unwrap();
    let second_sig = crypto::sign(second_message.as_bytes(), &secret_key, &public_key).to_hex();

    // Login with first (stale) nonce fails
    let stale = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": first_sig
        }))
        .await;
    assert_eq!(
        stale.status_code(),
        StatusCode::UNAUTHORIZED,
        "Stale nonce signature must be rejected"
    );

    // Login with latest nonce succeeds
    let fresh = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": second_sig
        }))
        .await;
    assert_eq!(fresh.status_code(), StatusCode::OK);
}

/// Login without requesting a nonce first must be rejected.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn login_without_nonce_is_rejected(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([4u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // Sign an arbitrary message (no nonce was ever stored)
    let fake_message = "Sign this message to login to LeaseFi. Nonce: nonexistent";
    let signature_hex = crypto::sign(fake_message.as_bytes(), &secret_key, &public_key).to_hex();

    let response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex
        }))
        .await;
    assert_eq!(
        response.status_code(),
        StatusCode::UNAUTHORIZED,
        "Login without prior nonce request must return 401"
    );
}

/// Nonce key in Redis must have TTL set (`LOGIN_NONCE_TTL` = 300s).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn nonce_has_ttl_set_in_redis(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([5u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // Request nonce
    let response = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);

    // Check TTL on the Redis key directly
    let redis_env = env.redis.as_ref().expect("Redis required for this test");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("Redis connection failed");

    let key = format!("nonce:{wallet_address}");
    let ttl: i64 = conn.ttl(&key).await.expect("TTL query failed");

    // TTL should be positive and close to 300s (allow some margin for test execution)
    assert!(
        ttl > 0 && ttl <= 300,
        "Nonce TTL must be between 1 and 300 seconds, got {ttl}"
    );
}

#[test]
fn verify_valid_signature() {
    let (secret_key, public_key) = generate_random_ed25519();

    let message = "Login to LeaseFi";
    let message_bytes = message.as_bytes();

    let signature = crypto::sign(message_bytes, &secret_key, &public_key);

    let pk_hex = public_key.to_hex();
    let sig_hex = signature.to_hex();

    let result = api::common::verify_casper_signature(&pk_hex, &sig_hex, message);

    assert!(
        result.is_ok(),
        "Function returned error: {:?}",
        result.err()
    );
    assert!(result.unwrap(), "Signature should be valid");
}

#[test]
fn verify_invalid_message() {
    let (secret_key, public_key) = generate_random_ed25519();

    let message = "Original Message";

    let signature = crypto::sign(message.as_bytes(), &secret_key, &public_key);

    let pk_hex = public_key.to_hex();
    let sig_hex = signature.to_hex();

    let result = api::common::verify_casper_signature(&pk_hex, &sig_hex, "Fake Message");

    assert!(result.is_ok());
    assert!(
        !result.unwrap(),
        "Signature should be invalid for different message"
    );
}

#[test]
fn generate_data_for_local_tests() {
    let fixed_bytes = [1u8; 32];
    let secret_key = SecretKey::ed25519_from_bytes(fixed_bytes).unwrap();
    let public_key = PublicKey::from(&secret_key);

    let wallet_address = public_key.to_hex();

    let message_from_server = "Sign this message to login to LeaseFi. Nonce: XJyoR9G2a4HQfjdx";

    let message_bytes = message_from_server.as_bytes();

    let signature = crypto::sign(message_bytes, &secret_key, &public_key);
    let signature_hex = signature.to_hex();

    println!("\n============================================");
    println!("1. Wallet Address:");
    println!("{wallet_address}");
    println!("--------------------------------------------");
    println!("2. Signature:");
    println!("{signature_hex}");
    println!("============================================\n");
}
