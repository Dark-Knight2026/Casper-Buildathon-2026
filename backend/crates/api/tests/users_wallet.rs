//! Integration tests for linking a Casper wallet to an account
//! (`POST /api/v1/users/me/wallet`).

mod common;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use casper_types::{AsymmetricType, PublicKey, SecretKey};
use serde_json::{Value, json};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use common::{TestEnv, generate_random_ed25519, login_and_extract, sign_with_prefix};

/// A password satisfying the registration policy (>= 8 chars, a digit, mixed
/// case). The wallet-link tests only need a logged-in account, not a specific
/// password, so one fixture suffices.
const VALID_PASSWORD: &str = "Sup3rSecret";

/// Registers a password account and returns its `access_token` cookie value.
///
/// Wallet-link is a protected endpoint, so every link test needs an
/// authenticated session; registration auto-logs-in, so the cookie is the only
/// artifact the tests care about here.
async fn register_password_user(env: &TestEnv, email: &str) -> String {
    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": email,
            "password": VALID_PASSWORD,
            "first_name": "Pat",
            "last_name": "Holder",
        }))
        .await;
    assert_eq!(response.status_code(), StatusCode::CREATED);
    response.cookie("access_token").value().to_owned()
}

/// Fetches a login nonce for `wallet_address` and signs it with the given
/// keypair, returning the hex signature ready to post.
async fn fetch_and_sign_nonce(
    env: &TestEnv,
    wallet_address: &str,
    secret_key: &SecretKey,
    public_key: &PublicKey,
) -> String {
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"]
        .as_str()
        .expect("nonce message present");
    sign_with_prefix(message, secret_key, public_key)
}

/// `is_primary` + `provider` of a `wallet_connections` row, read back via a
/// runtime `query_as` (no compile-time macro in tests).
#[derive(FromRow)]
struct WalletConnectionRow {
    is_primary: bool,
    provider: String,
    account_hash: Option<String>,
}

