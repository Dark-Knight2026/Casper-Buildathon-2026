//! Integration tests for `PATCH /api/v1/users/me/role`.
//!
//! Pin the gate ordering documented at the handler:
//! validation -> recent-auth -> idempotent shortcut (free in rate-limit
//! terms) -> rate-limit -> active-leases. A regression that re-orders any
//! of these surfaces here as a different status code for the same input.
//!
//! Side-effect coverage is split across the happy-path tests rather than
//! a single mega-test - each side effect (cookies cleared, refresh
//! revoked, `audit_logs` written, `jwt_invalidate_before` bumped) gets its
//! own focused assertion so a future regression points at one symptom
//! instead of a tangle.

mod common;

use core::time::Duration as CoreDuration;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use chrono::{Duration as ChronoDuration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use rand::Rng;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use api::{
    Claims, UserRole,
    common::{
        CASPER_MESSAGE_PREFIX, JWT_AUDIENCE, JWT_ISSUER, RedisStore, TokenType, VerificationLevel,
    },
};
use common::TestEnv;

/// Sign the wallet-login challenge the same way the real client does.
fn sign_with_prefix(message: &str, secret_key: &SecretKey, public_key: &PublicKey) -> String {
    let prefixed = format!("{CASPER_MESSAGE_PREFIX}{message}");
    crypto::sign(prefixed.as_bytes(), secret_key, public_key).to_hex()
}

/// Generates a fresh ed25519 keypair so each test gets an isolated
/// wallet (and therefore an isolated user row, which matters for the
/// rate-limit and audit assertions that bind to a specific `user_id`).
fn generate_random_ed25519() -> (SecretKey, PublicKey) {
    let mut rng = rand::rng();
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);
    let secret_key = SecretKey::ed25519_from_bytes(bytes).unwrap();
    let public_key = PublicKey::from(&secret_key);
    (secret_key, public_key)
}

/// Performs nonce -> sign -> login and returns `(user_id, access_token)`.
///
/// Reused across every authenticated test - keeping this duplicated
/// across `users_avatar.rs` and `auth_invalidate_before.rs` rather than
/// factoring into `common.rs` because each file scopes its own
/// boilerplate without dragging in unrelated email/JWT helpers.
async fn login_and_extract(env: &TestEnv) -> (Uuid, String) {
    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

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
    let user_id_str = login_body["user"]["id"].as_str().unwrap();
    let user_id = Uuid::parse_str(user_id_str).unwrap();
    let access_token = login_response.cookie("access_token").value().to_owned();

    (user_id, access_token)
}

/// Re-logs in for the same wallet, returning a fresh access token.
///
/// Needed by the 429 / bidirectional / lease-blocking tests because the
/// first PATCH stamps `jwt_invalidate_before = NOW()`, which kills the
/// original cookie. Without a re-login, the second PATCH would 401 long
/// before reaching the gate the test wants to assert on.
async fn relogin_with_keypair(
    env: &TestEnv,
    secret_key: &SecretKey,
    public_key: &PublicKey,
) -> String {
    // Clock has 1-second resolution, so sleep one tick to ensure the
    // new token's `iat` is strictly greater than the cutoff stamped by
    // the previous PATCH. Mirrors `auth_invalidate_before::fresh_login_after_cutoff_succeeds`.
    tokio::time::sleep(CoreDuration::from_secs(1)).await;

    let wallet_address = public_key.to_hex();
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let signature_hex = sign_with_prefix(
        nonce_body["message"].as_str().unwrap(),
        secret_key,
        public_key,
    );

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    login_response.cookie("access_token").value().to_owned()
}

