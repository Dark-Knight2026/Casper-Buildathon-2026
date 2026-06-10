//! Integration tests for `POST /api/v1/auth/sessions/revoke-all`.
//!
//! Pin the two operating modes the handler exposes plus the cross-user
//! safety property:
//! 1. `keep_current = true` revokes every OTHER session and leaves the
//!    caller's refresh row + access token usable.
//! 2. `keep_current = false` revokes every session AND stamps the access
//!    cutoff so the caller's own access token is also rejected on its
//!    next use.
//! 3. The handler scopes to the caller - another user's sessions must
//!    survive.
//! 4. A successful call writes one `audit_logs` row carrying the
//!    `keep_current` flag verbatim in `metadata`.

mod common;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use chrono::{Duration, Utc};
use serde_json::Value;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

/// Audit-log columns read back via a runtime `query_as` (no compile-time
/// macro in tests).
#[derive(sqlx::FromRow)]
struct AuditLogRow {
    action: String,
    resource_type: String,
    resource_id: Option<Uuid>,
    metadata: Option<Value>,
    status: Option<String>,
}

/// Inserts an extra `refresh_tokens` row for `user_id` directly via SQL
/// to simulate a second active device for the same user.
///
/// Wallet login alone cannot produce multiple sessions: the login path
/// calls `revoke_all_active_refresh_tokens_for_user` so a second login
/// from the same wallet revokes the first session. To exercise the
/// "log out other devices" semantics we therefore plant the extra row
/// directly. The synthetic row uses a random family id and a hash that
/// cannot collide with any login's real cookie, so the test stays
/// hermetic from the caller's session.
///
/// Returns the newly-inserted row id and the raw token-hash bytes - the
/// caller uses both to assert the row's revoke state after the handler
/// runs.
async fn insert_extra_session(pool: &PgPool, user_id: Uuid) -> (Uuid, Vec<u8>) {
    let token_id = Uuid::new_v4();
    let family_id = Uuid::new_v4();
    let token_hash = Sha256::digest(format!("synthetic-extra-{token_id}").as_bytes()).to_vec();
    let expires_at = Utc::now() + Duration::days(7);

    sqlx::query(
        r"
            INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        ",
    )
    .bind(token_id)
    .bind(user_id)
    .bind(&token_hash)
    .bind(family_id)
    .bind(expires_at)
    .execute(pool)
    .await
    .expect("synthetic refresh_tokens insert");

    (token_id, token_hash)
}

/// `keep_current = true` happy path: the caller's row stays active, the
/// extra "other-device" row is revoked, and both the caller's access
/// token and refresh token still work afterwards.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn revoke_all_keep_current_preserves_caller_kills_others(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    let (other_id, _other_hash) = insert_extra_session(&pool, session.user_id).await;

    let response = env
        .server
        .post("/api/v1/auth/sessions/revoke-all")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                session.access_token, session.refresh_token,
            ),
        )
        .json(&serde_json::json!({ "keep_current": true }))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(
        response.json::<Value>()["revoked"].as_u64().unwrap(),
        1,
        "exactly the synthetic other-device row was revoked",
    );

    let current_hash = Sha256::digest(session.refresh_token.as_bytes()).to_vec();
    let current_active = sqlx::query_scalar::<_, bool>(
        r"
            SELECT (revoked_at IS NULL) AS active
            FROM refresh_tokens
            WHERE token_hash = $1
        ",
    )
    .bind(current_hash)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        current_active,
        "caller's own refresh row must remain active when keep_current = true",
    );

    let other_revoked = sqlx::query_scalar::<_, bool>(
        r"
            SELECT (revoked_at IS NOT NULL) AS revoked
            FROM refresh_tokens
            WHERE id = $1
        ",
    )
    .bind(other_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(other_revoked, "the other-device row must be revoked");

    // Caller's access token is still accepted: jwt_invalidate_before
    // was NOT bumped, so the middleware lets the existing JWT through.
    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;
    assert_eq!(
        me_response.status_code(),
        StatusCode::OK,
        "caller's access cookie must still authenticate after keep_current revoke",
    );

    // Caller's refresh cookie still rotates - the row is intact.
    let refresh_response = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        refresh_response.status_code(),
        StatusCode::NO_CONTENT,
        "caller's refresh must succeed - their session was preserved",
    );
}

