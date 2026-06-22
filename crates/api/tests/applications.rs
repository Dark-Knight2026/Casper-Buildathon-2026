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

/// `POST /applications/{id}/notes` with `body`.
async fn add_note(
    env: &TestEnv,
    token: &str,
    application_id: Uuid,
    body: &str,
) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/applications/{application_id}/notes"),
        token,
        &json!({ "body": body }),
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// `GET /applications/{id}/notes`.
async fn list_notes(env: &TestEnv, token: &str, application_id: Uuid) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/applications/{application_id}/notes"),
        token,
        &Value::Null,
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// `POST /applications/{id}/background-checks` for `check_type`.
async fn request_check(
    env: &TestEnv,
    token: &str,
    application_id: Uuid,
    check_type: &str,
) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/applications/{application_id}/background-checks"),
        token,
        &json!({ "checkType": check_type }),
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// `GET /applications/{id}/background-checks`.
async fn list_checks(env: &TestEnv, token: &str, application_id: Uuid) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/applications/{application_id}/background-checks"),
        token,
        &Value::Null,
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// `GET /applications/{id}/score`.
async fn get_score(env: &TestEnv, token: &str, application_id: Uuid) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/applications/{application_id}/score"),
        token,
        &Value::Null,
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// The `score` of a named factor in a score `breakdown`.
fn factor_score(body: &Value, factor: &str) -> i64 {
    body["breakdown"]
        .as_array()
        .unwrap()
        .iter()
        .find(|entry| entry["factor"] == factor)
        .unwrap_or_else(|| panic!("missing factor {factor}"))["score"]
        .as_i64()
        .unwrap()
}

/// `PATCH /applications/{id}` with `body`.
async fn patch_app(
    env: &TestEnv,
    token: &str,
    application_id: Uuid,
    body: &Value,
) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/applications/{application_id}"),
        token,
        body,
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// `POST /applications/{id}/submit`.
async fn submit_draft(env: &TestEnv, token: &str, application_id: Uuid) -> (StatusCode, Value) {
    let (code, resp) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/applications/{application_id}/submit"),
        token,
        &Value::Null,
    )
    .await;
    (code, resp.unwrap_or(Value::Null))
}

/// Submits a draft application and returns its id.
async fn seed_draft(env: &TestEnv, tenant_token: &str, listing_id: Uuid) -> Uuid {
    let mut body = app_body();
    body["asDraft"] = json!(true);
    let (_s, app) = submit_app(env, tenant_token, listing_id, &body).await;
    Uuid::parse_str(app["id"].as_str().unwrap()).unwrap()
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

// `POST`/`GET /applications/{id}/notes` internal notes ------------------------

/// The reviewing landlord adds notes and reads them back.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_add_and_list(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, note) = add_note(&env, &landlord_token, app_id, "Strong applicant").await;
    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(note["body"], "Strong applicant");
    assert_eq!(note["authorId"].as_str().unwrap(), landlord_id.to_string());

    add_note(&env, &landlord_token, app_id, "Second note").await;

    let (status, body) = list_notes(&env, &landlord_token, app_id).await;
    assert_eq!(status, StatusCode::OK);
    let bodies = body
        .as_array()
        .unwrap()
        .iter()
        .map(|note| note["body"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(bodies.len(), 2);
    assert!(bodies.contains(&"Strong applicant"));
    assert!(bodies.contains(&"Second note"));
}

/// A blank note body -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_add_blank_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = add_note(&env, &landlord_token, app_id, "   ").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// A landlord who does not review the application cannot note it -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_add_foreign_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = add_note(&env, &other_token, app_id, "Sneaky").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Noting an unknown application -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_add_unknown_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = add_note(&env, &token, Uuid::new_v4(), "Hi").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// An owned application with no notes lists an empty array, not `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_list_empty_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = list_notes(&env, &landlord_token, app_id).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().unwrap().len(), 0);
}

/// A non-reviewing landlord cannot list the notes -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_list_foreign_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();
    add_note(&env, &owner_token, app_id, "Private").await;

    let (status, _body) = list_notes(&env, &other_token, app_id).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant cannot add notes -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_add_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = add_note(&env, &token, Uuid::new_v4(), "Hi").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn notes_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/applications/{}/notes", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `POST`/`GET /applications/{id}/background-checks` checks --------------------

/// With consent, the landlord requests a check; the fake provider completes it.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_request_completes(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, check) = request_check(&env, &landlord_token, app_id, "credit").await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(check["checkType"], "credit");
    assert_eq!(check["status"], "completed");
    assert!(check["result"].is_object());
}

