//! Integration tests for authentication endpoints.

mod common;

use axum::http::{Method, StatusCode};
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use rand::Rng;
use redis::AsyncCommands;
use sqlx::PgPool;

use api::{common::CASPER_MESSAGE_PREFIX, server::AUTH_RATE_LIMIT_BURST};

/// Signs a message with the Casper Wallet prefix, matching browser extension behavior.
fn sign_with_prefix(message: &str, secret_key: &SecretKey, public_key: &PublicKey) -> String {
    let prefixed = format!("{CASPER_MESSAGE_PREFIX}{message}");
    crypto::sign(prefixed.as_bytes(), secret_key, public_key).to_hex()
}

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
            "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abc",
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

    // Valid length wallet address but no nonce stored in Redis.
    // Returns 401 (UNAUTHORIZED) because nonce lookup fails before signature check.
    let response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abc",
            "signature": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abc01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef"
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
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

    // 3. Sign the message with the private key (with Casper Wallet prefix)
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

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
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

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
    let _first_body: serde_json::Value = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json();

    // Request second nonce (overwrites first in Redis)
    let second_body: serde_json::Value = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json();
    let second_message = second_body["message"].as_str().unwrap();
    let second_sig = sign_with_prefix(second_message, &secret_key, &public_key);

    // Login with latest nonce succeeds (first nonce was overwritten)
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

/// A failed login attempt consumes the nonce (consume-on-first-use).
///
/// This prevents brute-force attacks within the nonce TTL window.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn failed_login_consumes_nonce(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([6u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // Get nonce and sign the correct message
    let nonce_body: serde_json::Value = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json();
    let message = nonce_body["message"].as_str().unwrap();
    let correct_sig = sign_with_prefix(message, &secret_key, &public_key);

    // First attempt with a wrong signature consumes the nonce
    let bad = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": "01".repeat(64)
        }))
        .await;
    assert_eq!(
        bad.status_code(),
        StatusCode::BAD_REQUEST,
        "Bad signature format should return 400"
    );

    // Second attempt with the correct signature fails (nonce already consumed)
    let retry = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": correct_sig
        }))
        .await;
    assert_eq!(
        retry.status_code(),
        StatusCode::UNAUTHORIZED,
        "Nonce must be consumed after first login attempt"
    );
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
    let signature_hex = sign_with_prefix(fake_message, &secret_key, &public_key);

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
    let sig_hex = sign_with_prefix(message, &secret_key, &public_key);
    let pk_hex = public_key.to_hex();

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
    let sig_hex = sign_with_prefix(message, &secret_key, &public_key);
    let pk_hex = public_key.to_hex();

    let result = api::common::verify_casper_signature(&pk_hex, &sig_hex, "Fake Message");

    assert!(result.is_ok());
    assert!(
        !result.unwrap(),
        "Signature should be invalid for different message"
    );
}

#[test]
#[ignore = "utility: run manually to regenerate test vector data"]
fn generate_data_for_local_tests() {
    let fixed_bytes = [1u8; 32];
    let secret_key = SecretKey::ed25519_from_bytes(fixed_bytes).unwrap();
    let public_key = PublicKey::from(&secret_key);

    let wallet_address = public_key.to_hex();

    let message_from_server = "Sign this message to login to LeaseFi. Nonce: XJyoR9G2a4HQfjdx";
    let signature_hex = sign_with_prefix(message_from_server, &secret_key, &public_key);

    println!("\n============================================");
    println!("1. Wallet Address:");
    println!("{wallet_address}");
    println!("--------------------------------------------");
    println!("2. Signature:");
    println!("{signature_hex}");
    println!("============================================\n");
}

/// Signature signed WITHOUT the `CASPER_MESSAGE_PREFIX` must be rejected.
///
/// Regression: `verify_casper_signature` prepends the prefix before verification,
/// so a raw (unprefixed) signature must not pass.
#[test]
fn verify_signature_without_prefix_is_rejected() {
    let (secret_key, public_key) = generate_random_ed25519();

    let message = "Login to LeaseFi";
    // Sign the raw message directly - without CASPER_MESSAGE_PREFIX
    let signature = crypto::sign(message.as_bytes(), &secret_key, &public_key);
    let sig_hex = signature.to_hex();
    let pk_hex = public_key.to_hex();

    let result = api::common::verify_casper_signature(&pk_hex, &sig_hex, message);

    assert!(
        result.is_ok(),
        "Function returned error: {:?}",
        result.err()
    );
    assert!(
        !result.unwrap(),
        "Signature without prefix must be rejected"
    );
}

/// Rate limiter returns 429 after burst is exhausted.
///
/// Regression: `axum::serve` must use `into_make_service_with_connect_info::<SocketAddr>()`
/// so that `GovernorLayer` can extract the peer IP via `ConnectInfo`. Without it, all
/// rate-limited endpoints return 500.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn auth_rate_limiter_returns_429_after_burst(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let wallet = "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abc";

    // Send BURST + 1 requests; the last one must be rate-limited (429).
    for i in 0..=AUTH_RATE_LIMIT_BURST {
        let response = env
            .server
            .get("/api/v1/auth/nonce")
            .add_query_param("wallet_address", wallet)
            .await;

        if i < AUTH_RATE_LIMIT_BURST {
            assert_eq!(
                response.status_code(),
                StatusCode::OK,
                "Request {i} should succeed within burst limit"
            );
        } else {
            assert_eq!(
                response.status_code(),
                StatusCode::TOO_MANY_REQUESTS,
                "Request {i} should be rate-limited after burst exhausted"
            );
        }
    }
}
