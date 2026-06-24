//! Integration tests for email + password authentication.

mod common;

use axum::http::StatusCode;
use axum_test::{TestResponse, http::header::COOKIE};
use secrecy::SecretString;
use serde_json::{Value, json};
use sqlx::{FromRow, PgPool};

use api::{
    UserRole,
    common::{RedisStore, VerificationLevel, tokens},
    services::auth,
};
use common::{CapturingMailer, TestEnv};

/// A password that satisfies the policy: >= 8 chars, has a digit, and mixes
/// case. Reused across the happy-path tests so a single fixture documents what
/// "valid" means.
const VALID_PASSWORD: &str = "Sup3rSecret";

/// The replacement password the reset tests install. Distinct from
/// [`VALID_PASSWORD`] so a test can prove the swap took effect by logging in
/// with one and being rejected with the other.
const NEW_PASSWORD: &str = "N3wPassword";

/// Auth-relevant columns of a `users` row, read back via a runtime
/// `query_as`. Nullable columns map to `Option`.
#[derive(FromRow)]
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
    // Redis-isolated: registration now writes a per-IP rate-limit counter, and
    // the IP key (127.0.0.1) is shared across tests, so a dedicated container
    // keeps the counter from bleeding between parallel runs.
    let env = common::setup_test_server(pool.clone(), true).await;

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

    assert_eq!(response.status_code(), StatusCode::CREATED);

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
    let claims =
        auth::jwt::decode_token(&access_token, &SecretString::from(env.jwt_secret.clone()))
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
    let env = common::setup_test_server(pool, true).await;
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
    assert_eq!(first.status_code(), StatusCode::CREATED);

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
    let env = common::setup_test_server(pool, true).await;

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
    assert_eq!(first.status_code(), StatusCode::CREATED);

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
    let env = common::setup_test_server(pool, true).await;

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
    let env = common::setup_test_server(pool, true).await;

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
    let env = common::setup_test_server(pool, true).await;

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
    let env = common::setup_test_server(pool, true).await;

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
    let env = common::setup_test_server(pool, true).await;

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
    assert_eq!(register.status_code(), StatusCode::CREATED);

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

    let claims =
        auth::jwt::decode_token(&access_token, &SecretString::from(env.jwt_secret.clone()))
            .expect("access token decodes");
    assert_eq!(claims.role, UserRole::Tenant);
    assert_eq!(claims.verification_level, Some(VerificationLevel::None));
}

/// A wrong password for a real account yields the generic 401 - no hint that
/// the email exists.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rejects_wrong_password(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

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
    assert_eq!(register.status_code(), StatusCode::CREATED);

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
    let env = common::setup_test_server(pool, true).await;

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
    let env = common::setup_test_server(pool.clone(), true).await;

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
    let env = common::setup_test_server(pool.clone(), true).await;

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
    assert_eq!(register.status_code(), StatusCode::CREATED);

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

// Forgot / reset password -----------------------------------------------------

/// Registers a password account and returns the full registration response, so
/// a caller can read back the auto-login `access_token` / `refresh_token`
/// cookies when it needs to prove they get revoked.
async fn register_account(env: &TestEnv, email: &str) -> TestResponse {
    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": email,
            "password": VALID_PASSWORD,
            "first_name": "For",
            "last_name": "Got",
        }))
        .await;
    assert_eq!(response.status_code(), StatusCode::CREATED);
    response
}

