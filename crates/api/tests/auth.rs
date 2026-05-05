//! Integration tests for authentication endpoints.

mod common;

use axum::http::{Method, StatusCode};
use axum_test::{TestResponse, http::header::COOKIE};
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header};
use rand::Rng;
use redis::AsyncCommands;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use api::{
    Claims, RedisStore, UserRole,
    common::{CASPER_MESSAGE_PREFIX, JWT_AUDIENCE, JWT_ISSUER},
    services::{AUTH_RATE_LIMIT_BURST, auth::UpsertOutcome},
};

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

/// Performs a full nonce -> sign -> login round-trip and returns the login
/// response so the caller can pluck the rotated cookies out.
async fn login_with_seed(env: &common::TestEnv, secret_seed: [u8; 32]) -> TestResponse {
    let secret_key = SecretKey::ed25519_from_bytes(secret_seed).unwrap();
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

    env.server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await
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

    let body = response.json::<Value>();
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

/// Wallet address with valid Casper Ed25519 length (66 chars) but
/// containing a non-hex character must be rejected by the wallet-address
/// validator before any signature work happens.
///
/// Pins the second half of the wallet-address invariant -
/// `login_rejects_invalid_wallet_address` already covers the length-fail
/// path (literal "invalid" is too short). This test specifically exercises
/// the `chars().all(is_ascii_hexdigit)` guard so a future refactor cannot
/// silently drop hex validation while length-fails keep passing the
/// existing test.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn login_rejects_non_hex_address(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    // 66 chars (Ed25519 length) but the trailing `c` of the canonical
    // sample address is replaced with `z` - length passes, hex check fails.
    let non_hex_address = "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abz";

    let response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": non_hex_address,
            "signature": "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abc01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef"
        }))
        .await;

    assert_eq!(
        response.status_code(),
        StatusCode::BAD_REQUEST,
        "wallet_address with non-hex chars must be rejected before signature check",
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn login_without_nonce_returns_401(pool: PgPool) {
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

    let (status, _) = common::authed_request::<Value>(
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

    let nonce_body = nonce_response.json::<Value>();
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

    // 5. Verify success: tokens come via Set-Cookie, body has user only.
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_cookie = login_response.cookie("access_token");
    assert!(
        !access_cookie.value().is_empty(),
        "access_token cookie must be set"
    );
    let refresh_cookie = login_response.cookie("refresh_token");
    assert!(
        !refresh_cookie.value().is_empty(),
        "refresh_token cookie must be set"
    );
    let login_body = login_response.json::<Value>();
    assert!(
        login_body.get("user").is_some(),
        "Response must contain user info"
    );
    assert!(
        login_body.get("token").is_none(),
        "Token must not appear in body - it lives in the cookie now"
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
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
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
    let _first_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();

    // Request second nonce (overwrites first in Redis)
    let second_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
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
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
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

    let key = RedisStore::nonce_key(&wallet_address);
    let ttl = conn.ttl::<_, i64>(&key).await.expect("TTL query failed");

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

// Secp256k1 auth flow ---------------------------------------------------------

/// End-to-end auth flow with a Secp256k1 key pair (02-prefixed, 68 hex chars).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn full_auth_flow_secp256k1(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::secp256k1_from_bytes([10u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    // Sanity: secp256k1 public key must be 68 hex chars (02 + 33 bytes).
    assert_eq!(wallet_address.len(), 68, "secp256k1 pubkey must be 68 hex");
    assert!(
        wallet_address.starts_with("02"),
        "secp256k1 pubkey must start with 02"
    );

    // Get nonce
    let nonce_response = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await;
    assert_eq!(nonce_response.status_code(), StatusCode::OK);

    let nonce_body = nonce_response.json::<Value>();
    let message = nonce_body["message"]
        .as_str()
        .expect("message field required");

    // Sign with Casper Wallet prefix
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

    // Login
    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex
        }))
        .await;

    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_cookie = login_response.cookie("access_token");
    assert!(
        !access_cookie.value().is_empty(),
        "access_token cookie must be set"
    );
    let refresh_cookie = login_response.cookie("refresh_token");
    assert!(
        !refresh_cookie.value().is_empty(),
        "refresh_token cookie must be set"
    );
    let login_body = login_response.json::<Value>();
    assert!(
        login_body.get("user").is_some(),
        "Response must contain user info"
    );
    assert!(
        login_body.get("token").is_none(),
        "Token must not appear in body - it lives in the cookie now"
    );
}