/// Mints a JWT with a custom `iat` offset (in seconds) into the past.
///
/// The avatar/email tests do not need this because they do not gate on
/// `iat` freshness; here we need it specifically to drive the 403 test
/// (`iat <= NOW() - 6 minutes`) without sleeping for 5 minutes in CI.
fn mint_access_token_with_backdated_iat(
    user_id: Uuid,
    role: UserRole,
    secret: &str,
    iat_offset_secs: i64,
) -> String {
    let now = Utc::now();
    let exp = now
        .checked_add_signed(ChronoDuration::hours(24))
        .expect("Valid expiration")
        .timestamp();
    let exp_usize = usize::try_from(exp.max(0)).expect("Valid expiration timestamp");

    let backdated = now.timestamp() - iat_offset_secs;
    let iat_usize = usize::try_from(backdated.max(0)).expect("Valid iat");

    let claims = Claims {
        sub: user_id,
        role,
        exp: exp_usize,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: Some(TokenType::Access),
        verification_level: Some(VerificationLevel::None),
        jti: Uuid::new_v4(),
        iat: iat_usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to mint backdated JWT")
}

/// Seeds an `active` lease where `landlord_id = user_id`, returning its
/// new `id`.
///
/// Inserts the minimal `properties` row required as a foreign key
/// (NOT NULL columns: `landlord_id`, `property_type`, `address_line1`,
/// `city`, `state`, `zip_code`) and the minimal `leases` row (NOT NULL
/// columns: `landlord_id`, `property_id`, `tenant_ids[]`,
/// `primary_tenant_id`, `type`, `start_date`, `end_date`,
/// `monthly_rent`, `security_deposit`, `created_by`).
///
/// `primary_tenant_id` and `tenant_ids[0]` are intentionally set to
/// `landlord_id` because the `users` table only has one row in this
/// scenario - the FK constraints accept self-references and the test
/// asserts on the `landlord_id` branch of the EXISTS predicate, not the
/// `primary_tenant_id` branch.
async fn seed_active_lease_as_landlord(pool: &PgPool, user_id: Uuid) {
    let property_id = sqlx::query!(
        r"
            INSERT INTO properties (
                landlord_id, property_type, address_line1, city, state, zip_code
            )
            VALUES ($1, 'single_family', '1 Test St', 'Testville', 'CA', '00000')
            RETURNING id
        ",
        user_id,
    )
    .fetch_one(pool)
    .await
    .expect("seed property")
    .id;

    sqlx::query!(
        r"
            INSERT INTO leases (
                landlord_id, property_id, agent_id, tenant_ids, primary_tenant_id,
                type, status, start_date, end_date, monthly_rent, security_deposit,
                created_by
            )
            VALUES (
                $1, $2, NULL, ARRAY[$1]::uuid[], $1,
                'fixed_term', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year',
                1000.00, 1000.00, $1
            )
        ",
        user_id,
        property_id,
    )
    .execute(pool)
    .await
    .expect("seed lease");
}

/// Happy path: tenant -> landlord returns 200, role flips, refresh
/// tokens get revoked, `jwt_invalidate_before` is stamped, the access
/// cookie is cleared in the response, and the OLD token can no longer
/// access protected endpoints.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_happy_path_returns_200_and_revokes_session(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (user_id, access_token) = login_and_extract(&env).await;

    let response = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["role"].as_str().unwrap(), "landlord");

    // Cleared access cookie present in response - browser will drop the old one.
    let cleared = response.cookie("access_token");
    assert_eq!(cleared.value(), "", "access_token must be cleared");

    let row = sqlx::query!(
        r"SELECT role, jwt_invalidate_before FROM users WHERE id = $1",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.role, "landlord");
    assert!(
        row.jwt_invalidate_before.is_some(),
        "jwt_invalidate_before must be stamped on success",
    );

    // The refresh row created at login time must now be revoked.
    let revoked_count = sqlx::query!(
        r#"SELECT COUNT(*) AS "n!" FROM refresh_tokens WHERE user_id = $1 AND revoked_at IS NOT NULL"#,
        user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .n;
    assert!(
        revoked_count >= 1,
        "at least one refresh row must be revoked after role change",
    );

    // Old access token must now fail middleware (jwt_invalidate_before).
    let me = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .await;
    assert_eq!(
        me.status_code(),
        StatusCode::UNAUTHORIZED,
        "old access token must be rejected after force-revoke",
    );
}

