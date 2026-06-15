//! Integration tests for viewing bookings (`/api/v1/.../viewings`).
//!
//! A two-sided domain: a tenant books, the listing's landlord confirms/cancels.
//! - **Book** (`POST /listings/{id}/viewings`): tenant-only, requires an ACTIVE
//!   listing; `viewingTime` must be non-blank.
//! - **My viewings** (`GET /viewings`): tenant-only, scoped, nested listing.
//! - **Listing viewings** (`GET /listings/{id}/viewings`): landlord-only,
//!   owner-scoped.
//! - **Cancel** (`DELETE .../{viewingId}`): tenant-only HARD delete of their own
//!   booking, in any status.
//! - **Review** (`PUT .../{viewingId}`): landlord-only; `pending ->
//!   confirmed/cancelled`. Ownership is gated on the LISTING, so a non-owning
//!   landlord gets `403` (unlike applications' `404`).

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// A valid book payload.
fn book_body() -> Value {
    json!({ "viewingDate": "2026-09-01", "viewingTime": "14:00" })
}

/// Seeds an ACTIVE listing owned by `landlord_id` (booking requires active).
async fn active_listing(
    env: &TestEnv,
    pool: &PgPool,
    landlord_id: Uuid,
    landlord_token: &str,
) -> Uuid {
    let property_id = common::seed_property(pool, landlord_id).await;
    let listing_id = common::create_draft_listing(env, landlord_token, property_id).await;
    common::activate_listing(pool, listing_id).await;
    listing_id
}

/// `POST /listings/{id}/viewings` with `body`.
async fn book(env: &TestEnv, token: &str, listing_id: Uuid, body: &Value) -> (StatusCode, Value) {
    let (status, json) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/viewings"),
        token,
        body,
    )
    .await;
    (status, json.unwrap_or(Value::Null))
}

/// Books a viewing and returns its id (asserts success).
async fn book_id(env: &TestEnv, token: &str, listing_id: Uuid) -> Uuid {
    let (status, body) = book(env, token, listing_id, &book_body()).await;
    assert_eq!(status, StatusCode::CREATED);
    Uuid::parse_str(body["id"].as_str().unwrap()).unwrap()
}

/// `PUT /listings/{id}/viewings/{viewingId}` to `status`.
async fn update_status(
    env: &TestEnv,
    token: &str,
    listing_id: Uuid,
    viewing_id: Uuid,
    status: &str,
) -> (StatusCode, Value) {
    let (code, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/viewings/{viewing_id}"),
        token,
        &json!({ "status": status }),
    )
    .await;
    (code, body.unwrap_or(Value::Null))
}

/// `DELETE /listings/{id}/viewings/{viewingId}`.
async fn cancel(env: &TestEnv, token: &str, listing_id: Uuid, viewing_id: Uuid) -> StatusCode {
    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/listings/{listing_id}/viewings/{viewing_id}"),
        token,
        &Value::Null,
    )
    .await;
    status
}

// `POST /listings/{id}/viewings` book -----------------------------------------

/// Booking against an active listing is created as `pending`, landlord
/// denormalized.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn book_returns_201_pending(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (status, body) = book(&env, &tenant_token, listing_id, &book_body()).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["status"], "pending");
    assert_eq!(body["listingId"].as_str().unwrap(), listing_id.to_string());
    assert_eq!(body["userId"].as_str().unwrap(), tenant_id.to_string());
    assert_eq!(
        body["landlordId"].as_str().unwrap(),
        landlord_id.to_string()
    );
}

/// A blank `viewingTime` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn book_rejects_empty_time_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let body = json!({ "viewingDate": "2026-09-01", "viewingTime": "   " });
    let (status, error) = book(&env, &tenant_token, listing_id, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("viewingTime cannot be empty")
    );
}