// JWT claim rejection tests ---------------------------------------------------

/// A JWT with wrong issuer must be rejected by the auth middleware.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn jwt_wrong_issuer_rejected(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let exp = usize::try_from((Utc::now() + Duration::hours(1)).timestamp().max(0)).unwrap();
    let claims = Claims {
        sub: Uuid::new_v4(),
        role: UserRole::Tenant,
        exp,
        iss: "wrong-issuer".to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: None,
        verification_level: None,
        jti: Uuid::new_v4(),
    };
    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(env.jwt_secret.as_bytes()),
    )
    .unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        &token,
        &serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "JWT with wrong issuer must be rejected"
    );
}

/// A JWT with wrong audience must be rejected by the auth middleware.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn jwt_wrong_audience_rejected(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let exp = usize::try_from((Utc::now() + Duration::hours(1)).timestamp().max(0)).unwrap();
    let claims = Claims {
        sub: Uuid::new_v4(),
        role: UserRole::Tenant,
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: "wrong-audience".to_owned(),
        token_type: None,
        verification_level: None,
        jti: Uuid::new_v4(),
    };
    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(env.jwt_secret.as_bytes()),
    )
    .unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        &token,
        &serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "JWT with wrong audience must be rejected"
    );
}

/// A JWT missing the `jti` claim must be rejected.
///
/// Pins the invariant introduced when `Claims.jti` lost its `Option<Uuid>`
/// wrapping: every access token now carries a `jti`, and a payload without
/// one is treated as malformed (serde rejects it during decode -> 401).
/// The payload is hand-rolled via `serde_json::json!` because the typed
/// `Claims` struct compile-time-forbids omitting `jti` - that is exactly
/// the invariant under test.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn jwt_without_jti_rejected(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let exp = usize::try_from((Utc::now() + Duration::hours(1)).timestamp().max(0)).unwrap();
    let payload = serde_json::json!({
        "sub": Uuid::new_v4(),
        "role": "tenant",
        "exp": exp,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "token_type": "access",
        "verification_level": "none",
    });

    let token = jsonwebtoken::encode(
        &Header::default(),
        &payload,
        &EncodingKey::from_secret(env.jwt_secret.as_bytes()),
    )
    .unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        &token,
        &serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "JWT without jti must be rejected (legacy Option<Uuid> compat removed)"
    );
}

/// JWT with `exp` already in the past must be rejected by the auth
/// middleware. Mirrors the structure of `jwt_wrong_issuer_rejected` but
/// flips the time axis instead of the issuer string - no clock-skew
/// tolerance is intended in the verifier, so a 1-hour-stale `exp` is
/// strictly out of bounds.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn jwt_with_expired_exp_rejected(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let exp = usize::try_from((Utc::now() - Duration::hours(1)).timestamp().max(0)).unwrap();
    let claims = Claims {
        sub: Uuid::new_v4(),
        role: UserRole::Tenant,
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: None,
        verification_level: None,
        jti: Uuid::new_v4(),
    };
    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(env.jwt_secret.as_bytes()),
    )
    .unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        &token,
        &serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "JWT with exp already in the past must be rejected"
    );
}