/// Posts `forgot`, asserts the anti-enumeration `200 { status: "sent" }`, and
/// returns the plaintext reset token parsed from the captured email.
///
/// The reset link shares the `?token=...` shape with the verify-email link, so
/// the same `extract_verify_token` helper recovers the plaintext (it also
/// asserts the token is exactly `TOKEN_STR_LEN` chars).
async fn forgot_and_take_token(env: &TestEnv, mailer: &CapturingMailer, email: &str) -> String {
    let response = env
        .server
        .post("/api/v1/auth/password/forgot")
        .json(&json!({ "email": email }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(response.json::<Value>()["status"], "sent");
    common::extract_verify_token(mailer)
}

/// A live account with a password gets a reset link: the response is `sent` and
/// exactly one reset email - addressed and worded as a reset, not a verify - is
/// captured.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn forgot_password_mails_reset_link_for_password_account(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    register_account(&env, "forgot@example.com").await;

    // Mixed case proves the handler normalizes before the lookup.
    let response = env
        .server
        .post("/api/v1/auth/password/forgot")
        .json(&json!({ "email": "Forgot@Example.com" }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(response.json::<Value>()["status"], "sent");

    let messages = mailer.sent.lock().expect("mailer mutex");
    assert_eq!(messages.len(), 1, "exactly one reset email");
    assert_eq!(messages[0].subject, "Reset your password");
    assert!(
        messages[0].body.contains("/reset-password?token="),
        "body carries the reset link"
    );
}

/// Anti-enumeration: an unknown email gets the same `sent` answer and NO email,
/// so the endpoint cannot be used to discover which addresses are registered.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn forgot_password_is_silent_for_unknown_email(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;

    let response = env
        .server
        .post("/api/v1/auth/password/forgot")
        .json(&json!({ "email": "ghost@example.com" }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(response.json::<Value>()["status"], "sent");
    assert!(
        mailer.sent.lock().expect("mailer mutex").is_empty(),
        "no email is sent for an unknown address"
    );
}

/// Anti-enumeration: a wallet-only account (`password_hash IS NULL`) has no
/// password to reset, so it gets the same `sent` answer and no email - it is
/// indistinguishable from a password account.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn forgot_password_is_silent_for_wallet_only_account(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool.clone(), true).await;

    sqlx::query(
        r"
            INSERT INTO users (email, primary_auth_method, role, first_name, last_name, status)
            VALUES ($1, 'wallet', 'tenant', 'Wallet', 'Only', 'active')
        ",
    )
    .bind("walletforgot@example.com")
    .execute(&pool)
    .await
    .expect("insert wallet-only user");

    let response = env
        .server
        .post("/api/v1/auth/password/forgot")
        .json(&json!({ "email": "walletforgot@example.com" }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(response.json::<Value>()["status"], "sent");
    assert!(
        mailer.sent.lock().expect("mailer mutex").is_empty(),
        "no email is sent for a wallet-only account"
    );
}

/// Happy path: a valid token swaps the stored hash and auto-logs the user in.
/// The old password stops authenticating and the new one starts.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reset_password_with_valid_token_swaps_credentials(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    register_account(&env, "reset@example.com").await;
    let token = forgot_and_take_token(&env, &mailer, "reset@example.com").await;

    let response = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token, "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert!(
        !response.cookie("access_token").value().is_empty(),
        "auto-login re-issues an access_token cookie"
    );
    assert!(
        !response.cookie("refresh_token").value().is_empty(),
        "auto-login re-issues a refresh_token cookie"
    );

    // The old password no longer authenticates.
    let old = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "reset@example.com", "password": VALID_PASSWORD }))
        .await;
    assert_eq!(old.status_code(), StatusCode::UNAUTHORIZED);

    // The new password does.
    let new = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "reset@example.com", "password": NEW_PASSWORD }))
        .await;
    assert_eq!(new.status_code(), StatusCode::OK);
}

/// A well-formed but unknown token is rejected with the generic 400 and leaves
/// the stored hash untouched: the original password still logs in.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reset_password_rejects_invalid_token(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    register_account(&env, "badtoken@example.com").await;

    // 43 chars clears the length check, so the failure is a genuine Redis miss
    // rather than a shape rejection.
    let response = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": "A".repeat(43), "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

    // Hash untouched: the original password still authenticates.
    let login = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "badtoken@example.com", "password": VALID_PASSWORD }))
        .await;
    assert_eq!(login.status_code(), StatusCode::OK);
}

/// A reset kills every prior session: the pre-reset access + refresh tokens are
/// both force-revoked, while the auto-login pair survives the very cutoff that
/// killed them (the `iat = cutoff + 1s` invariant). Stronger than change
/// password, which keeps the current device.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reset_password_invalidates_all_sessions(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    let register = register_account(&env, "sessions@example.com").await;
    let old_access = register.cookie("access_token").value().to_owned();
    let old_refresh = register.cookie("refresh_token").value().to_owned();

    let token = forgot_and_take_token(&env, &mailer, "sessions@example.com").await;
    let reset = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token, "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(reset.status_code(), StatusCode::OK);
    let new_access = reset.cookie("access_token").value().to_owned();
    let new_refresh = reset.cookie("refresh_token").value().to_owned();

    // The pre-reset access token is force-revoked (iat <= cutoff).
    let old_me = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={old_access}"))
        .await;
    assert_eq!(old_me.status_code(), StatusCode::UNAUTHORIZED);

    // The auto-login access token survives the cutoff it just set.
    let new_me = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={new_access}"))
        .await;
    assert_eq!(new_me.status_code(), StatusCode::OK);

    // The pre-reset refresh family is revoked - it cannot be rotated.
    let old_rotate = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={old_refresh}"))
        .await;
    assert_eq!(old_rotate.status_code(), StatusCode::UNAUTHORIZED);

    // The auto-login refresh token rotates cleanly.
    let new_rotate = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={new_refresh}"))
        .await;
    assert_eq!(new_rotate.status_code(), StatusCode::NO_CONTENT);
}

