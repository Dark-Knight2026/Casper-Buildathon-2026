//! Integration tests for rental applications (`/api/v1/.../applications`).
//!
//! A two-sided domain: a tenant submits, the listing's landlord reviews.
//! - **Submit** (`POST /listings/{id}/applications`): tenant-only, requires an
//!   ACTIVE listing; full input validation; `landlord_id` denormalized from the
//!   listing.
//! - **My applications** (`GET /applications`): tenant-only, scoped, nested
//!   listing.
//! - **Listing applications** (`GET /listings/{id}/applications`): landlord-only,
//!   owner-scoped.
//! - **Review** (`PUT /applications/{id}/status`): landlord-only; `pending ->
//!   approved/rejected`; a non-owning landlord gets `404` (no leak), a
//!   second review `409`.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// A complete, valid submit payload. Tests clone and mutate one field to target
/// a single validation branch.
fn app_body() -> Value {
    json!({
        "fullName": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+1-555-0100",
        "dateOfBirth": "1990-05-15",
        "currentAddress": "1 Main St",
        "currentCity": "Denver",
        "currentState": "CO",
        "currentZip": "80202",
        "moveInDate": "2026-09-01",
        "employer": "Acme Corp",
        "jobTitle": "Engineer",
        "employmentLength": "3 years",
        "monthlyIncome": 6000.0,
        "reference1Name": "Bob Smith",
        "reference1Phone": "+1-555-0199",
        "pets": false,
        "backgroundCheckConsent": true,
    })
}

/// Seeds an ACTIVE listing owned by `landlord_id` (submit requires active).
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

/// `POST /listings/{id}/applications` with `body`.
async fn submit_app(
    env: &TestEnv,
    token: &str,
    listing_id: Uuid,
    body: &Value,
) -> (StatusCode, Value) {
    let (status, json) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/applications"),
        token,
        body,
    )
    .await;
    (status, json.unwrap_or(Value::Null))
}

/// `PUT /applications/{id}/status` to `status`.
async fn review(
    env: &TestEnv,
    token: &str,
    application_id: Uuid,
    status: &str,
) -> (StatusCode, Value) {
    let (code, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/applications/{application_id}/status"),
        token,
        &json!({ "status": status }),
    )
    .await;
    (code, body.unwrap_or(Value::Null))
}

/// `GET /applications/{id}`.
async fn get_app(env: &TestEnv, token: &str, application_id: Uuid) -> (StatusCode, Value) {
    let (code, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/applications/{application_id}"),
        token,
        &Value::Null,
    )
    .await;
    (code, body.unwrap_or(Value::Null))
}

/// `GET /applications/landlord{query}`; `query` is the raw `?...` suffix or "".
async fn landlord_apps(env: &TestEnv, token: &str, query: &str) -> (StatusCode, Value) {
    let (code, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/applications/landlord{query}"),
        token,
        &Value::Null,
    )
    .await;
    (code, body.unwrap_or(Value::Null))
}

// `POST /listings/{id}/applications` submit -----------------------------------

/// A valid application against an active listing is created as `pending`, with
/// the landlord denormalized from the listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_returns_201_pending(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (status, body) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["status"], "pending");
    assert_eq!(body["listingId"].as_str().unwrap(), listing_id.to_string());
    assert_eq!(body["userId"].as_str().unwrap(), tenant_id.to_string());
    assert_eq!(
        body["landlordId"].as_str().unwrap(),
        landlord_id.to_string()
    );
}

/// A blank required field -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejects_blank_field_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let mut body = app_body();
    body["fullName"] = json!("   ");
    let (status, error) = submit_app(&env, &tenant_token, listing_id, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("fullName cannot be empty")
    );
}

/// An email without `@` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejects_invalid_email_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let mut body = app_body();
    body["email"] = json!("not-an-email");
    let (status, error) = submit_app(&env, &tenant_token, listing_id, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("email is invalid")
    );
}

/// A non-positive monthly income -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejects_nonpositive_income_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let mut body = app_body();
    body["monthlyIncome"] = json!(0.0);
    let (status, error) = submit_app(&env, &tenant_token, listing_id, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("monthlyIncome must be a positive number")
    );
}

/// Applying to a non-active (draft) listing -> `404` (applications attach only
/// to active listings).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_inactive_listing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    // Draft, NOT activated.
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &landlord_token, property_id).await;

    let (status, _body) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Applying to an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_unknown_listing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = submit_app(&env, &tenant_token, Uuid::new_v4(), &app_body()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = submit_app(&env, &token, Uuid::new_v4(), &app_body()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post(&format!("/api/v1/listings/{}/applications", Uuid::new_v4()))
        .json(&app_body())
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `GET /applications` my applications -----------------------------------------

/// The tenant sees their own application with the nested listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_my_applications_returns_nested(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_token, listing_id, &app_body()).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/applications",
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

/// One tenant's applications never appear in another tenant's list.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_my_applications_cross_tenant_isolation(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_a, listing_id, &app_body()).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/applications",
        &tenant_b,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["itemCount"], 0);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_my_applications_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/applications",
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `GET /listings/{id}/applications` listing applications ----------------------

/// The owning landlord sees the applications on their listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_applications_for_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_token, listing_id, &app_body()).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/applications"),
        &landlord_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["itemCount"], 1);
}

/// A landlord who does not own the listing cannot view its applications -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_applications_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/applications"),
        &other_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Listing applications for an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_applications_unknown_listing_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{}/applications", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_applications_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{}/applications", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `GET /applications/{id}` single application ---------------------------------