/// Derives the canonical account hash (bare 64-char lowercase hex) the link
/// path is expected to cache for a public key, mirroring
/// `common::crypto::derive_account_hash`.
fn expected_account_hash(public_key: &PublicKey) -> String {
    let formatted = public_key.to_account_hash().to_formatted_string();
    formatted
        .strip_prefix("account-hash-")
        .unwrap_or(&formatted)
        .to_ascii_lowercase()
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn link_wallet_persists_connection_and_syncs_cache(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let access = register_password_user(&env, "holder@example.com").await;

    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex().to_ascii_lowercase();
    let signature = fetch_and_sign_nonce(&env, &wallet_address, &secret_key, &public_key).await;

    let response = env
        .server
        .post("/api/v1/users/me/wallet")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&json!({
            "wallet_address": wallet_address,
            "signature": signature,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);

    // The response echoes the updated profile, including the now-cached address.
    let body = response.json::<Value>();
    assert_eq!(
        body["wallet_address"].as_str(),
        Some(wallet_address.as_str())
    );

    // The first wallet a user links becomes primary.
    let connection = sqlx::query_as::<_, WalletConnectionRow>(
        r"
            SELECT is_primary, provider, account_hash
            FROM wallet_connections
            WHERE wallet_address = $1
        ",
    )
    .bind(&wallet_address)
    .fetch_one(&pool)
    .await
    .expect("wallet_connections row exists");

    assert!(connection.is_primary, "first linked wallet must be primary");
    assert_eq!(connection.provider, "casper_wallet");

    // The link path caches the derived account hash so the indexer can match
    // `UserCreated` events without re-deriving every wallet.
    let account_hash = expected_account_hash(&public_key);
    assert_eq!(
        connection.account_hash.as_deref(),
        Some(account_hash.as_str()),
        "the linked wallet must cache its derived account hash"
    );

    // The AFTER-trigger synced both cached columns on `users`.
    let cached = sqlx::query_as::<_, (Option<String>, Option<String>)>(
        r"
            SELECT wallet_address, account_hash
            FROM users
            WHERE email = $1
        ",
    )
    .bind("holder@example.com")
    .fetch_one(&pool)
    .await
    .expect("user row exists");

    assert_eq!(cached.0.as_deref(), Some(wallet_address.as_str()));
    assert_eq!(
        cached.1.as_deref(),
        Some(account_hash.as_str()),
        "trigger must sync users.account_hash from the primary connection"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn link_wallet_rejects_invalid_signature(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let access = register_password_user(&env, "holder@example.com").await;

    let (_real_secret, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex().to_ascii_lowercase();

    // Sign the nonce with a DIFFERENT keypair: the signature is well-formed
    // (correct length/algorithm) but does not match `wallet_address`, so the
    // handler reaches `verify -> false` and returns 401, not a 400 format error.
    let (other_secret, other_public) = generate_random_ed25519();
    let signature = fetch_and_sign_nonce(&env, &wallet_address, &other_secret, &other_public).await;

    let response = env
        .server
        .post("/api/v1/users/me/wallet")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&json!({
            "wallet_address": wallet_address,
            "signature": signature,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);

    // No connection was written.
    let count = sqlx::query_scalar::<_, i64>(
        r"
            SELECT COUNT(*)
            FROM wallet_connections
            WHERE wallet_address = $1
        ",
    )
    .bind(&wallet_address)
    .fetch_one(&pool)
    .await
    .expect("count query runs");

    assert_eq!(count, 0, "rejected link must not write a connection");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn link_wallet_rejects_wallet_owned_by_another_account(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;

    // Account A owns the wallet via a wallet login.
    let owner = login_and_extract(&env).await;
    let wallet_address = owner.public_key.to_hex().to_ascii_lowercase();

    // Account B (password) tries to link A's wallet. The test holds A's secret
    // key, so it can produce a VALID signature - the request clears signature
    // verification and is rejected by the ownership gate (409), not as a 401.
    let access_b = register_password_user(&env, "bob@example.com").await;
    let signature =
        fetch_and_sign_nonce(&env, &wallet_address, &owner.secret_key, &owner.public_key).await;

    let response = env
        .server
        .post("/api/v1/users/me/wallet")
        .add_header(COOKIE, format!("access_token={access_b}"))
        .json(&json!({
            "wallet_address": wallet_address,
            "signature": signature,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::CONFLICT);

    // The wallet still belongs only to account A: exactly one connection row.
    let count = sqlx::query_scalar::<_, i64>(
        r"
            SELECT COUNT(*)
            FROM wallet_connections
            WHERE wallet_address = $1
        ",
    )
    .bind(&wallet_address)
    .fetch_one(&pool)
    .await
    .expect("count query runs");

    assert_eq!(count, 1, "rejected link must not add a second owner");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn link_wallet_requires_authentication(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;

    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex().to_ascii_lowercase();
    let signature = fetch_and_sign_nonce(&env, &wallet_address, &secret_key, &public_key).await;

    // No access cookie: the protected-tier middleware rejects before the
    // handler runs.
    let response = env
        .server
        .post("/api/v1/users/me/wallet")
        .json(&json!({
            "wallet_address": wallet_address,
            "signature": signature,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn wallet_login_resolves_same_user_on_relogin(pool: PgPool) {
    // Regression: extracting `add_wallet_connection` out of `upsert_user_by_wallet`
    // must not break the wallet-login path. A second login with the same wallet
    // must resolve the existing user, not create a duplicate.
    let env = common::setup_test_server(pool.clone(), true).await;

    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex();

    let first = wallet_login(&env, &wallet_address, &secret_key, &public_key).await;
    let second = wallet_login(&env, &wallet_address, &secret_key, &public_key).await;

    assert_eq!(first, second, "relogin must resolve the same user");

    // Exactly one user and one (primary) connection exist for the wallet.
    let count = sqlx::query_scalar::<_, i64>(
        r"
            SELECT COUNT(*)
            FROM wallet_connections
            WHERE wallet_address = $1 AND is_primary = true
        ",
    )
    .bind(wallet_address.to_ascii_lowercase())
    .fetch_one(&pool)
    .await
    .expect("count query runs");

    assert_eq!(count, 1, "relogin must not duplicate the connection");
}

/// Runs a full nonce -> sign -> wallet-login round-trip and returns the
/// resolved user id. Unlike `common::login_and_extract`, it accepts a caller-
/// owned keypair so a test can log in twice under the same wallet.
async fn wallet_login(
    env: &TestEnv,
    wallet_address: &str,
    secret_key: &SecretKey,
    public_key: &PublicKey,
) -> Uuid {
    let signature = fetch_and_sign_nonce(env, wallet_address, secret_key, public_key).await;
    let response = env
        .server
        .post("/api/v1/auth/login/wallet")
        .json(&json!({
            "wallet_address": wallet_address,
            "signature": signature,
        }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    Uuid::parse_str(body["user"]["id"].as_str().expect("user id present")).expect("user id is UUID")
}