/// JWT signed with a secret that differs from the server's `jwt_secret`
/// must be rejected, even when issuer/audience/exp are all perfectly
/// formed. Pins the cryptographic check itself: an attacker who knows the
/// claim shape but not the HS256 secret cannot mint usable tokens.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn jwt_signed_with_wrong_secret_rejected(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let exp = usize::try_from((Utc::now() + Duration::hours(1)).timestamp().max(0)).unwrap();
    let claims = Claims {
        sub: Uuid::new_v4(),
        role: UserRole::Tenant,
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: None,
        verification_level: None,
        jti: Uuid::new_v4(),
    };
    // Sign with a *different* secret than the one the server is using.
    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(b"a-different-secret-not-the-servers"),
    )
    .unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        &token,
        &serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }),
    )
    .await;

    assert_eq!(
        status,
        StatusCode::UNAUTHORIZED,
        "JWT signed with a non-server secret must fail signature verification"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn refresh_without_cookie_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.post("/api/v1/auth/refresh").await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn refresh_with_unknown_token_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, "refresh_token=not_a_real_token")
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// Happy path: a freshly-issued refresh cookie rotates into a new pair.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn refresh_rotates_tokens(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let login = login_with_seed(&env, [11u8; 32]).await;
    assert_eq!(login.status_code(), StatusCode::OK);
    let original_refresh = login.cookie("refresh_token").value().to_owned();
    let original_access = login.cookie("access_token").value().to_owned();

    let response = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={original_refresh}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);
    let new_refresh = response.cookie("refresh_token");
    let new_access = response.cookie("access_token");
    assert!(!new_refresh.value().is_empty(), "rotated refresh missing");
    assert!(!new_access.value().is_empty(), "rotated access missing");
    assert_ne!(
        new_refresh.value(),
        original_refresh,
        "refresh cookie must rotate to a fresh value"
    );
    assert_ne!(
        new_access.value(),
        original_access,
        "access cookie must rotate to a fresh value"
    );
}

/// Replaying a rotated refresh token must trip reuse-detection and revoke
/// the entire family - the freshly minted successor stops working too.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn refresh_reuse_detection_revokes_family(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let login = login_with_seed(&env, [12u8; 32]).await;
    let r1 = login.cookie("refresh_token").value().to_owned();

    let first = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={r1}"))
        .await;
    assert_eq!(first.status_code(), StatusCode::NO_CONTENT);
    let r2 = first.cookie("refresh_token").value().to_owned();

    // Replaying r1 simulates either a stolen-cookie attack or a double-tab race
    // - both must be rejected and must invalidate r2 by family revocation.
    let replay = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={r1}"))
        .await;
    assert_eq!(replay.status_code(), StatusCode::UNAUTHORIZED);

    let after_revoke = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={r2}"))
        .await;
    assert_eq!(
        after_revoke.status_code(),
        StatusCode::UNAUTHORIZED,
        "successor must be revoked when reuse-detection trips on the family"
    );
}

/// Race: two concurrent rotations of the same token must serialize via the
/// `SELECT ... FOR UPDATE` row lock - exactly one wins (204), the other must
/// fall into reuse-detection (401). The pre-lock implementation would let
/// both succeed and break a legitimate user session on the next request.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn refresh_race_serializes_one_winner(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let login = login_with_seed(&env, [13u8; 32]).await;
    let cookie_value = login.cookie("refresh_token").value().to_owned();
    let cookie_header = format!("refresh_token={cookie_value}");

    let first = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, cookie_header.clone());
    let second = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, cookie_header);

    let (a, b) = tokio::join!(first, second);

    let codes = [a.status_code(), b.status_code()];
    assert!(
        codes.contains(&StatusCode::NO_CONTENT),
        "expected exactly one rotation to succeed, got {codes:?}"
    );
    assert!(
        codes.contains(&StatusCode::UNAUTHORIZED),
        "expected the loser to be rejected with 401, got {codes:?}"
    );
}

// Logout tests --------------------------------------------------------------

