//! Integration tests for the user-profile endpoints.

mod common;

use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use casper_types::{AsymmetricType, PublicKey, SecretKey};
use redis::AsyncCommands;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::common::TestOverrides;
use api::providers::{EmailError, EmailMessage, EmailSender};

/// Mailer that always fails delivery.
///
/// Used to assert that `request_email_change` rolls back the Redis token
/// slot and the rate-limit counter when the transport step blows up.
#[derive(Debug, Default)]
struct FailingMailer;

#[async_trait]
impl EmailSender for FailingMailer {
    async fn send(&self, _message: EmailMessage) -> Result<(), EmailError> {
        Err(EmailError::Transient(
            "failing mailer (test fixture)".to_owned(),
        ))
    }
}

/// Mailer that records every successfully-sent message in memory.
///
/// Used by the email-change happy-path test to recover the plaintext
/// confirmation token: the token never lands in Redis (Redis stores only
/// its SHA-256 hash) and is never echoed in the HTTP response, so the
/// only path to it from a test harness is intercepting the outbound
/// message body before it reaches a real SMTP relay.
///
/// `std::sync::Mutex` (not `tokio::sync::Mutex`) is correct here because
/// the `send` impl pushes-and-returns without crossing an `.await`; the
/// lock is released before the future yields.
#[derive(Debug, Default, Clone)]
struct CapturingMailer {
    sent: Arc<Mutex<Vec<EmailMessage>>>,
}

#[async_trait]
impl EmailSender for CapturingMailer {
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        self.sent
            .lock()
            .expect("CapturingMailer mutex poisoned")
            .push(message);
        Ok(())
    }
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
    let env = common::setup_test_server_with(
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
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

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

    let user_id = sqlx::query_scalar!(
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
    let token_exists = conn
        .exists::<_, i32>(&token_key)
        .await
        .expect("EXISTS query failed");
    assert_eq!(
        token_exists, 0,
        "email-change token slot must be cleared when mailer fails, otherwise it lives 24h orphaned",
    );

    let attempts_key = format!("email_change_attempts:{user_id}");
    let attempts = conn
        .get::<_, Option<u64>>(&attempts_key)
        .await
        .expect("GET query failed");
    assert!(
        attempts.is_none_or(|c| c == 0),
        "rate-limit counter must not be consumed on mailer failure (got {attempts:?}); otherwise the user burns 1 of 3 daily attempts on a transient SMTP outage",
    );
}

/// `confirm_email_change` with a well-shaped but incorrect token must
/// return 401, not 400. The shape validator passes (43 base64url-no-pad
/// chars), `take_email_change_token` returns `Some(stored_hash, ...)` for
/// the real prior request, and the hash mismatch triggers the
/// `Unauthorized("invalid_email_change_token")` branch.
///
/// Pins the difference between "malformed payload" (400) and "well-formed
/// but unauthorized" (401) - a future refactor that collapses both into
/// 400 (or drops the hash check) would weaken the contract that an
/// attacker who guesses token shape but not value cannot consume the
/// real one.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_email_change_with_wrong_token_returns_401(pool: PgPool) {
    let env = common::setup_test_server_with(pool, true, TestOverrides::default()).await;

    let secret_key = SecretKey::ed25519_from_bytes([11u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();

    let request_response = env
        .server
        .post("/api/v1/users/me/email")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "new_email": "fresh@example.com" }))
        .await;
    assert_eq!(
        request_response.status_code(),
        StatusCode::ACCEPTED,
        "request_email_change must succeed before we can probe a wrong-token confirm",
    );

    // 43 base64url-no-pad chars (correct shape), but not the stored value.
    let wrong_token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    let confirm_response = env
        .server
        .post("/api/v1/users/me/email/confirm")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "token": wrong_token }))
        .await;

    assert_eq!(
        confirm_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "confirm with a token whose hash differs from the stored one must return 401, not 400",
    );
}

