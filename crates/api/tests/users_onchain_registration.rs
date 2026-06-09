//! Integration tests for the on-chain registration data endpoint
//! (`GET /api/v1/users/me/onchain-registration`).
//!
//! HACK (hackathon): the endpoint hands the frontend the `identity_hash` and
//! `role_flags` it needs to call `UserRegistry::create_user` from the user's
//! own wallet. These tests pin its contract: auth required, wallet-linked
//! precondition, deterministic hash, and the `onchain_user_id` exposed (null)
//! on the profile.

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;

use common::TestEnv;

/// Password satisfying the registration policy (>= 8 chars, a digit, mixed
/// case). Reused by the password-user fixtures below.
const VALID_PASSWORD: &str = "Sup3rSecret";

/// Registers a fresh password user and returns the auto-login `access_token`
/// cookie. These users have no linked wallet - exactly the precondition the
/// 409 and null-`onchain_user_id` assertions rely on.
async fn register_password_user(env: &TestEnv, email: &str) -> String {
    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": email,
            "password": VALID_PASSWORD,
            "first_name": "No",
            "last_name": "Wallet",
        }))
        .await;
    assert_eq!(
        response.status_code(),
        StatusCode::OK,
        "registration must succeed"
    );
    response.cookie("access_token").value().to_owned()
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn onchain_registration_requires_authentication(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/users/me/onchain-registration")
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn onchain_registration_returns_hash_and_flags(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    // A wallet login both creates the user and links the wallet, so the
    // precondition is satisfied without a separate link step.
    let session = common::login_and_extract(&env).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/users/me/onchain-registration",
        &session.access_token,
        &json!({}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("200 returns a JSON body");

    // identity_hash is the lowercase hex of 32 bytes (64 chars) and must not
    // be all-zero, which the contract rejects as MissingIdentityHash.
    let identity_hash = body["identity_hash"]
        .as_str()
        .expect("identity_hash is a string");
    assert_eq!(identity_hash.len(), 64, "sha256 hex is 64 chars");
    assert!(
        identity_hash.chars().all(|c| c.is_ascii_hexdigit()),
        "identity_hash must be hex"
    );
    assert!(
        identity_hash.chars().any(|c| c != '0'),
        "identity_hash must not be all zeros"
    );

    // Wallet-login users default to Tenant -> ROLE_FLAG_TENANT (1).
    assert_eq!(body["role_flags"].as_u64(), Some(1));
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn onchain_registration_identity_hash_is_deterministic(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;

    let empty = json!({});
    let uri = "/api/v1/users/me/onchain-registration";
    let (_, first) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        uri,
        &session.access_token,
        &empty,
    )
    .await;
    let (_, second) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        uri,
        &session.access_token,
        &empty,
    )
    .await;

    let first_hash = first.expect("first call has a body")["identity_hash"]
        .as_str()
        .expect("identity_hash is a string")
        .to_owned();
    let second_hash = second.expect("second call has a body")["identity_hash"]
        .as_str()
        .expect("identity_hash is a string")
        .to_owned();

    assert_eq!(
        first_hash, second_hash,
        "identity_hash for the same user must be stable across calls"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn onchain_registration_conflicts_without_wallet(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = register_password_user(&env, "nowallet@example.com").await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/users/me/onchain-registration",
        &access_token,
        &json!({}),
    )
    .await;

    // No wallet linked yet -> the onboarding-order gate returns 409.
    assert_eq!(status, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn me_exposes_null_onchain_user_id_before_registration(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = register_password_user(&env, "preonchain@example.com").await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/users/me",
        &access_token,
        &json!({}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("200 returns a JSON body");

    // The field is always present in the profile shape, and null until the
    // indexer writes the contract-assigned id.
    assert!(
        body.get("onchain_user_id").is_some(),
        "onchain_user_id must be part of the profile shape"
    );
    assert!(
        body["onchain_user_id"].is_null(),
        "onchain_user_id must be null before on-chain registration"
    );
}