/// Logout is idempotent: even without any auth cookies the response is 204
/// and both clearing cookies are emitted so the client's storage drops to a
/// clean state.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn logout_without_cookies_returns_204(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.post("/api/v1/auth/logout").await;

    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);
    let cleared_access = response.cookie("access_token");
    let cleared_refresh = response.cookie("refresh_token");
    assert!(
        cleared_access.value().is_empty(),
        "logout must emit an empty access_token cookie"
    );
    assert!(
        cleared_refresh.value().is_empty(),
        "logout must emit an empty refresh_token cookie"
    );
    let access_max_age = cleared_access
        .max_age()
        .expect("access_token clearing cookie must set Max-Age");
    let refresh_max_age = cleared_refresh
        .max_age()
        .expect("refresh_token clearing cookie must set Max-Age");
    assert_eq!(
        access_max_age.whole_seconds(),
        0,
        "access_token clearing cookie must have Max-Age=0"
    );
    assert_eq!(
        refresh_max_age.whole_seconds(),
        0,
        "refresh_token clearing cookie must have Max-Age=0"
    );
}

/// Garbage cookies do not turn logout into an error - the handler is
/// deliberately tolerant of unknown refresh hashes and undecodable JWTs.
/// Redis is intentionally not started: an undecodable JWT short-circuits
/// before any Redis call, and the unknown refresh hash only touches the DB.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn logout_with_garbage_cookies_returns_204(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/logout")
        .add_header(COOKIE, "access_token=not_a_jwt; refresh_token=not_a_token")
        .await;

    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);
}

/// After logout, the same access cookie must be rejected by `require_auth`
/// (the `jti` is on the Redis blocklist) even though the JWT itself is
/// still cryptographically valid for another 15 minutes.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn logout_blocklists_access_token(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let login = login_with_seed(&env, [21u8; 32]).await;
    assert_eq!(login.status_code(), StatusCode::OK);
    let access = login.cookie("access_token").value().to_owned();
    let refresh = login.cookie("refresh_token").value().to_owned();

    // Sanity: the access cookie works before logout.
    let pre_logout = env
        .server
        .post("/api/v1/tax/calculate-liability")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }))
        .await;
    assert_ne!(
        pre_logout.status_code(),
        StatusCode::UNAUTHORIZED,
        "fresh access cookie must authenticate before logout"
    );

    let logout = env
        .server
        .post("/api/v1/auth/logout")
        .add_header(
            COOKIE,
            format!("access_token={access}; refresh_token={refresh}"),
        )
        .await;
    assert_eq!(logout.status_code(), StatusCode::NO_CONTENT);

    // Same access cookie now blocklisted.
    let post_logout = env
        .server
        .post("/api/v1/tax/calculate-liability")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&serde_json::json!({ "fiscal_year": 2024, "property_ids": [] }))
        .await;
    assert_eq!(
        post_logout.status_code(),
        StatusCode::UNAUTHORIZED,
        "blocklisted access token must be rejected after logout"
    );
}

/// After logout, the refresh family is revoked - replaying the refresh
/// cookie must fail just like a stolen-token reuse attempt.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn logout_revokes_refresh_family(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let login = login_with_seed(&env, [22u8; 32]).await;
    assert_eq!(login.status_code(), StatusCode::OK);
    let refresh = login.cookie("refresh_token").value().to_owned();

    let logout = env
        .server
        .post("/api/v1/auth/logout")
        .add_header(COOKIE, format!("refresh_token={refresh}"))
        .await;
    assert_eq!(logout.status_code(), StatusCode::NO_CONTENT);

    let after = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={refresh}"))
        .await;
    assert_eq!(
        after.status_code(),
        StatusCode::UNAUTHORIZED,
        "refresh-family must be revoked after logout"
    );
}

