//! Integration tests for `POST /api/v1/users/me/password` (change / set).

mod common;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use serde_json::{Value, json};
use sqlx::PgPool;

use common::TestEnv;

/// Satisfies the password policy (>= 8 chars, a digit, mixed case). The account
/// starts life with this; the change/set flow swaps it for [`NEW_PASSWORD`].
const VALID_PASSWORD: &str = "Sup3rSecret";

/// The replacement password every change/set test installs. Distinct from
/// [`VALID_PASSWORD`] so a test can prove the swap actually took effect by
/// logging in with one and being rejected with the other.
const NEW_PASSWORD: &str = "N3wPassword";

/// Registers a password account and returns its `access_token` cookie value.
async fn register_and_access(env: &TestEnv, email: &str) -> String {
    let response = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": email,
            "password": VALID_PASSWORD,
            "first_name": "Pass",
            "last_name": "Word",
        }))
        .await;
    assert_eq!(response.status_code(), StatusCode::CREATED);
    response.cookie("access_token").value().to_owned()
}

/// Happy path: a correct `current_password` swaps the stored hash and re-issues
/// the session. The old password stops authenticating and the new one starts.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn change_password_swaps_credentials(pool: PgPool) {
    // Redis-isolated: the register call writes a per-IP rate-limit counter
    // shared across tests, so a dedicated container avoids cross-test bleed.
    let env = common::setup_test_server(pool, true).await;
    let access = register_and_access(&env, "change@example.com").await;

    let response = env
        .server
        .post("/api/v1/users/me/password")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&json!({
            "current_password": VALID_PASSWORD,
            "new_password": NEW_PASSWORD,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);
    assert!(
        !response.cookie("access_token").value().is_empty(),
        "a fresh access_token cookie must be re-issued"
    );
    assert!(
        !response.cookie("refresh_token").value().is_empty(),
        "a fresh refresh_token cookie must be re-issued"
    );

    // The old password no longer authenticates.
    let old = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "change@example.com", "password": VALID_PASSWORD }))
        .await;
    assert_eq!(old.status_code(), StatusCode::UNAUTHORIZED);

    // The new password does.
    let new = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "change@example.com", "password": NEW_PASSWORD }))
        .await;
    assert_eq!(new.status_code(), StatusCode::OK);
}

/// The decision #8 guarantee: a password change kills every OTHER session but
/// keeps the current one alive. The pre-change access + refresh tokens are
/// force-revoked, while the re-issued pair survives the very cutoff that killed
/// them - proving the `iat = cutoff + 1s` re-issue actually clears the
/// second-granularity `iat <= cutoff` check.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn change_password_revokes_other_sessions_but_keeps_current(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let register = env
        .server
        .post("/api/v1/auth/register")
        .json(&json!({
            "email": "rotate@example.com",
            "password": VALID_PASSWORD,
            "first_name": "Ro",
            "last_name": "Tate",
        }))
        .await;
    assert_eq!(register.status_code(), StatusCode::CREATED);
    let old_access = register.cookie("access_token").value().to_owned();
    let old_refresh = register.cookie("refresh_token").value().to_owned();

    let response = env
        .server
        .post("/api/v1/users/me/password")
        .add_header(COOKIE, format!("access_token={old_access}"))
        .json(&json!({
            "current_password": VALID_PASSWORD,
            "new_password": NEW_PASSWORD,
        }))
        .await;
    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);
    let new_access = response.cookie("access_token").value().to_owned();
    let new_refresh = response.cookie("refresh_token").value().to_owned();

    // The pre-change access token is force-revoked (iat <= cutoff).
    let old_me = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={old_access}"))
        .await;
    assert_eq!(old_me.status_code(), StatusCode::UNAUTHORIZED);

    // The re-issued access token survives the very cutoff that killed the old.
    let new_me = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={new_access}"))
        .await;
    assert_eq!(new_me.status_code(), StatusCode::OK);

    // The pre-change refresh family is revoked - it cannot be rotated.
    let old_rotate = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={old_refresh}"))
        .await;
    assert_eq!(old_rotate.status_code(), StatusCode::UNAUTHORIZED);

    // The re-issued refresh token rotates cleanly.
    let new_rotate = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={new_refresh}"))
        .await;
    assert_eq!(new_rotate.status_code(), StatusCode::NO_CONTENT);
}

/// A wrong `current_password` is rejected with 401 and leaves the stored hash
/// untouched: the original password still logs in, the attempted new one never
/// took effect.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn change_password_rejects_wrong_current(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access = register_and_access(&env, "wrongcur@example.com").await;

    let response = env
        .server
        .post("/api/v1/users/me/password")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&json!({
            "current_password": "WrongOld1Pass",
            "new_password": NEW_PASSWORD,
        }))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);

    // Hash unchanged: the original password still authenticates.
    let still = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "wrongcur@example.com", "password": VALID_PASSWORD }))
        .await;
    assert_eq!(still.status_code(), StatusCode::OK);

    // The rejected new password never took effect.
    let new = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": "wrongcur@example.com", "password": NEW_PASSWORD }))
        .await;
    assert_eq!(new.status_code(), StatusCode::UNAUTHORIZED);
}

/// On the change path (an account that already has a password), omitting
/// `current_password` is a 400 - the proof of possession is mandatory.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn change_password_requires_current_on_change_path(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access = register_and_access(&env, "nocur@example.com").await;

    let response = env
        .server
        .post("/api/v1/users/me/password")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&json!({ "new_password": NEW_PASSWORD }))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// A wallet-only account (`password_hash IS NULL`) sets its first password
/// WITHOUT a `current_password`. The freshly-authenticated wallet session
/// satisfies the recent-auth gate, and the new password then logs in.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_first_password_on_wallet_only_account(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    let email = common::seed_email(&pool, session.user_id).await;

    let response = env
        .server
        .post("/api/v1/users/me/password")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&json!({ "new_password": NEW_PASSWORD }))
        .await;
    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);

    // The freshly-set password now authenticates the wallet account by email.
    let login = env
        .server
        .post("/api/v1/auth/login/password")
        .json(&json!({ "email": email, "password": NEW_PASSWORD }))
        .await;
    assert_eq!(login.status_code(), StatusCode::OK);
}

/// The endpoint is under `require_auth`: no access cookie means 401 before any
/// password logic runs.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn change_password_requires_authentication(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/users/me/password")
        .json(&json!({
            "current_password": VALID_PASSWORD,
            "new_password": NEW_PASSWORD,
        }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// Five wrong `current_password` attempts exhaust the per-user failure cap; the
/// sixth is rejected by the limiter (429) rather than the credential check
/// (401) - even the correct password is blocked while the lockout holds. This
/// bounds brute-forcing `current_password` with a stolen but still-valid access
/// cookie.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn change_password_rate_limited_after_five_failures(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access = register_and_access(&env, "brutecur@example.com").await;

    for _ in 0..5 {
        let response = env
            .server
            .post("/api/v1/users/me/password")
            .add_header(COOKIE, format!("access_token={access}"))
            .json(&json!({
                "current_password": "WrongGuess1",
                "new_password": NEW_PASSWORD,
            }))
            .await;
        assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    }

    // The limiter now sits ahead of the credential check: even the correct
    // current_password is blocked with 429 while the lockout holds.
    let blocked = env
        .server
        .post("/api/v1/users/me/password")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&json!({
            "current_password": VALID_PASSWORD,
            "new_password": NEW_PASSWORD,
        }))
        .await;
    assert_eq!(blocked.status_code(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(
        blocked.json::<Value>()["error"].as_str(),
        Some("rate_limited")
    );
}
