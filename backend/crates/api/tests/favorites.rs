//! Integration tests for tenant favorites (`/api/v1/favorites`).
//!
//! A tenant-only domain: every query is scoped by the caller's user id, so
//! cross-tenant isolation is structural. Covers:
//! - **Add** (`POST`): saves a live listing, nests it whole; duplicate -> `409`,
//!   unknown/withdrawn listing -> `404`.
//! - **Remove** (`DELETE /{listingId}`): user-scoped soft of a save; `204`, or
//!   `404` when the caller never saved it.
//! - **List** (`GET`) and **ids** (`GET /ids`): the caller's saves, newest
//!   first, never another tenant's.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// Seeds a property + draft listing owned by `landlord_id`; returns its id.
/// A draft is live (`deleted_at IS NULL`), which is all a favorite requires.
async fn seed_listing(
    env: &TestEnv,
    pool: &PgPool,
    landlord_id: Uuid,
    landlord_token: &str,
) -> Uuid {
    let property_id = common::seed_property(pool, landlord_id).await;
    common::create_draft_listing(env, landlord_token, property_id).await
}

/// `POST /favorites` with `{ listingId }`.
async fn add_favorite(env: &TestEnv, token: &str, listing_id: Uuid) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/favorites",
        token,
        &json!({ "listingId": listing_id }),
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// `GET /favorites` (paginated saves with nested listings).
async fn list_favorites(env: &TestEnv, token: &str) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/favorites",
        token,
        &Value::Null,
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

// `POST /favorites` -----------------------------------------------------------

/// Saving a listing returns `201` with the timestamp and the nested listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn add_favorite_returns_201_with_nested_listing(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = seed_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (status, body) = add_favorite(&env, &tenant_token, listing_id).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["listingId"].as_str().unwrap(), listing_id.to_string());
    assert!(body["favoritedAt"].as_str().is_some());
    assert_eq!(
        body["listing"]["id"].as_str().unwrap(),
        listing_id.to_string()
    );
}

/// Saving the same listing twice -> `409`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn add_favorite_duplicate_returns_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = seed_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (first, _b1) = add_favorite(&env, &tenant_token, listing_id).await;
    assert_eq!(first, StatusCode::CREATED);
    let (second, body) = add_favorite(&env, &tenant_token, listing_id).await;

    assert_eq!(second, StatusCode::CONFLICT);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("already favorited")
    );
}

/// Saving an unknown (or withdrawn) listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn add_favorite_unknown_listing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = add_favorite(&env, &tenant_token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn add_favorite_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = add_favorite(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn add_favorite_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/favorites")
        .json(&json!({ "listingId": Uuid::new_v4() }))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `DELETE /favorites/{listingId}` ---------------------------------------------

/// Removing a saved listing returns `204`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn remove_favorite_returns_204(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = seed_listing(&env, &pool, landlord_id, &landlord_token).await;
    add_favorite(&env, &tenant_token, listing_id).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/favorites/{listing_id}"),
        &tenant_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
}

/// Removing a listing the caller never saved -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn remove_favorite_not_favorited_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/favorites/{}", Uuid::new_v4()),
        &tenant_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// The delete is user-scoped: tenant B cannot remove tenant A's save (it is not
/// theirs, so `404`), and A's save survives.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn remove_favorite_is_user_scoped(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = seed_listing(&env, &pool, landlord_id, &landlord_token).await;
    add_favorite(&env, &tenant_a, listing_id).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/favorites/{listing_id}"),
        &tenant_b,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    // A's save is untouched.
    let (_s, a_list) = list_favorites(&env, &tenant_a).await;
    assert_eq!(a_list["itemCount"], 1);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn remove_favorite_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/favorites/{}", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `GET /favorites` + `GET /favorites/ids` -------------------------------------

/// The list returns the caller's saves, each with the nested listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_favorites_returns_nested(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = seed_listing(&env, &pool, landlord_id, &landlord_token).await;
    add_favorite(&env, &tenant_token, listing_id).await;

    let (status, body) = list_favorites(&env, &tenant_token).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 1);
    assert_eq!(
        body["data"][0]["listing"]["id"].as_str().unwrap(),
        listing_id.to_string()
    );
}

/// A tenant with no saves gets an empty list.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_favorites_empty(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, body) = list_favorites(&env, &tenant_token).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 0);
}

/// One tenant's saves never appear in another tenant's list.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_favorites_cross_tenant_isolation(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = seed_listing(&env, &pool, landlord_id, &landlord_token).await;
    add_favorite(&env, &tenant_a, listing_id).await;

    let (status, body) = list_favorites(&env, &tenant_b).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 0);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_favorites_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = list_favorites(&env, &token).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// The ids feed returns one entry per saved listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_favorite_ids_returns_ids(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let first = seed_listing(&env, &pool, landlord_id, &landlord_token).await;
    let second = seed_listing(&env, &pool, landlord_id, &landlord_token).await;
    add_favorite(&env, &tenant_token, first).await;
    add_favorite(&env, &tenant_token, second).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/favorites/ids",
        &tenant_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let ids = body.unwrap();
    assert_eq!(ids.as_array().unwrap().len(), 2);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_favorite_ids_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/favorites/ids",
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}