/// Regression: two concurrent first-logins for the same wallet must both
/// resolve to the same user, not blow up with a unique-violation 500.
///
/// Without `ON CONFLICT` handling on the `wallet_connections` insert (and the
/// users-email placeholder collision), two transactions racing through the
/// "no existing wallet -> insert" branch will both observe an empty SELECT,
/// both INSERT, and the second one will trip the unique constraint at COMMIT.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn concurrent_first_login_resolves_same_user(pool: PgPool) {
    let secret_key = SecretKey::ed25519_from_bytes([42u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex().to_ascii_lowercase();
    let placeholder_email = format!("wallet_{}@leasefi.local", &wallet_address[..40]);

    let pool_a = pool.clone();
    let pool_b = pool.clone();
    let wallet_a = wallet_address.clone();
    let wallet_b = wallet_address.clone();
    let email_a = placeholder_email.clone();
    let email_b = placeholder_email.clone();

    let (result_a, result_b) = tokio::join!(
        api::services::auth::upsert_user_by_wallet(&pool_a, &email_a, &wallet_a, UserRole::Tenant),
        api::services::auth::upsert_user_by_wallet(&pool_b, &email_b, &wallet_b, UserRole::Tenant),
    );

    let UpsertOutcome::Resolved(record_a) =
        result_a.expect("first concurrent upsert must succeed (the race winner inserts the row)")
    else {
        panic!("first concurrent upsert must Resolve - fresh wallets are 'active' on insert");
    };
    let UpsertOutcome::Resolved(record_b) = result_b.expect(
        "second concurrent upsert must succeed (the race loser must resolve to the existing user)",
    ) else {
        panic!("second concurrent upsert must Resolve - the existing row was just inserted active");
    };

    assert_eq!(
        record_a.id, record_b.id,
        "both concurrent upserts must converge on the same user_id"
    );
}

/// Regression: a `POST /auth/login` against a wallet that has no nonce
/// stored in Redis must increment the per-wallet failure counter so
/// repeated attempts hit the 429 ceiling instead of returning 401
/// indefinitely.
///
/// The buggy path returns `Unauthorized` directly from `take_nonce`'s
/// `ok_or_else`, never calling `record_login_failure`. An attacker who
/// only knows a wallet address can then probe the `/auth/login`
/// endpoint without first paying for a `/auth/nonce` round-trip and
/// without ever tripping the rate-limit gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn nonce_miss_counts_toward_rate_limit(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    // Valid-shape wallet address (66 chars = ED25519); we never request a
    // nonce for it, so the login attempts hit the nonce-miss branch every
    // time.
    let wallet_address = "01a234567890abcdef01234567890abcdef01234567890abcdef01234567890abc";
    let signature = "01".to_string() + &"ab".repeat(64);

    // First 5 attempts must surface as 401 (nonce missing) - this is the
    // failure we're counting. LOGIN_FAIL_MAX_ATTEMPTS is 5, so after the
    // 5th miss the counter equals the threshold.
    for attempt in 0..5 {
        let response = env
            .server
            .post("/api/v1/auth/login")
            .json(&serde_json::json!({
                "wallet_address": wallet_address,
                "signature": signature,
            }))
            .await;
        assert_eq!(
            response.status_code(),
            StatusCode::UNAUTHORIZED,
            "attempt {attempt}: nonce-miss must surface as 401 before the limit is reached",
        );
    }

    // 6th attempt: the per-wallet limit must trigger before the handler
    // even consults Redis for a nonce, returning 429.
    let response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature,
        }))
        .await;
    assert_eq!(
        response.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "6th nonce-miss attempt must be rate-limited; otherwise an attacker can probe wallets indefinitely",
    );
}