/// Audit log: a successful change writes an `audit_logs` row with the
/// canonical `change_role` action and the old/new values populated.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_writes_audit_log(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (user_id, access_token) = login_and_extract(&env).await;

    let response = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let row = sqlx::query!(
        r"
            SELECT action, resource_type, resource_id, old_values, new_values, status
            FROM audit_logs
            WHERE user_id = $1 AND action = 'change_role'
            ORDER BY created_at DESC
            LIMIT 1
        ",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("audit_logs row must exist after role change");

    assert_eq!(row.action, "change_role");
    assert_eq!(row.resource_type, "user");
    assert_eq!(row.resource_id.unwrap(), user_id);
    assert_eq!(row.status.as_deref(), Some("success"));
    assert_eq!(
        row.old_values.unwrap()["role"].as_str().unwrap(),
        "tenant",
        "old_values.role must capture the pre-change value",
    );
    assert_eq!(
        row.new_values.unwrap()["role"].as_str().unwrap(),
        "landlord",
        "new_values.role must capture the post-change value",
    );
}

/// Bidirectional change works once the rate-limit slot is cleared:
/// tenant -> landlord (success), drop the Redis key, re-login,
/// landlord -> tenant (success). Pin the invariant that the rate-limit
/// is the ONLY thing standing in the way of a reverse change.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_bidirectional_after_redis_reset(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex();

    // First login + change.
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let signature_hex = sign_with_prefix(
        nonce_body["message"].as_str().unwrap(),
        &secret_key,
        &public_key,
    );
    let first_login = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    let user_id =
        Uuid::parse_str(first_login.json::<Value>()["user"]["id"].as_str().unwrap()).unwrap();
    let first_access = first_login.cookie("access_token").value().to_owned();

    let first_change = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={first_access}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;
    assert_eq!(first_change.status_code(), StatusCode::OK);

    // Drop the rate-limit slot to simulate the 24h window having elapsed.
    let redis_env = env.redis.as_ref().expect("redis env");
    let mut conn: redis::aio::MultiplexedConnection = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .unwrap();
    redis::cmd("DEL")
        .arg(RedisStore::role_change_attempts_key(user_id))
        .query_async::<()>(&mut conn)
        .await
        .unwrap();

    // Re-login (the previous access cookie is dead per `jwt_invalidate_before`).
    let second_access = relogin_with_keypair(&env, &secret_key, &public_key).await;

    let second_change = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={second_access}"))
        .json(&serde_json::json!({ "role": "tenant" }))
        .await;
    assert_eq!(
        second_change.status_code(),
        StatusCode::OK,
        "reverse change must succeed once the rate-limit slot is clear",
    );
    assert_eq!(
        second_change.json::<Value>()["role"].as_str().unwrap(),
        "tenant",
    );
}

/// Whitelist gate: `admin`, `property_manager`, and unknown strings all
/// fall back to either the `Admin` variant or the serde `Unknown`
/// variant, none of which pass `is_self_registerable`. Each case must
/// 400 BEFORE any DB or Redis work is attempted - asserted indirectly
/// by the row staying at `tenant`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_rejects_non_whitelist_values(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (user_id, access_token) = login_and_extract(&env).await;

    for bad in ["admin", "property_manager", "unknown", "moderator"] {
        let response = env
            .server
            .patch("/api/v1/users/me/role")
            .add_header(COOKIE, format!("access_token={access_token}"))
            .json(&serde_json::json!({ "role": bad }))
            .await;
        assert_eq!(
            response.status_code(),
            StatusCode::BAD_REQUEST,
            "role={bad} must be rejected with 400, got {}",
            response.status_code(),
        );
    }

    // Sanity: row stayed at `tenant`, jwt_invalidate_before still NULL.
    let row = sqlx::query!(
        r"SELECT role, jwt_invalidate_before FROM users WHERE id = $1",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.role, "tenant");
    assert!(
        row.jwt_invalidate_before.is_none(),
        "rejected requests must not stamp jwt_invalidate_before",
    );
}

/// Recent-auth gate: an access token whose `iat` is older than the
/// 5-minute window returns 403 with `reauthentication_required`. The
/// user row exists (so middleware passes), and we mint the backdated
/// token directly with the test JWT secret rather than waiting 5
/// minutes in CI.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_with_stale_iat_returns_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (user_id, _) = login_and_extract(&env).await;

    // 6 minutes > 5-minute window -> 403.
    let stale_token =
        mint_access_token_with_backdated_iat(user_id, UserRole::Tenant, &env.jwt_secret, 6 * 60);

    let response = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={stale_token}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::FORBIDDEN);
    let body = response.json::<Value>();
    assert_eq!(
        body["error"].as_str().unwrap(),
        "reauthentication_required",
        "403 must use the stable client-facing code",
    );
}