/// `confirm_email_change` after the Redis slot has expired (24h TTL
/// elapsed) must return 401. Simulated here by manually `DEL`-ing the
/// `email_change:{user_id}` key right after `request_email_change` stores
/// it, before invoking confirm.
///
/// Pins the expiry contract: a confirmation link mailed and then ignored
/// for 24+ hours stops working, instead of silently allowing late use.
/// `take_email_change_token` returns `None` and the handler short-circuits
/// to `Unauthorized` before any hash comparison runs.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_email_change_with_expired_token_returns_401(pool: PgPool) {
    let env = common::setup_test_server_with(pool.clone(), true, TestOverrides::default()).await;

    let secret_key = SecretKey::ed25519_from_bytes([13u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();

    let user_id = sqlx::query_scalar!(
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

    let request_response = env
        .server
        .post("/api/v1/users/me/email")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "new_email": "expired@example.com" }))
        .await;
    assert_eq!(request_response.status_code(), StatusCode::ACCEPTED);

    // Simulate the 24h TTL elapsing by wiping the slot directly.
    let redis_env = env.redis.as_ref().expect("Redis required for this test");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("Redis connection failed");
    let token_key = format!("email_change:{user_id}");
    let _ = conn
        .del::<_, u32>(&token_key)
        .await
        .expect("DEL query failed");

    // Any well-shaped token suffices - take_email_change_token returns
    // None before the hash comparison ever runs.
    let any_valid_shape_token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    let confirm_response = env
        .server
        .post("/api/v1/users/me/email/confirm")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "token": any_valid_shape_token }))
        .await;

    assert_eq!(
        confirm_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "confirm after the Redis slot has been wiped (TTL elapsed or manual delete) must return 401",
    );
}

/// `GET /api/v1/users/me` happy path: a freshly logged-in user can read
/// back the same profile shape the login response returned. Pins that the
/// access cookie issued by `/auth/login` is accepted by `require_auth`,
/// that `fetch_user_profile` includes the wallet-default placeholders
/// (`first_name = 'Wallet'`, `last_name = 'User'`, status = 'active')
/// inserted by `upsert_user_by_wallet`, and that the response carries a
/// non-null `wallet_address` synced via the `wallet_connections` trigger.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_me_returns_authenticated_user_profile(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([21u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let login_body = login_response.json::<Value>();
    // `LoginResponse` shape is `{ user: UserInfo }` - tokens go via
    // Set-Cookie, profile is nested under `user`.
    let login_user_id = login_body["user"]["id"].as_str().unwrap().to_owned();
    let access_token = login_response.cookie("access_token").value().to_owned();

    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .await;
    assert_eq!(me_response.status_code(), StatusCode::OK);
    // GET /me returns `UserInfo` directly (not wrapped in `{ user: ... }`
    // like login does). Pinning that asymmetry here so a future refactor
    // that "harmonizes" the two shapes surfaces in this assert.
    let me_body = me_response.json::<Value>();

    assert_eq!(
        me_body["id"].as_str().unwrap(),
        login_user_id,
        "GET /me must return the same user id the login response carried",
    );
    assert_eq!(
        me_body["wallet_address"]
            .as_str()
            .unwrap()
            .to_ascii_lowercase(),
        wallet_address.to_ascii_lowercase(),
        "wallet_address must be populated from the wallet_connections trigger",
    );
    assert_eq!(me_body["first_name"].as_str().unwrap(), "Wallet");
    assert_eq!(me_body["last_name"].as_str().unwrap(), "User");
    assert_eq!(me_body["status"].as_str().unwrap(), "active");
    assert!(me_body["id"].is_string());
    assert!(me_body["created_at"].is_string());
    assert!(me_body["updated_at"].is_string());
}

/// `GET /api/v1/users/me` without any auth cookie must 401 - the
/// `require_auth` middleware short-circuits before the handler runs, and
/// no profile data leaks to anonymous callers. Pins the protected-tier
/// router wiring: a future regression that mounts `/me` outside the
/// authenticated nest would surface as a 200 here instead of a 401.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_me_without_authentication_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/users/me").await;

    assert_eq!(
        response.status_code(),
        StatusCode::UNAUTHORIZED,
        "GET /users/me must require an access cookie; got {}",
        response.status_code(),
    );
}