/// Regression: a second login with the same wallet must invalidate the
/// previously-issued refresh-token family. Without this, an attacker who
/// stole an old `refresh_token` cookie keeps a valid 14-day session even
/// after the legitimate user re-authenticates.
///
/// The buggy `issue_login_refresh_token` inserts a fresh row without
/// touching prior families, so the old hash stays in the active partial
/// index and `POST /auth/refresh` happily rotates it.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn second_login_revokes_first_refresh_family(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let first = login_with_seed(&env, [10u8; 32]).await;
    assert_eq!(first.status_code(), StatusCode::OK);
    let first_refresh = first.cookie("refresh_token").value().to_owned();

    let second = login_with_seed(&env, [10u8; 32]).await;
    assert_eq!(second.status_code(), StatusCode::OK);
    let second_refresh = second.cookie("refresh_token").value().to_owned();

    assert_ne!(
        first_refresh, second_refresh,
        "second login must mint a fresh refresh token (otherwise the test cannot distinguish them)",
    );

    let refresh_with_first = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={first_refresh}"))
        .await;
    assert_eq!(
        refresh_with_first.status_code(),
        StatusCode::UNAUTHORIZED,
        "first refresh token must be invalidated by the second login; otherwise a stolen cookie stays live until natural expiry",
    );

    let refresh_with_second = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={second_refresh}"))
        .await;
    assert_eq!(
        refresh_with_second.status_code(),
        StatusCode::NO_CONTENT,
        "the most recent refresh token must remain valid after the prior family is revoked",
    );
}

/// Regression: deleting a refresh-token row that another row points to
/// via `replaced_by` must be blocked by the FK, so a cleanup job cannot
/// silently break the audit chain.
///
/// The buggy schema declares `replaced_by ... ON DELETE SET NULL`. A
/// cleanup-job that deletes expired/revoked tokens out-of-order (newest
/// first) silently NULLs every predecessor's chain pointer; the family
/// timeline gets shredded with no error to investigate. ON DELETE
/// RESTRICT replaces the silent corruption with a loud FK violation,
/// forcing cleanup policy to either walk chains oldest-first or use
/// soft-delete.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn replaced_by_fk_blocks_chain_breaking_deletes(pool: PgPool) {
    let secret_key = SecretKey::ed25519_from_bytes([55u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex().to_ascii_lowercase();
    let placeholder_email = format!("wallet_{}@leasefi.local", &wallet_address[..40]);

    let UpsertOutcome::Resolved(user) = api::services::auth::upsert_user_by_wallet(
        &pool,
        &placeholder_email,
        &wallet_address,
        UserRole::Tenant,
    )
    .await
    .expect("seed user creation must succeed") else {
        panic!("seed user must Resolve - fresh wallet upserts default to status='active'");
    };

    let predecessor_id = Uuid::new_v4();
    let successor_id = Uuid::new_v4();
    let family_id = Uuid::new_v4();

    sqlx::query!(
        r"
            INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day')
        ",
        predecessor_id,
        user.id,
        &b"predecessor_chain_hash"[..],
        family_id,
    )
    .execute(&pool)
    .await
    .expect("predecessor insert");

    sqlx::query!(
        r"
            INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day')
        ",
        successor_id,
        user.id,
        &b"successor_chain_hash"[..],
        family_id,
    )
    .execute(&pool)
    .await
    .expect("successor insert");

    sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET replaced_by = $1
            WHERE id = $2
        ",
        successor_id,
        predecessor_id,
    )
    .execute(&pool)
    .await
    .expect("wiring predecessor->successor chain");

    let delete_result = sqlx::query!(
        r"
            DELETE FROM refresh_tokens
            WHERE id = $1
        ",
        successor_id,
    )
    .execute(&pool)
    .await;

    assert!(
        delete_result.is_err(),
        "DELETE of a successor must be blocked by FK RESTRICT while a predecessor still points to it; otherwise an out-of-order cleanup silently shreds audit history",
    );

    let chain: Option<Uuid> = sqlx::query_scalar!(
        r"
            SELECT replaced_by
            FROM refresh_tokens
            WHERE id = $1
        ",
        predecessor_id,
    )
    .fetch_one(&pool)
    .await
    .expect("predecessor row must still exist");

    assert_eq!(
        chain,
        Some(successor_id),
        "predecessor.replaced_by must remain pointing at the successor after the blocked DELETE; SET NULL would have silently NULLed it",
    );
}

