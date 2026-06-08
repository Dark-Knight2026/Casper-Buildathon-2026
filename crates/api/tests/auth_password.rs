//! Integration tests for email + password authentication.

mod common;

use axum::http::StatusCode;
use secrecy::SecretString;
use serde_json::{Value, json};
use sqlx::PgPool;

use api::{UserRole, common::VerificationLevel, services::auth};

/// A password that satisfies the policy: >= 8 chars, has a digit, and mixes
/// case. Reused across the happy-path tests so a single fixture documents what
/// "valid" means.
const VALID_PASSWORD: &str = "Sup3rSecret";

/// Auth-relevant columns of a `users` row, read back via a runtime
/// `query_as` (no compile-time `query!` macro, so the tests stay independent
/// of the `.sqlx` cache). Nullable columns map to `Option`.
#[derive(sqlx::FromRow)]
struct UserAuthRow {
    /// `users.primary_auth_method` (NOT NULL): `'wallet' | 'password' | 'oauth'`.
    primary_auth_method: String,
    /// Argon2id PHC hash; `None` for wallet-only accounts.
    password_hash: Option<String>,
    /// Account status; `None` only if the column ever loses its default.
    status: Option<String>,
    /// Whether the email is confirmed.
    email_verified: Option<bool>,
    /// Aggregate verification level (NOT NULL): `'none' | 'email' | ...`.
    verification_level: String,
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_creates_user_and_logs_in(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;

    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "John@Example.com",
            "password": VALID_PASSWORD,
            "first_name": "John",
            "last_name": "Doe",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);

    // Auto-login: both auth cookies must be set.
    let access_token = response.cookie("access_token").value().to_owned();
    let refresh_token = response.cookie("refresh_token").value().to_owned();
    assert!(!access_token.is_empty(), "access_token cookie must be set");
    assert!(
        !refresh_token.is_empty(),
        "refresh_token cookie must be set"
    );

    // Body carries the normalized email and the registration defaults.
    let body = response.json::<Value>();
    assert_eq!(body["user"]["email"], "john@example.com");
    assert_eq!(body["user"]["role"], "tenant");
    assert_eq!(body["user"]["verification_level"], "none");

    // The access JWT decodes and carries verification_level = none.
    let claims = auth::decode_token(&access_token, &SecretString::from(env.jwt_secret.clone()))
        .expect("access token decodes");
    assert_eq!(claims.role, UserRole::Tenant);
    assert_eq!(claims.verification_level, Some(VerificationLevel::None));

    // The row reflects a password account, not a wallet one.
    let row = sqlx::query_as::<_, UserAuthRow>(
        r"
            SELECT primary_auth_method, password_hash, status, email_verified, verification_level
            FROM users
            WHERE email = $1
        ",
    )
    .bind("john@example.com")
    .fetch_one(&pool)
    .await
    .expect("user row exists");