/// `keep_current = false` panic-logout: every session is revoked AND
/// the access cutoff is bumped, so the caller's own access token and
/// refresh cookie are both rejected on the next request. Cookies are
/// cleared in the response.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn revoke_all_panic_logout_kills_caller_too(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    let (_other_id, _other_hash) = insert_extra_session(&pool, session.user_id).await;

    let response = env
        .server
        .post("/api/v1/auth/sessions/revoke-all")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                session.access_token, session.refresh_token,
            ),
        )
        .json(&serde_json::json!({ "keep_current": false }))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(
        response.json::<Value>()["revoked"].as_u64().unwrap(),
        2,
        "both the caller's row and the synthetic row must be revoked",
    );

    // Response clears both cookies (Max-Age=0, empty value).
    let access_clear = response.cookie("access_token");
    let refresh_clear = response.cookie("refresh_token");
    assert_eq!(
        access_clear.value(),
        "",
        "panic-logout must clear the access_token cookie",
    );
    assert_eq!(
        refresh_clear.value(),
        "",
        "panic-logout must clear the refresh_token cookie",
    );

    // Caller's access token now rejected by the middleware via the
    // jwt_invalidate_before cutoff - the JWT itself is still
    // syntactically valid and unexpired, but its iat <= cutoff.
    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;
    assert_eq!(
        me_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "caller's access cookie must be rejected after panic-logout",
    );

    // Caller's refresh cookie now points at a revoked row.
    let refresh_response = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        refresh_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "caller's refresh must be rejected after panic-logout",
    );
}

/// Cross-user safety: alice's revoke-all must not touch bob's session.
/// Pin the WHERE-clause invariant - a forged `user_id` in a request
/// cannot reach across into another user's rows because the handler
/// pulls the id from the authenticated JWT, not from any client input.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn revoke_all_does_not_touch_other_users(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let alice = common::login_and_extract(&env).await;
    let bob = common::login_and_extract(&env).await;
    assert_ne!(
        alice.user_id, bob.user_id,
        "test setup sanity: distinct users",
    );

    let response = env
        .server
        .post("/api/v1/auth/sessions/revoke-all")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                alice.access_token, alice.refresh_token,
            ),
        )
        .json(&serde_json::json!({ "keep_current": false }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let bob_hash = Sha256::digest(bob.refresh_token.as_bytes()).to_vec();
    let bob_active = sqlx::query_scalar::<_, bool>(
        r"
            SELECT (revoked_at IS NULL) AS active
            FROM refresh_tokens
            WHERE token_hash = $1
        ",
    )
    .bind(bob_hash)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(bob_active, "bob's session must survive alice's revoke-all",);

    // Bob's access still authenticates against `/me`.
    let me_response = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", bob.access_token))
        .await;
    assert_eq!(me_response.status_code(), StatusCode::OK);
}

/// Audit log: a successful revoke writes one `audit_logs` row whose
/// `metadata.keep_current` mirrors the request's flag. Pin both modes
/// so a future regression that swaps the literal in
/// `jsonb_build_object` (or accidentally inverts the bool) shows up
/// here, not in production audit-trail review.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn revoke_all_writes_audit_log_with_keep_current_flag(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    let response = env
        .server
        .post("/api/v1/auth/sessions/revoke-all")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                session.access_token, session.refresh_token,
            ),
        )
        .json(&serde_json::json!({ "keep_current": true }))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let row = sqlx::query_as::<_, AuditLogRow>(
        r"
            SELECT action, resource_type, resource_id, metadata, status
            FROM audit_logs
            WHERE user_id = $1 AND action = 'revoke_all_sessions'
            ORDER BY created_at DESC
            LIMIT 1
        ",
    )
    .bind(session.user_id)
    .fetch_one(&pool)
    .await
    .expect("audit_logs row must exist after revoke-all");

    assert_eq!(row.action, "revoke_all_sessions");
    assert_eq!(row.resource_type, "user");
    assert_eq!(row.resource_id.unwrap(), session.user_id);
    assert_eq!(row.status.as_deref(), Some("success"));
    assert!(
        row.metadata.unwrap()["keep_current"].as_bool().unwrap(),
        "metadata.keep_current must echo the request flag (true)",
    );
}