/// Logging in twice with the same wallet address must return the same
/// `user_id`. The first login creates the row through `upsert_user_by_wallet`;
/// the second must resolve to the existing user via the
/// `wallet_connections` lookup, NOT create a fresh users row.
///
/// Distinct from `concurrent_first_login_resolves_same_user`, which covers
/// the *race* between two simultaneous first-logins (both attempt INSERT,
/// the unique index decides the winner). This test covers the sequential
/// reissue case where the first login has fully committed before the
/// second begins - a different code path through the upsert that goes
/// through "wallet already linked, fetch user" instead of the
/// ON CONFLICT branch. If a future refactor accidentally splits these
/// paths, only the sequential test catches the regression.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn repeated_login_same_wallet_returns_same_user(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;

    let seed = [99u8; 32];

    let first = login_with_seed(&env, seed).await;
    assert_eq!(first.status_code(), StatusCode::OK);
    let first_user_id = first.json::<Value>()["user"]["id"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .expect("first login response must include user.id");

    let second = login_with_seed(&env, seed).await;
    assert_eq!(second.status_code(), StatusCode::OK);
    let second_user_id = second.json::<Value>()["user"]["id"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .expect("second login response must include user.id");

    assert_eq!(
        first_user_id, second_user_id,
        "second login on the same wallet must resolve to the same user_id; otherwise the user gets a fresh account on every reissue and loses all profile/lease history",
    );

    // Belt-and-suspenders: confirm the DB really has only one wallet row.
    let row_count: i64 = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM wallet_connections
            WHERE user_id = $1
        "#,
        first_user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("count query failed");
    assert_eq!(
        row_count, 1,
        "exactly one wallet_connections row must exist after two logins on the same wallet",
    );
}

/// Regression: a user whose `status` column is no longer `'active'` must
/// not be able to log in.
///
/// `users.status` has a CHECK constraint with four values: `active`,
/// `inactive`, `suspended`, `pending_verification`. Only `active` should
/// pass authentication. The buggy `upsert_user_by_wallet` SELECT does not
/// filter on status at all, so a `suspended` user can request a nonce,
/// sign it, and receive a valid 15-minute access token plus a refresh
/// family - which is exactly the situation an admin invoking "suspend"
/// is trying to prevent.
///
/// Sequencing: first login creates the row with status `'active'`
/// (default at INSERT). We then downgrade the status directly via SQL
/// (mirroring the documented admin downgrade procedure) and replay the
/// login. On buggy code the second login returns 200; the fix must
/// return 403 `Forbidden` before issuing any tokens.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn login_blocked_for_suspended_user(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;

    let seed = [42u8; 32];

    let first = login_with_seed(&env, seed).await;
    assert_eq!(
        first.status_code(),
        StatusCode::OK,
        "first login on a fresh wallet must succeed (default status = 'active')",
    );
    let user_id = first.json::<Value>()["user"]["id"]
        .as_str()
        .and_then(|s| Uuid::parse_str(s).ok())
        .expect("first login response must include user.id");

    let updated = sqlx::query!(
        r"
            UPDATE users
            SET status = 'suspended'
            WHERE id = $1
        ",
        user_id,
    )
    .execute(&pool)
    .await
    .expect("manual status downgrade must succeed");
    assert_eq!(
        updated.rows_affected(),
        1,
        "the just-created user row must exist for the downgrade to hit it",
    );

    let second = login_with_seed(&env, seed).await;
    assert_eq!(
        second.status_code(),
        StatusCode::FORBIDDEN,
        "suspended users must be rejected before any token is issued; got {}",
        second.status_code(),
    );
    assert!(
        second.maybe_cookie("access_token").is_none(),
        "no access_token cookie must be set when login is rejected for status",
    );
    assert!(
        second.maybe_cookie("refresh_token").is_none(),
        "no refresh_token cookie must be set when login is rejected for status",
    );
}