/// The reset token is single-use: the `GETDEL` consumes the slot on the first
/// redeem, so the same token misses on a second attempt.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reset_password_token_is_single_use(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    register_account(&env, "singleuse@example.com").await;
    let token = forgot_and_take_token(&env, &mailer, "singleuse@example.com").await;

    let first = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token.clone(), "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(first.status_code(), StatusCode::OK);

    // The slot was consumed; the same token now misses.
    let second = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token, "new_password": "An0therPass" }))
        .await;
    assert_eq!(second.status_code(), StatusCode::BAD_REQUEST);
}

/// The reset slot carries a positive TTL (it was stored with `EX`), and once
/// that TTL elapses the token is rejected with the generic 400 - TTL
/// enforcement is the only thing stopping an intercepted link from being
/// redeemable forever. A slot stored without expiry would read `TTL = -1` and
/// fail the first assertion.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reset_password_rejects_expired_token(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    register_account(&env, "expired@example.com").await;
    let token = forgot_and_take_token(&env, &mailer, "expired@example.com").await;

    let hash = tokens::hash_presented(&token);
    let key = RedisStore::password_reset_key(&hash);
    let redis_env = env.redis.as_ref().expect("redis env");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("redis connection");

    // The freshly-issued slot must have a positive, bounded TTL: proof it was
    // stored with `EX` and is not a permanent (TTL = -1) entry.
    let ttl = redis::cmd("TTL")
        .arg(&key)
        .query_async::<i64>(&mut conn)
        .await
        .expect("TTL on reset slot");
    assert!(
        ttl > 0 && ttl <= 30 * 60,
        "reset slot must carry a positive bounded TTL, got {ttl}"
    );

    // Force the slot to expire (EXPIRE 0 evicts it immediately, the same effect
    // the TTL has) and confirm the redeem path now rejects the token with 400.
    redis::cmd("EXPIRE")
        .arg(&key)
        .arg(0)
        .query_async::<i64>(&mut conn)
        .await
        .expect("EXPIRE the reset slot");

    let response = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token, "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// A weak new password on reset is rejected (400) WITHOUT burning the one-shot
/// token: the policy check runs before the Redis `GETDEL`, so the same token
/// then completes the reset with a valid password. Pins the documented
/// "fat-finger keeps the token live" UX invariant.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reset_password_weak_password_preserves_token(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    register_account(&env, "fatfinger@example.com").await;
    let token = forgot_and_take_token(&env, &mailer, "fatfinger@example.com").await;

    // A weak password fails the policy with 400 before the token is consumed.
    let weak = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token.clone(), "new_password": "weak" }))
        .await;
    assert_eq!(weak.status_code(), StatusCode::BAD_REQUEST);

    // The token survived: the same one now completes the reset with a valid
    // password and re-logs the user in.
    let strong = env
        .server
        .post("/api/v1/auth/password/reset")
        .json(&json!({ "token": token, "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(strong.status_code(), StatusCode::OK);
}

// Rate limiting ---------------------------------------------------------------

/// Posts a registration with a distinct email, returning the raw response so a
/// caller can assert any status (200 / 429). Every call hits the same client IP
/// (the test transport's 127.0.0.1), which is what the per-IP limiter keys on.
async fn post_register(env: &TestEnv, email: &str) -> TestResponse {
    env.server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": email,
            "password": VALID_PASSWORD,
            "first_name": "Rate",
            "last_name": "Limit",
        }))
        .await
}

/// Posts a password login, returning the raw response so a caller can assert
/// any status (200 / 401 / 429).
async fn post_login(env: &TestEnv, email: &str, password: &str) -> TestResponse {
    env.server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": email, "password": password }))
        .await
}

/// Deletes the per-email failed-login counter to simulate the 60-second window
/// having elapsed, without sleeping in CI - the same trick the verify-email
/// rate-limit tests use on their send counter.
async fn clear_login_fail_window(env: &TestEnv, email: &str) {
    let redis_env = env.redis.as_ref().expect("redis env");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("redis connection");
    redis::cmd("DEL")
        .arg(RedisStore::password_login_fail_key(email))
        .query_async::<()>(&mut conn)
        .await
        .expect("DEL login-fail key");
}

