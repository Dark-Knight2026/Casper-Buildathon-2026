//! Integration tests for listing lifecycle + reporting (C23, non-gate half).
//!
//! Covers the state machine outside the authority gate (the `-> active` gate is
//! `listings_gate.rs`):
//! - **Submit** (`POST /{id}/submit`): `draft -> pending`; illegal from any
//!   other state.
//! - **Transitions** (`PUT /{id}/state`): the legal forward edges
//!   (`active -> leased/sold/draft`, `pending -> draft`) and the `409` illegal
//!   ones; outcome order is `NotFound` -> Forbidden -> Illegal -> `GateFailed`.
//! - **Withdraw** (`DELETE /{id}`): soft delete (`state='withdrawn'` +
//!   `deleted_at`), after which detail is `404`.
//! - **Statistics / historical-data**: owner-scoped reporting (`404` to others).
//! - **Auto-expiry worker**: `process_expiry` flips past-due active listings to
//!   `expired` and refreshes `days_on_market`, driven synchronously.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::{UserRole, workers::listing_expiry};
use common::TestEnv;

/// Seeds a property + draft listing owned by `landlord_id`; returns the id.
async fn draft_listing(env: &TestEnv, pool: &PgPool, landlord_id: Uuid, token: &str) -> Uuid {
    let property_id = common::seed_property(pool, landlord_id).await;
    common::create_draft_listing(env, token, property_id).await
}

/// Seeds a draft and force-activates it (bypassing the gate); returns the id.
async fn active_listing(env: &TestEnv, pool: &PgPool, landlord_id: Uuid, token: &str) -> Uuid {
    let listing_id = draft_listing(env, pool, landlord_id, token).await;
    common::activate_listing(pool, listing_id).await;
    listing_id
}

/// `POST /listings/{id}/submit` as `token`.
async fn submit(env: &TestEnv, token: &str, listing_id: Uuid) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/submit"),
        token,
        &Value::Null,
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// `PUT /listings/{id}/state` to `state` as `token`.
async fn set_state(
    env: &TestEnv,
    token: &str,
    listing_id: Uuid,
    state: &str,
) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/state"),
        token,
        &json!({ "state": state }),
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// Reads a listing's stored state directly (sees withdrawn/expired rows that the
/// public API hides).
async fn db_state(pool: &PgPool, listing_id: Uuid) -> String {
    sqlx::query_scalar::<_, String>("SELECT state FROM listings WHERE id = $1")
        .bind(listing_id)
        .fetch_one(pool)
        .await
        .expect("listing state")
}

// POST /listings/{id}/submit --------------------------------------------------

/// A draft submits to `pending`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_draft_returns_200_pending(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = draft_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = submit(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["state"], "pending");
}

/// Submitting a non-draft (here: active) listing is an illegal transition.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_non_draft_returns_409_illegal(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = submit(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("cannot transition listing from active to pending")
    );
}

/// A non-owner cannot submit someone else's listing -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = draft_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, body) = submit(&env, &other_token, listing_id).await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["error"].as_str().unwrap(), "not_listing_owner");
}

/// Submitting an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = submit(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = submit(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// PUT /listings/{id}/state: legal + illegal transitions -----------------------

/// `active -> leased` is a legal forward edge.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_active_to_leased_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = set_state(&env, &token, listing_id, "leased").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["state"], "leased");
}

/// `active -> sold` is legal.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_active_to_sold_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = set_state(&env, &token, listing_id, "sold").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["state"], "sold");
}

/// `active -> draft` (unpublish) is legal.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_active_to_draft_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = set_state(&env, &token, listing_id, "draft").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["state"], "draft");
}

/// `pending -> draft` (withdraw a submission) is legal.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_pending_to_draft_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = draft_listing(&env, &pool, landlord_id, &token).await;
    submit(&env, &token, listing_id).await; // -> pending

    let (status, body) = set_state(&env, &token, listing_id, "draft").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["state"], "draft");
}

/// `draft -> leased` skips the required intermediate states -> `409` illegal.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_illegal_draft_to_leased_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = draft_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = set_state(&env, &token, listing_id, "leased").await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("cannot transition listing from draft to leased")
    );
}

/// `withdrawn` is never settable via the state endpoint -> `409` illegal.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_illegal_target_withdrawn_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, _body) = set_state(&env, &token, listing_id, "withdrawn").await;
    assert_eq!(status, StatusCode::CONFLICT);
}