/// Requesting a check without applicant consent -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_request_without_consent_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let mut body = app_body();
    body["backgroundCheckConsent"] = json!(false);
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &body).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, error) = request_check(&env, &landlord_token, app_id, "credit").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(error["error"].as_str().unwrap().contains("consent"));
}

/// A landlord who does not review the application cannot run a check -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_request_foreign_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = request_check(&env, &other_token, app_id, "credit").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A check against an unknown application -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_request_unknown_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = request_check(&env, &token, Uuid::new_v4(), "credit").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Requested checks list back, newest first.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_list_after_request(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();
    request_check(&env, &landlord_token, app_id, "credit").await;

    let (status, body) = list_checks(&env, &landlord_token, app_id).await;
    assert_eq!(status, StatusCode::OK);
    let checks = body.as_array().unwrap();
    assert_eq!(checks.len(), 1);
    assert_eq!(checks[0]["checkType"], "credit");
}

/// An owned application with no checks lists an empty array, not `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_list_empty_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = list_checks(&env, &landlord_token, app_id).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.as_array().unwrap().len(), 0);
}

/// A non-reviewing landlord cannot list the checks -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_list_foreign_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = list_checks(&env, &other_token, app_id).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant cannot request a check -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = request_check(&env, &token, Uuid::new_v4(), "credit").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn background_check_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/applications/{}/background-checks",
            Uuid::new_v4()
        ))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `GET /applications/{id}/score` scoring --------------------------------------

/// The score returns a five-factor breakdown whose weights sum to 100.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn score_returns_breakdown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = get_score(&env, &landlord_token, app_id).await;

    assert_eq!(status, StatusCode::OK);
    assert!(body["total"].is_i64());
    let breakdown = body["breakdown"].as_array().unwrap();
    assert_eq!(breakdown.len(), 5);
    let weights = breakdown
        .iter()
        .map(|factor| factor["weight"].as_i64().unwrap())
        .sum::<i64>();
    assert_eq!(weights, 100);
}

/// The credit factor is zero before a check and full once one clears.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn score_credit_reflects_check(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (_s, before) = get_score(&env, &landlord_token, app_id).await;
    assert_eq!(factor_score(&before, "credit"), 0);

    request_check(&env, &landlord_token, app_id, "credit").await;

    let (_s, after) = get_score(&env, &landlord_token, app_id).await;
    assert_eq!(factor_score(&after, "credit"), 25);
}

/// A landlord who does not review the application cannot score it -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn score_foreign_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, owner_id, &owner_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = get_score(&env, &other_token, app_id).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Scoring an unknown application -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn score_unknown_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = get_score(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant cannot score an application -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn score_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = get_score(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn score_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/applications/{}/score", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `PATCH /applications/{id}` + `POST .../submit` drafts -----------------------

/// `asDraft` creates the application in the `draft` state, not `pending`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn draft_created_with_status_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let mut body = app_body();
    body["asDraft"] = json!(true);

    let (status, app) = submit_app(&env, &tenant_token, listing_id, &body).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(app["status"], "draft");
}

/// Editing a draft replaces its fields and keeps it a draft.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn draft_patch_updates_fields(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let app_id = seed_draft(&env, &tenant_token, listing_id).await;

    let mut patch = app_body();
    patch["fullName"] = json!("Updated Tenant");
    let (status, updated) = patch_app(&env, &tenant_token, app_id, &patch).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["fullName"], "Updated Tenant");
    assert_eq!(updated["status"], "draft");
}

/// Submitting a draft moves it to `pending`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn draft_submit_moves_to_pending(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let app_id = seed_draft(&env, &tenant_token, listing_id).await;

    let (status, submitted) = submit_draft(&env, &tenant_token, app_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(submitted["status"], "pending");
}

/// Editing a non-draft (already submitted) application -> `409`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn patch_non_draft_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = patch_app(&env, &tenant_token, app_id, &app_body()).await;
    assert_eq!(status, StatusCode::CONFLICT);
}

/// Submitting a non-draft application -> `409`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_non_draft_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let (_s, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let app_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, _body) = submit_draft(&env, &tenant_token, app_id).await;
    assert_eq!(status, StatusCode::CONFLICT);
}