/// Five registrations from one client IP fit under the per-IP cap; the sixth is
/// rejected with 429 before any work runs. The emails are all distinct, proving
/// the limiter keys on the IP rather than the address.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_rate_limited_after_five_attempts_per_ip(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    for index in 0..5 {
        let response = post_register(&env, &format!("burst{index}@example.com")).await;
        assert_eq!(
            response.status_code(),
            StatusCode::CREATED,
            "registration {index} is within the per-IP cap"
        );
    }

    let blocked = post_register(&env, "burst5@example.com").await;
    assert_eq!(blocked.status_code(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        blocked.json::<Value>()["error"].as_str(),
        Some("rate_limited")
    );
}

/// Malformed registration bodies must not consume the per-IP rate-limit
/// window: the counter is bumped only for well-formed requests. On the pre-fix
/// code the limiter ran (and recorded the attempt) before validation, so five
/// invalid bodies burned the window and the following valid registration was
/// rejected with 429.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn register_invalid_bodies_do_not_consume_rate_limit(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    // Five malformed registrations (invalid email) from the same client IP.
    for _ in 0..5 {
        let response = env
            .server
            .post("/api/v1/auth/register")
            .json(&json!({
                "email": "not-an-email",
                "password": VALID_PASSWORD,
                "first_name": "Bad",
                "last_name": "Body",
            }))
            .await;
        assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    }

    // A well-formed registration must still succeed: the malformed bodies
    // above must not have counted toward the per-IP cap.
    let valid = post_register(&env, "valid@example.com").await;
    assert_eq!(
        valid.status_code(),
        StatusCode::CREATED,
        "invalid bodies must not consume the registration rate-limit window"
    );
}

/// Five failed logins for one email exhaust the per-email failure cap; the
/// sixth is rejected by the limiter (429) rather than the credential check
/// (401). The email never existed, so the 429 also doubles as proof the limiter
/// runs ahead of - and is indistinguishable from - the anti-enumeration path.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rate_limited_after_five_failures(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    for _ in 0..5 {
        let response = post_login(&env, "victim@example.com", "WrongGuess1").await;
        assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    }

    let blocked = post_login(&env, "victim@example.com", "WrongGuess1").await;
    assert_eq!(blocked.status_code(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        blocked.json::<Value>()["error"].as_str(),
        Some("rate_limited")
    );
}

/// While the limiter is tripped even the correct password is blocked (429); once
/// the window elapses the same correct password logs in. Proves the lockout is
/// time-bounded, not permanent, and that the gate runs before credential
/// verification.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn password_login_rate_limit_lifts_after_window(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    register_account(&env, "windowed@example.com").await;

    for _ in 0..5 {
        let response = post_login(&env, "windowed@example.com", "WrongGuess1").await;
        assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    }

    // The correct password is still blocked - the limiter sits ahead of the
    // credential check.
    let blocked = post_login(&env, "windowed@example.com", VALID_PASSWORD).await;
    assert_eq!(blocked.status_code(), StatusCode::TOO_MANY_REQUESTS);

    // Simulate the 60-second window resetting, then the correct password works.
    clear_login_fail_window(&env, "windowed@example.com").await;
    let allowed = post_login(&env, "windowed@example.com", VALID_PASSWORD).await;
    assert_eq!(
        allowed.status_code(),
        StatusCode::OK,
        "the limiter lifts once the window resets"
    );
}

/// A second forgot-password request within the per-minute window still answers
/// the anti-enumeration `200 { sent }`, but the send limiter suppresses the
/// second email so only one reset link goes out.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn forgot_password_send_is_rate_limited_to_one_per_minute(pool: PgPool) {
    let (env, mailer) = common::setup_test_server_capturing(pool, true).await;
    register_account(&env, "throttle@example.com").await;

    let first = env
        .server
        .post("/api/v1/auth/password/forgot")
        .json(&json!({ "email": "throttle@example.com" }))
        .await;
    assert_eq!(first.status_code(), StatusCode::OK);

    let second = env
        .server
        .post("/api/v1/auth/password/forgot")
        .json(&json!({ "email": "throttle@example.com" }))
        .await;
    assert_eq!(second.status_code(), StatusCode::OK);
    assert_eq!(second.json::<Value>()["status"], "sent");

    let messages = mailer.sent.lock().expect("mailer mutex");
    assert_eq!(
        messages.len(),
        1,
        "the per-minute send cap suppresses the second reset email"
    );
}