/// Booking against a non-active (draft) listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn book_inactive_listing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &landlord_token, property_id).await;

    let (status, _body) = book(&env, &tenant_token, listing_id, &book_body()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Booking against an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn book_unknown_listing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = book(&env, &tenant_token, Uuid::new_v4(), &book_body()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn book_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = book(&env, &token, Uuid::new_v4(), &book_body()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn book_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post(&format!("/api/v1/listings/{}/viewings", Uuid::new_v4()))
        .json(&book_body())
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `GET /viewings` my viewings -------------------------------------------------

/// The tenant sees their own booking with the nested listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_my_viewings_returns_nested(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    book(&env, &tenant_token, listing_id, &book_body()).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/viewings",
        &tenant_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(
        body["data"][0]["listing"]["id"].as_str().unwrap(),
        listing_id.to_string()
    );
}

/// One tenant's bookings never appear in another tenant's list.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_my_viewings_cross_tenant_isolation(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    book(&env, &tenant_a, listing_id, &book_body()).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/viewings",
        &tenant_b,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["itemCount"], 0);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_my_viewings_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/viewings",
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `GET /listings/{id}/viewings` listing viewings ------------------------------

/// The owning landlord sees the bookings on their listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_viewings_for_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    book(&env, &tenant_token, listing_id, &book_body()).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/viewings"),
        &landlord_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["itemCount"], 1);
}

/// A landlord who does not own the listing cannot view its bookings -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_viewings_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/viewings"),
        &other_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Listing viewings for an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_viewings_unknown_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{}/viewings", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_viewings_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{}/viewings", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `DELETE /listings/{id}/viewings/{viewingId}` tenant cancel ------------------

/// The tenant cancels their own pending booking -> `204`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cancel_returns_204(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;

    assert_eq!(
        cancel(&env, &tenant_token, listing_id, viewing_id).await,
        StatusCode::NO_CONTENT
    );
}

/// The tenant can cancel even a confirmed booking (hard delete, any status).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cancel_confirmed_viewing_204(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;
    // Landlord confirms first.
    update_status(&env, &landlord_token, listing_id, viewing_id, "confirmed").await;

    assert_eq!(
        cancel(&env, &tenant_token, listing_id, viewing_id).await,
        StatusCode::NO_CONTENT
    );
}

/// Cancelling an unknown booking -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cancel_not_found_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    assert_eq!(
        cancel(&env, &tenant_token, Uuid::new_v4(), Uuid::new_v4()).await,
        StatusCode::NOT_FOUND
    );
}

/// The cancel is user-scoped: tenant B cannot delete tenant A's booking (`404`),
/// and A's booking survives.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cancel_is_user_scoped(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_a, listing_id).await;

    assert_eq!(
        cancel(&env, &tenant_b, listing_id, viewing_id).await,
        StatusCode::NOT_FOUND
    );
    // A's booking is untouched.
    let (_s, a_list) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/viewings",
        &tenant_a,
        &Value::Null,
    )
    .await;
    assert_eq!(a_list.unwrap()["itemCount"], 1);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn cancel_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    assert_eq!(
        cancel(&env, &token, Uuid::new_v4(), Uuid::new_v4()).await,
        StatusCode::FORBIDDEN
    );
}

// `PUT /listings/{id}/viewings/{viewingId}` landlord review -------------------

/// The landlord confirms a pending booking.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_confirm_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;

    let (status, body) =
        update_status(&env, &landlord_token, listing_id, viewing_id, "confirmed").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "confirmed");
}

/// The landlord cancels (rejects) a pending booking.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_cancel_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;

    let (status, body) =
        update_status(&env, &landlord_token, listing_id, viewing_id, "cancelled").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "cancelled");
}

/// Reviewing to `pending` is not a valid decision -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_set_pending_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;

    let (status, _body) =
        update_status(&env, &landlord_token, listing_id, viewing_id, "pending").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// A second review of an already-decided booking -> `409`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_double_review_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;

    update_status(&env, &landlord_token, listing_id, viewing_id, "confirmed").await;
    let (status, body) =
        update_status(&env, &landlord_token, listing_id, viewing_id, "cancelled").await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(body["error"].as_str().unwrap().contains("not pending"));
}

/// A landlord who does not own the listing is gated on listing ownership ->
/// `403` (the listing-owner check runs before the booking lookup).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let viewing_id = book_id(&env, &tenant_token, listing_id).await;

    let (status, _body) =
        update_status(&env, &other_token, listing_id, viewing_id, "confirmed").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// On the owner's listing, an unknown booking id -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_unknown_viewing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (status, _body) = update_status(
        &env,
        &landlord_token,
        listing_id,
        Uuid::new_v4(),
        "confirmed",
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) =
        update_status(&env, &token, Uuid::new_v4(), Uuid::new_v4(), "confirmed").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}