/// A tenant cannot edit another tenant's draft -> `404` (no leak).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn patch_foreign_draft_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_a, tenant_a) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_b, tenant_b) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let app_id = seed_draft(&env, &tenant_a, listing_id).await;

    let (status, _body) = patch_app(&env, &tenant_b, app_id, &app_body()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Editing a draft with a blank required field -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn patch_draft_invalid_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let app_id = seed_draft(&env, &tenant_token, listing_id).await;

    let mut bad = app_body();
    bad["fullName"] = json!("   ");
    let (status, _body) = patch_app(&env, &tenant_token, app_id, &bad).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// A landlord cannot edit or submit a draft -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn draft_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (patch_status, _p) = patch_app(&env, &token, Uuid::new_v4(), &app_body()).await;
    assert_eq!(patch_status, StatusCode::FORBIDDEN);
    let (submit_status, _s) = submit_draft(&env, &token, Uuid::new_v4()).await;
    assert_eq!(submit_status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn draft_submit_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post(&format!("/api/v1/applications/{}/submit", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// drafts hidden from the landlord (regression) --------------------------------

/// A tenant's unsubmitted `draft` must not appear among a listing's applications
/// shown to its landlord; only submitted (here `pending`) ones do.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_listing_applications_excludes_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_submitter, submitter_token) =
        common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_drafter, drafter_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    submit_app(&env, &submitter_token, listing_id, &app_body()).await;
    seed_draft(&env, &drafter_token, listing_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/applications"),
        &landlord_token,
        &Value::Null,
    )
    .await;
    let body = body.unwrap();

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["itemCount"], 1,
        "draft must not be counted for the landlord"
    );
    let statuses = body["data"]
        .as_array()
        .unwrap()
        .iter()
        .map(|app| app["status"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        statuses,
        ["pending"],
        "only the submitted application is visible"
    );
}

/// The cross-listing landlord feed (`GET /applications/landlord`) likewise omits
/// drafts.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_apps_excludes_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_submitter, submitter_token) =
        common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_drafter, drafter_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    submit_app(&env, &submitter_token, listing_id, &app_body()).await;
    seed_draft(&env, &drafter_token, listing_id).await;

    let (status, body) = landlord_apps(&env, &landlord_token, "").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["itemCount"], 1,
        "draft must not appear in the landlord feed"
    );
    assert_eq!(body["data"][0]["status"], "pending");
}

/// A landlord cannot fetch an unsubmitted draft by id (`404`), but its applicant
/// still can - the draft is hidden from the landlord only, not withdrawn.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_hides_draft_from_landlord(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;
    let draft_id = seed_draft(&env, &tenant_token, listing_id).await;

    let (landlord_status, _body) = get_app(&env, &landlord_token, draft_id).await;
    assert_eq!(landlord_status, StatusCode::NOT_FOUND);

    let (tenant_status, body) = get_app(&env, &tenant_token, draft_id).await;
    assert_eq!(tenant_status, StatusCode::OK);
    assert_eq!(body["status"], "draft");
}

// `GET /applications/{id}` tenant fields --------------------------------------

/// Detail response carries `tenantFirstName` and `tenantLastName` populated
/// from the submitting user's profile row.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_includes_tenant_name_fields(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (_status, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let application_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = get_app(&env, &tenant_token, application_id).await;

    assert_eq!(status, StatusCode::OK);
    // seed_user always inserts first_name='Test', last_name='User'.
    assert_eq!(body["tenantFirstName"].as_str().unwrap(), "Test");
    assert_eq!(body["tenantLastName"].as_str().unwrap(), "User");
    // wallet_address is NULL in the seed row; skip_serializing_if omits the key.
    assert!(
        body.get("tenantWalletAddress").is_none(),
        "tenantWalletAddress must be absent when the tenant has no wallet"
    );
}

/// `tenantWalletAddress` is included when the tenant's `wallet_address` column
/// is set.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_application_includes_wallet_address_when_set(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let listing_id = active_listing(&env, &pool, landlord_id, &landlord_token).await;

    let wallet = "01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3";
    sqlx::query(r"UPDATE users SET wallet_address = $1 WHERE id = $2")
        .bind(wallet)
        .bind(tenant_id)
        .execute(&pool)
        .await
        .unwrap();

    let (_status, app) = submit_app(&env, &tenant_token, listing_id, &app_body()).await;
    let application_id = Uuid::parse_str(app["id"].as_str().unwrap()).unwrap();

    let (status, body) = get_app(&env, &tenant_token, application_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["tenantWalletAddress"].as_str().unwrap(), wallet);
}

/// The tenant list endpoint (`GET /applications`) must NOT expose
/// `tenantFirstName`, `tenantLastName`, or `tenantWalletAddress` - those fields
/// are detail-only.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_applications_excludes_tenant_fields(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
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
    let items = body.unwrap_or(Value::Null);
    let first = &items[0];
    assert!(
        first.get("tenantFirstName").is_none(),
        "list must not include tenantFirstName"
    );
    assert!(
        first.get("tenantLastName").is_none(),
        "list must not include tenantLastName"
    );
    assert!(
        first.get("tenantWalletAddress").is_none(),
        "list must not include tenantWalletAddress"
    );
}