/// Rate-limit gate: a second change within 24 hours returns 429. After
/// the first PATCH, the access token is force-revoked, so the second
/// attempt must re-login - this re-login is what the test pins (the
/// rate limit is per-user, not per-token).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_second_within_window_returns_429(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let signature_hex = sign_with_prefix(
        nonce_body["message"].as_str().unwrap(),
        &secret_key,
        &public_key,
    );
    let first_login = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    let first_access = first_login.cookie("access_token").value().to_owned();

    let first_change = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={first_access}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;
    assert_eq!(first_change.status_code(), StatusCode::OK);

    // Re-login with a fresh `iat > cutoff`; do NOT clear the Redis slot.
    let second_access = relogin_with_keypair(&env, &secret_key, &public_key).await;

    let second_change = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={second_access}"))
        .json(&serde_json::json!({ "role": "tenant" }))
        .await;
    assert_eq!(
        second_change.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "second change within rolling window must 429",
    );
    let body = second_change.json::<Value>();
    assert_eq!(body["error"].as_str().unwrap(), "rate_limited");
}

/// Idempotent shortcut: a noop (`tenant -> tenant`) returns 200 and
/// does NOT bump the rate-limit counter. The follow-up real change
/// must therefore succeed in the same window. This is the contract the
/// idempotent shortcut is built to defend.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_noop_does_not_burn_rate_limit(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (user_id, access_token) = login_and_extract(&env).await;

    // Two successive noops - the cookie stays valid because the noop
    // path does not stamp `jwt_invalidate_before`.
    for _ in 0..2 {
        let response = env
            .server
            .patch("/api/v1/users/me/role")
            .add_header(COOKIE, format!("access_token={access_token}"))
            .json(&serde_json::json!({ "role": "tenant" }))
            .await;
        assert_eq!(
            response.status_code(),
            StatusCode::OK,
            "noop change must always succeed",
        );
    }

    // Verify the counter is still empty by triggering a real change -
    // if any of the noops had bumped, this would 429.
    let real_change = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;
    assert_eq!(
        real_change.status_code(),
        StatusCode::OK,
        "real change after noops must still succeed - noop must not burn rate-limit budget",
    );

    // Sanity: row actually flipped now.
    let role: String = sqlx::query_scalar!("SELECT role FROM users WHERE id = $1", user_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(role, "landlord");
}

/// Active-leases gate: a user with an active lease as landlord cannot
/// change role. Returns 409 with `active_leases_blocking`. Side-effects
/// are absent: the lease still binds, the role stays at `tenant`, and
/// the rate-limit slot stays empty (so a later change after the lease
/// terminates is still allowed).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_with_active_lease_returns_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let (user_id, access_token) = login_and_extract(&env).await;
    seed_active_lease_as_landlord(&pool, user_id).await;

    let response = env
        .server
        .patch("/api/v1/users/me/role")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::CONFLICT);
    let body = response.json::<Value>();
    assert_eq!(body["error"].as_str().unwrap(), "active_leases_blocking");

    // Side-effect-free rejection: role stayed, jwt_invalidate_before NULL,
    // Redis slot empty (so a follow-up after lease termination still works).
    let row = sqlx::query!(
        r"SELECT role, jwt_invalidate_before FROM users WHERE id = $1",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(row.role, "tenant");
    assert!(row.jwt_invalidate_before.is_none());

    let redis_env = env.redis.as_ref().expect("redis env");
    let mut conn: redis::aio::MultiplexedConnection = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .unwrap();
    let exists: i64 = redis::cmd("EXISTS")
        .arg(RedisStore::role_change_attempts_key(user_id))
        .query_async(&mut conn)
        .await
        .unwrap();
    assert_eq!(
        exists, 0,
        "409 must not bump the rate-limit slot - the change never committed",
    );
}

/// Anonymous request: no cookie -> 401 from `require_auth`. Pins that
/// the route is mounted under the protected nest; a future regression
/// that mounts `/me/role` outside it would surface here as a 200/400.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn role_change_without_authentication_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .patch("/api/v1/users/me/role")
        .json(&serde_json::json!({ "role": "landlord" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}