/// `PATCH /api/v1/users/me` happy path: the editable subset
/// (`first_name`, `last_name`, `phone`, `bio`) is rewritten atomically and
/// the response reflects the post-update state. `avatar_url` is owned by
/// `POST /me/avatar` and is not part of this payload.
///
/// Verifies (a) the response body shape matches the post-update profile,
/// (b) the row in `users` carries the new values (catches a future
/// refactor that returns the patch payload back without actually
/// committing it), and (c) `phone_verified` was reset to `false` because
/// the new phone differs from the stored value (was NULL after wallet
/// signup, so any non-null phone triggers the reset branch).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn patch_me_updates_editable_fields(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;

    let secret_key = SecretKey::ed25519_from_bytes([23u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();
    let user_id = login_response.json::<Value>()["user"]["id"]
        .as_str()
        .unwrap()
        .parse::<Uuid>()
        .unwrap();

    let patch_response = env
        .server
        .patch("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({
            "first_name": "  Alice  ",
            "last_name": "Smith",
            "phone": "+12025550123",
            "bio": "Casper hodler",
        }))
        .await;
    assert_eq!(patch_response.status_code(), StatusCode::OK);
    let patched = patch_response.json::<Value>();

    assert_eq!(
        patched["first_name"].as_str().unwrap(),
        "Alice",
        "first_name must be trimmed before persistence",
    );
    assert_eq!(patched["last_name"].as_str().unwrap(), "Smith");
    assert_eq!(patched["phone"].as_str().unwrap(), "+12025550123");
    assert_eq!(patched["bio"].as_str().unwrap(), "Casper hodler");

    let row = sqlx::query!(
        r"
            SELECT first_name, last_name, phone, bio, phone_verified
            FROM users
            WHERE id = $1
        ",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("user row must exist after PATCH");

    assert_eq!(row.first_name, "Alice");
    assert_eq!(row.last_name, "Smith");
    assert_eq!(row.phone.as_deref(), Some("+12025550123"));
    assert_eq!(row.bio.as_deref(), Some("Casper hodler"));
    assert!(
        !row.phone_verified.unwrap_or(false),
        "phone_verified must be false after writing a phone distinct from the stored value",
    );
}

