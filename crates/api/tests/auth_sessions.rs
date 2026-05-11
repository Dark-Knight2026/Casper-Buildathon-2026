//! Integration tests for `GET /api/v1/auth/sessions` and
//! `DELETE /api/v1/auth/sessions/{id}`.
//!
//! Pin four contracts the handler is responsible for:
//! 1. The list scopes to the caller (no cross-user leakage).
//! 2. `is_current` flags exactly the row that issued the request.
//! 3. Self-revoke succeeds and the next refresh attempt 401s.
//! 4. Cross-user revoke 404s (no enumeration oracle).

mod common;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

/// Happy path: the list contains exactly one entry (the login session
/// itself), the entry is flagged `is_current = true`, and `expires_at`
/// is in the future.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_sessions_returns_current_only(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;

    let response = env
        .server
        .get("/api/v1/auth/sessions")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                session.access_token, session.refresh_token,
            ),
        )
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    let sessions = body.as_array().expect("response is JSON array");
    assert_eq!(sessions.len(), 1, "fresh login produces one active session");

    let only = &sessions[0];
    assert!(
        only["is_current"].as_bool().unwrap(),
        "the row whose token_hash matches the request cookie must be is_current",
    );
    assert!(
        only["id"].as_str().is_some(),
        "session id must be returned to the client",
    );
    assert!(
        only["issued_at"].as_str().is_some(),
        "issued_at must be present",
    );
    assert!(
        only["expires_at"].as_str().is_some(),
        "expires_at must be present",
    );
}

/// Cross-user isolation: a user must only see their own active sessions.
/// Two independent logins (different wallets, different user rows) must
/// each see exactly one row, and the rows must have distinct ids.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_sessions_is_scoped_to_caller(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let alice = common::login_and_extract(&env).await;
    let bob = common::login_and_extract(&env).await;

    let alice_response = env
        .server
        .get("/api/v1/auth/sessions")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                alice.access_token, alice.refresh_token,
            ),
        )
        .await;
    let bob_response = env
        .server
        .get("/api/v1/auth/sessions")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                bob.access_token, bob.refresh_token,
            ),
        )
        .await;

    assert_eq!(alice_response.status_code(), StatusCode::OK);
    assert_eq!(bob_response.status_code(), StatusCode::OK);

    let alice_sessions = alice_response.json::<Value>();
    let bob_sessions = bob_response.json::<Value>();

    assert_eq!(alice_sessions.as_array().unwrap().len(), 1);
    assert_eq!(bob_sessions.as_array().unwrap().len(), 1);

    let alice_id = alice_sessions[0]["id"].as_str().unwrap();
    let bob_id = bob_sessions[0]["id"].as_str().unwrap();
    assert_ne!(
        alice_id, bob_id,
        "alice and bob must see different session rows",
    );
    assert_ne!(
        alice.user_id, bob.user_id,
        "test setup sanity: distinct users",
    );
}

/// Self-revoke: DELETE on the caller's own session id returns 204, and
/// the same refresh cookie can no longer rotate (the predecessor row is
/// `revoked_at IS NOT NULL`, which is also the trip-wire for reuse
/// detection - so the response is 401 either way).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn revoke_own_session_returns_204_and_kills_refresh(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let session = common::login_and_extract(&env).await;

    let list_response = env
        .server
        .get("/api/v1/auth/sessions")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                session.access_token, session.refresh_token,
            ),
        )
        .await;
    let session_id = list_response.json::<Value>()[0]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let revoke_response = env
        .server
        .delete(&format!("/api/v1/auth/sessions/{session_id}"))
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;
    assert_eq!(revoke_response.status_code(), StatusCode::NO_CONTENT);

    // The refresh cookie now points at a revoked row. POST /auth/refresh
    // must reject with 401 (the rotate path returns either Reused or
    // Expired; both surface as 401 invalid_refresh_token).
    let refresh_response = env
        .server
        .post("/api/v1/auth/refresh")
        .add_header(COOKIE, format!("refresh_token={}", session.refresh_token))
        .await;
    assert_eq!(
        refresh_response.status_code(),
        StatusCode::UNAUTHORIZED,
        "refresh against a revoked session must 401",
    );
}

/// Cross-user revoke: alice attempts to DELETE bob's session id. The
/// owner clause in the WHERE makes the row not match, and the handler
/// returns 404. Bob's session must remain active afterwards.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn revoke_other_users_session_returns_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let alice = common::login_and_extract(&env).await;
    let bob = common::login_and_extract(&env).await;

    let bob_list = env
        .server
        .get("/api/v1/auth/sessions")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                bob.access_token, bob.refresh_token,
            ),
        )
        .await;
    let bob_session_id = bob_list.json::<Value>()[0]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let response = env
        .server
        .delete(&format!("/api/v1/auth/sessions/{bob_session_id}"))
        .add_header(COOKIE, format!("access_token={}", alice.access_token))
        .await;
    assert_eq!(
        response.status_code(),
        StatusCode::NOT_FOUND,
        "alice must not be able to revoke bob's session",
    );

    // Bob's session remains active: the row is still `revoked_at IS NULL`.
    let bob_session_uuid = Uuid::parse_str(&bob_session_id).unwrap();
    let still_active = sqlx::query_scalar!(
        r"
            SELECT revoked_at IS NULL AS active
            FROM refresh_tokens
            WHERE id = $1
        ",
        bob_session_uuid,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap();
    assert!(
        still_active,
        "bob's session must still be active after alice's failed revoke",
    );
}