/// The applicant sees their own application by id, with the nested listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_applicant_sees_own(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = get_app(&env, &tenant_token, app_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["id"].as_str().unwrap(), app_id.to_string());
    assert_eq!(body["userId"].as_str().unwrap(), tenant_id.to_string());
    assert_eq!(
        body["listing"]["id"].as_str().unwrap(),
        listing_id.to_string()
    );
}

/// The reviewing landlord sees the same application by id.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_landlord_sees_it(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = get_app(&env, &landlord_token, app_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["landlordId"].as_str().unwrap(),
        landlord_id.to_string()
    );
}

/// A user who is neither the applicant nor the landlord gets `404` (no leak).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_third_party_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = get_app(&env, &other_token, app_id).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// An unknown application id -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_unknown_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = get_app(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/applications/{}", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `GET /applications/landlord` cross-listing ----------------------------------

/// The landlord sees applications across all their listings, each with a nested
/// listing.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_spans_listings(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing1 = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let listing2 = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_a, listing1, &app_body()).await;
    submit_app(&env, &tenant_b, listing2, &app_body()).await;

    let (status, body) = landlord_apps(&env, &landlord_token, "").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 2);
    assert!(body["data"][0]["listing"]["id"].is_string());
}

/// One landlord's applications never appear in another landlord's list.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_isolation(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_token, listing_id, &app_body()).await;

    let (status, body) = landlord_apps(&env, &other_token, "").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 0);
}

/// The status filter narrows to matching applications.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_filter_status(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app_a) = submit_app(&env, &tenant_a, listing_id, &app_body()).await;
    submit_app(&env, &tenant_b, listing_id, &app_body()).await;
    let app_a_id = Uuid::parse_str(app_a["id"].as_str().unwrap()).unwrap();
    review(&env, &landlord_token, app_a_id, "approved").await;

    let (status, body) = landlord_apps(&env, &landlord_token, "?status=approved").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 1);
    assert_eq!(body["data"][0]["status"], "approved");
}

/// The search filter matches on applicant name (case-insensitive).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_filter_search(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let mut body_a = app_body();
    body_a["fullName"] = json!("Alice Walker");
    let mut body_b = app_body();
    body_b["fullName"] = json!("Bob Jones");
    submit_app(&env, &tenant_a, listing_id, &body_a).await;
    submit_app(&env, &tenant_b, listing_id, &body_b).await;

    let (status, body) = landlord_apps(&env, &landlord_token, "?search=alice").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 1);
    assert_eq!(body["data"][0]["fullName"], "Alice Walker");
}

/// The listing filter restricts to one listing's applications.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_filter_listing(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing1 = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let listing2 = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_a, listing1, &app_body()).await;
    submit_app(&env, &tenant_b, listing2, &app_body()).await;

    let (status, body) =
        landlord_apps(&env, &landlord_token, &format!("?listingId={listing1}")).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["itemCount"], 1);
    assert_eq!(
        body["data"][0]["listingId"].as_str().unwrap(),
        listing1.to_string()
    );
}

/// The submission-date filter excludes applications outside the range.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_filter_date_from(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    submit_app(&env, &tenant_token, listing_id, &app_body()).await;

    let (_s, past) = landlord_apps(&env, &landlord_token, "?dateFrom=2000-01-01").await;
    assert_eq!(past["itemCount"], 1);
    let (_s, future) = landlord_apps(&env, &landlord_token, "?dateFrom=2999-01-01").await;
    assert_eq!(future["itemCount"], 0);
}

/// `dateFrom` after `dateTo` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_invalid_date_range_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) =
        landlord_apps(&env, &token, "?dateFrom=2026-12-31&dateTo=2026-01-01").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = landlord_apps(&env, &token, "").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/applications/landlord").await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `PUT /applications/{id}/status` review --------------------------------------

/// The landlord approves a pending application.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_approve_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = review(&env, &landlord_token, app_id, "approved").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "approved");
}

/// The landlord rejects a pending application.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_reject_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = review(&env, &landlord_token, app_id, "rejected").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "rejected");
}

/// The landlord moves a pending application into `under_review`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_to_under_review_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = review(&env, &landlord_token, app_id, "under_review").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "under_review");
}

/// The landlord conditionally approves a pending application.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_to_conditional_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = review(&env, &landlord_token, app_id, "conditional").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "conditional");
}

/// An application advances through `under_review` to `approved`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_under_review_then_approved(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    review(&env, &landlord_token, app_id, "under_review").await;
    let (status, body) = review(&env, &landlord_token, app_id, "approved").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "approved");
}

/// `draft` is not a reachable review target -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_set_draft_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = review(&env, &landlord_token, app_id, "draft").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// Reviewing to `pending` is not a valid decision -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_set_pending_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = review(&env, &landlord_token, app_id, "pending").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// Re-deciding an already-terminal application -> `409` (no transition out of a
/// terminal status).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_double_review_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    review(&env, &landlord_token, app_id, "approved").await;
    let (status, body) = review(&env, &landlord_token, app_id, "rejected").await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(body["error"].as_str().unwrap().contains("transition"));
}

/// Reviewing an unknown application -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_unknown_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = review(&env, &token, Uuid::new_v4(), "approved").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A landlord who is not the application's reviewer gets `404`, not a leak.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_non_owner_landlord_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = review(&env, &other_token, app_id, "approved").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn review_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = review(&env, &token, Uuid::new_v4(), "approved").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}