/// `PATCH /api/v1/users/me` must reject blanking out columns the schema
/// declares NOT NULL via the request-layer `trim_required` validator.
///
/// An all-whitespace `first_name` (or `last_name`) is the realistic shape
/// of an accidental client wipe: a form-field bound to an `<input>` that
/// the user cleared, then submitted. The contract is "missing field =
/// keep stored value, empty/whitespace = `400 BadRequest`" so the user
/// never silently loses a populated column.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn patch_me_rejects_empty_required_fields(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let secret_key = SecretKey::ed25519_from_bytes([25u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();

    let whitespace_first_name = env
        .server
        .patch("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "first_name": "   " }))
        .await;
    assert_eq!(
        whitespace_first_name.status_code(),
        StatusCode::BAD_REQUEST,
        "all-whitespace first_name must 400 (column is NOT NULL); got {}",
        whitespace_first_name.status_code(),
    );

    let empty_last_name = env
        .server
        .patch("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "last_name": "" }))
        .await;
    assert_eq!(
        empty_last_name.status_code(),
        StatusCode::BAD_REQUEST,
        "empty last_name must 400; got {}",
        empty_last_name.status_code(),
    );
}

/// Email-change happy path end-to-end: request a change, intercept the
/// confirmation email, post the token back, and assert that the column was
/// rewritten and the aggregate `verification_level` was upgraded.
///
/// Why intercept the email and not just inspect Redis: Redis stores only
/// `(SHA-256(plaintext), new_email)` - the plaintext exists in memory of the
/// `request_email_change` handler for one stack frame and then is dropped. A
/// `CapturingMailer` test fixture is the only seam that observes it before that
/// drop.
///
/// What this test pins, beyond what the failure-mode tests already cover:
///
/// - The `email` column is rewritten to the new (lowercase, trimmed) value, not
/// the wallet-derived placeholder login left there. - `email_verified` flips
/// from `false` to `true` in the same UPDATE (the handler relies on the trip
/// from request to confirm to prove reachability, so a future refactor that
/// forgets the verified flag would silently downgrade trust). - The
/// `trg_users_sync_verification_level` BEFORE-trigger upgrades
/// `verification_level` from `'none'` to `'email'` on that flip - the
/// confirmation response shape (`UserInfo`) intentionally drops this column
/// (see `From<UserProfileRecord> for UserInfo`), so the test verifies it
/// against the DB row directly.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn confirm_email_change_happy_path_upgrades_verification(pool: PgPool) {
    let mailer = CapturingMailer::default();
    let captured = Arc::clone(&mailer.sent);
    let env = common::setup_test_server_with(
        pool.clone(),
        true,
        TestOverrides {
            mailer: Some(Arc::new(mailer) as Arc<dyn EmailSender>),
            ..TestOverrides::default()
        },
    )
    .await;

    let secret_key = SecretKey::ed25519_from_bytes([29u8; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    let access_token = login_response.cookie("access_token").value().to_owned();
    let user_id = login_response.json::<Value>()["user"]["id"]
        .as_str()
        .unwrap()
        .parse::<Uuid>()
        .unwrap();

    let initial = sqlx::query!(
        r"
            SELECT verification_level, email_verified
            FROM users
            WHERE id = $1
        ",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("user row must exist after login");
    assert_eq!(
        initial.verification_level, "none",
        "fresh wallet user must start at verification_level='none'",
    );
    assert_eq!(
        initial.email_verified,
        Some(false),
        "fresh wallet user must start with email_verified=false",
    );

    let new_email = "fresh.confirmed@example.com";
    let request_response = env
        .server
        .post("/api/v1/users/me/email")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "new_email": new_email }))
        .await;
    assert_eq!(request_response.status_code(), StatusCode::ACCEPTED);

    // Pull the plaintext token out of the captured email body. The
    // handler formats the body as
    // `"Use this token within 24 hours to confirm the email change: <TOKEN>"`,
    // so `rsplit(": ").next()` gives the token and trims away any
    // trailing whitespace defensively.
    let body = {
        let lock = captured.lock().expect("CapturingMailer mutex poisoned");
        assert_eq!(
            lock.len(),
            1,
            "exactly one confirmation email must have been queued",
        );
        let msg = &lock[0];
        assert_eq!(
            msg.to, new_email,
            "confirmation must be sent to the new email"
        );
        assert_eq!(msg.subject, "Confirm your new email address");
        msg.body.clone()
    };
    let token = body
        .rsplit(": ")
        .next()
        .expect("body must contain ': '")
        .trim();
    assert_eq!(
        token.len(),
        43,
        "token must be 43 base64url-no-pad chars; got body: {body:?}",
    );

    let confirm_response = env
        .server
        .post("/api/v1/users/me/email/confirm")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "token": token }))
        .await;
    assert_eq!(confirm_response.status_code(), StatusCode::OK);
    let confirm_body = confirm_response.json::<Value>();
    assert_eq!(
        confirm_body["email"].as_str().unwrap(),
        new_email,
        "confirm response must echo the new email",
    );

    let final_row = sqlx::query!(
        r"
            SELECT email, verification_level, email_verified
            FROM users
            WHERE id = $1
        ",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("user row must still exist after confirm");

    assert_eq!(
        final_row.email.as_deref(),
        Some(new_email),
        "users.email must be rewritten to the new value",
    );
    assert_eq!(
        final_row.email_verified,
        Some(true),
        "users.email_verified must flip to true on confirm",
    );
    assert_eq!(
        final_row.verification_level, "email",
        "verification_level must upgrade from 'none' to 'email' via trg_users_sync_verification_level",
    );
}