/// A non-owner cannot transition someone else's listing -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, body) = set_state(&env, &other_token, listing_id, "leased").await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(body["error"].as_str().unwrap(), "not_listing_owner");
}

/// Transitioning an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = set_state(&env, &token, Uuid::new_v4(), "leased").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_state_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = set_state(&env, &token, Uuid::new_v4(), "leased").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// DELETE /listings/{id}: soft withdraw ----------------------------------------

/// Withdraw returns `204` and soft-deletes: state becomes `withdrawn` with a
/// stamped `deleted_at`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn withdraw_returns_204_and_soft_deletes(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/listings/{listing_id}"),
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::NO_CONTENT);
    assert_eq!(db_state(&pool, listing_id).await, "withdrawn");
    let deleted_at_set =
        sqlx::query_scalar::<_, bool>("SELECT deleted_at IS NOT NULL FROM listings WHERE id = $1")
            .bind(listing_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(deleted_at_set, "withdraw must stamp deleted_at");
}

/// After withdraw, the public detail read no longer finds the listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn withdraw_then_detail_returns_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/listings/{listing_id}"),
        &token,
        &Value::Null,
    )
    .await;

    let response = env
        .server
        .get(&format!("/api/v1/listings/{listing_id}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}

/// A non-owner cannot withdraw someone else's listing -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn withdraw_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/listings/{listing_id}"),
        &other_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Withdrawing an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn withdraw_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/listings/{}", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn withdraw_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/listings/{}", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// GET /listings/{id}/statistics -----------------------------------------------

/// A fresh active listing reports zeroed metrics to its owner.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn statistics_returns_200_for_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/statistics"),
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["totalViews"], 0);
    assert_eq!(body["totalApplications"], 0);
    assert_eq!(body["activeLeases"], 0);
    assert!(body["occupancyRate"].is_number());
}

/// A recorded tenant view shows up in `totalViews`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn statistics_counts_views(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/view"),
        &tenant_token,
        &Value::Null,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/statistics"),
        &landlord_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["totalViews"], 1);
}

/// Statistics for a listing the caller does not own -> `404` (no ownership leak).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn statistics_returns_404_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/statistics"),
        &other_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn statistics_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{}/statistics", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// GET /listings/{id}/historical-data ------------------------------------------

/// A fresh listing has no history.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn historical_data_returns_200_no_history(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/historical-data"),
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["totalLeases"], 0);
    assert_eq!(body["totalViews"], 0);
    assert_eq!(body["hasHistoricalData"], false);
}

/// A recorded view flips `hasHistoricalData` to `true`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn historical_data_reflects_views(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/view"),
        &tenant_token,
        &Value::Null,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/historical-data"),
        &landlord_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["totalViews"], 1);
    assert_eq!(body["hasHistoricalData"], true);
}

/// Historical data for a listing the caller does not own -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn historical_data_returns_404_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/historical-data"),
        &other_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// Auto-expiry worker ----------------------------------------------------------

/// A past-due active listing is flipped to `expired` by one expiry pass.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn expiry_expires_past_due_active_listing(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;
    sqlx::query("UPDATE listings SET expires_at = now() - INTERVAL '1 day' WHERE id = $1")
        .bind(listing_id)
        .execute(&pool)
        .await
        .unwrap();

    listing_expiry::process_expiry(&pool)
        .await
        .expect("expiry pass");

    assert_eq!(db_state(&pool, listing_id).await, "expired");
}

/// An active listing whose expiry is in the future stays active.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn expiry_leaves_future_listing_active(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    // activate_listing sets expires_at 90 days out.
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;

    listing_expiry::process_expiry(&pool)
        .await
        .expect("expiry pass");

    assert_eq!(db_state(&pool, listing_id).await, "active");
}

/// The expiry pass refreshes `days_on_market` from `created_at` for live
/// listings (monotonic: backdating creation by 5 days yields 5).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn expiry_refreshes_days_on_market(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &token).await;
    sqlx::query("UPDATE listings SET created_at = now() - INTERVAL '5 days' WHERE id = $1")
        .bind(listing_id)
        .execute(&pool)
        .await
        .unwrap();

    listing_expiry::process_expiry(&pool)
        .await
        .expect("expiry pass");

    let days = sqlx::query_scalar::<_, i32>("SELECT days_on_market FROM listings WHERE id = $1")
        .bind(listing_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(days, 5);
}