    assert_eq!(row.primary_auth_method, "password");
    assert!(row.password_hash.is_some(), "password_hash must be stored");
    assert_eq!(row.status.as_deref(), Some("pending_verification"));
    assert_eq!(row.email_verified, Some(false));
    assert_eq!(row.verification_level, "none");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_duplicate_email_returns_409(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let payload = json!({
        "email": "dup@example.com",
        "password": VALID_PASSWORD,
        "first_name": "Dup",
        "last_name": "User",
    });

    let first = env
        .server
        .post("/api/v1/auth/register")
        .json(&payload)
        .await;
    assert_eq!(first.status_code(), StatusCode::OK);

    let second = env
        .server
        .post("/api/v1/auth/register")
        .json(&payload)
        .await;
    assert_eq!(second.status_code(), StatusCode::CONFLICT);
}

/// `John@X.com` and `john@x.com` must collapse to one account: the second
/// registration hits the same normalized email and is rejected with 409.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_normalizes_email_case(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let first = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "Alice@Example.com",
            "password": VALID_PASSWORD,
            "first_name": "Alice",
            "last_name": "A",
        }))
        .await;
    assert_eq!(first.status_code(), StatusCode::OK);

    let second = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "alice@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Alice",
            "last_name": "A",
        }))
        .await;
    assert_eq!(second.status_code(), StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_rejects_invalid_email(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "not-an-email",
            "password": VALID_PASSWORD,
            "first_name": "Bad",
            "last_name": "Email",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_rejects_short_password(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "short@example.com",
            "password": "Ab1",
            "first_name": "Short",
            "last_name": "Pass",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// Password is long enough but has no digit - the policy must still reject it.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_rejects_password_without_digit(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "nodigit@example.com",
            "password": "NoDigitsHere",
            "first_name": "No",
            "last_name": "Digit",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// `admin` is not self-registerable; requesting it must fail fast with 400
/// rather than silently downgrading or provisioning a privileged account.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_rejects_non_self_registerable_role(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "admin@example.com",
            "password": VALID_PASSWORD,
            "role": "admin",
            "first_name": "Admin",
            "last_name": "Wannabe",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// Registers a password account, then logs in with the same credentials and
/// the same email under a different case - login must normalize it, set both
/// auth cookies, and mint an access JWT carrying the user's role and level.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_succeeds_with_valid_credentials(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let register = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "login@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Log",
            "last_name": "In",
        }))
        .await;
    assert_eq!(register.status_code(), StatusCode::OK);

    // Mixed case on login proves the handler normalizes before lookup.
    let response = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({
            "email": "Login@Example.com",
            "password": VALID_PASSWORD,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);

    let access_token = response.cookie("access_token").value().to_owned();
    let refresh_token = response.cookie("refresh_token").value().to_owned();
    assert!(!access_token.is_empty(), "access_token cookie must be set");
    assert!(
        !refresh_token.is_empty(),
        "refresh_token cookie must be set"
    );

    let body = response.json::<Value>();
    assert_eq!(body["user"]["email"], "login@example.com");

    let claims = auth::decode_token(&access_token, &SecretString::from(env.jwt_secret.clone()))
        .expect("access token decodes");
    assert_eq!(claims.role, UserRole::Tenant);
    assert_eq!(claims.verification_level, Some(VerificationLevel::None));
}

/// A wrong password for a real account yields the generic 401 - no hint that
/// the email exists.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rejects_wrong_password(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let register = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "wrongpass@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Wrong",
            "last_name": "Pass",
        }))
        .await;
    assert_eq!(register.status_code(), StatusCode::OK);

    let response = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({
            "email": "wrongpass@example.com",
            "password": "Different1Pass",
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// An unknown email returns the same generic 401 as a wrong password - the
/// anti-enumeration guarantee.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rejects_unknown_email(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({
            "email": "ghost@example.com",
            "password": VALID_PASSWORD,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// A wallet-only account (`password_hash IS NULL`) cannot be logged into with
/// a password: the handler treats the NULL hash exactly like a wrong password
/// and returns the generic 401.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rejects_wallet_only_account(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;

    sqlx::query(
        r"
            INSERT INTO users (email, primary_auth_method, role, first_name, last_name, status)
            VALUES ($1, 'wallet', 'tenant', 'Wallet', 'Only', 'active')
        ",
    )
    .bind("walletonly@example.com")
    .execute(&pool)
    .await
    .expect("insert wallet-only user");

    let response = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({
            "email": "walletonly@example.com",
            "password": VALID_PASSWORD,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// A suspended account has valid credentials but must not receive tokens: the
/// status gate rejects it with 403, distinct from the credential-failure 401.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rejects_suspended_account(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;

    let register = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "suspended@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Sus",
            "last_name": "Pended",
        }))
        .await;
    assert_eq!(register.status_code(), StatusCode::OK);

    sqlx::query("UPDATE users SET status = 'suspended' WHERE email = $1")
        .bind("suspended@example.com")
        .execute(&pool)
        .await
        .expect("suspend the account");

    let response = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({
            "email": "suspended@example.com",
            "password": VALID_PASSWORD,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::FORBIDDEN);
}
