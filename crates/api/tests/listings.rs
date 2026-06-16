//! Integration tests for the listing core surface (`/api/v1/listings`).
//!
//! Scope here is the CRUD + read surface, NOT the lifecycle/gate/media flows
//! (those live in `listings_lifecycle.rs`, `listings_gate.rs`,
//! `listings_media.rs`):
//! - **Create** (`POST`): a `draft`/`rent_ltr` offer against an existing
//!   property, with full input validation.
//! - **Detail** (`GET /{id}`): public; serves any non-withdrawn state by id
//!   (a draft IS visible by direct id), `404` otherwise.
//! - **Public list** (`GET`): active-only, with attribute/geo filters and a
//!   whitelisted sort.
//! - **Landlord list** (`GET /landlord`): the caller's own listings, any state.
//! - **Update** (`PUT /{id}`): owner-scoped; re-screens Fair Housing on text
//!   change.
//! - **View tracking** (`POST /{id}/view`): unique per tenant, active-only.
//!
//! Activation is forced via `common::activate_listing` (a DB `UPDATE`) so the
//! active-only surfaces can be tested without the authority gate.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// Minimal valid create payload for `property_id`. Tests clone and mutate a
/// single field (e.g. `body["terms"]["rentMonthly"]`) to target one branch.
fn draft_body(property_id: Uuid) -> Value {
    json!({
        "propertyId": property_id,
        "title": "Cozy Downtown Loft",
        "description": "A comfortable place to live",
        "terms": {
            "rentMonthly": 2000.0,
            "securityDeposit": 2000.0,
            "leaseTermsOffered": ["1 Year"],
            "furnished": false,
        },
    })
}

/// `POST /listings` as a landlord, returning the status and JSON body.
async fn post_listing(env: &TestEnv, token: &str, body: &Value) -> (StatusCode, Value) {
    let (status, json) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/listings",
        token,
        body,
    )
    .await;
    (status, json.unwrap_or(Value::Null))
}

/// Creates an active listing from `body` (create draft + force-activate) and
/// returns its id. `body` must carry a valid `propertyId`.
async fn seed_active_listing(env: &TestEnv, pool: &PgPool, token: &str, body: &Value) -> Uuid {
    let (status, created) = post_listing(env, token, body).await;
    assert_eq!(status, StatusCode::CREATED);
    let listing_id = Uuid::parse_str(created["id"].as_str().unwrap()).unwrap();
    common::activate_listing(pool, listing_id).await;
    listing_id
}

// `POST /listings` create draft -----------------------------------------------

/// Happy path: a draft is created as `rent_ltr`, owned by the caller, with the
/// nested property and the initial (T0, identity-unverified) provenance.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_returns_201_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let (status, body) = post_listing(&env, &token, &draft_body(property_id)).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["state"], "draft");
    assert_eq!(body["intent"], "rent_ltr");
    assert_eq!(body["listedBy"].as_str().unwrap(), landlord_id.to_string());
    assert_eq!(
        body["propertyId"].as_str().unwrap(),
        property_id.to_string()
    );
    assert_eq!(body["terms"]["rentMonthly"], 2000.0);
    // Nested property travels in the create response.
    assert_eq!(
        body["property"]["id"].as_str().unwrap(),
        property_id.to_string()
    );
    // Initial provenance: nothing verified, clean text clears Fair Housing.
    assert_eq!(body["provenance"]["authorityTier"], "T0");
    assert_eq!(body["provenance"]["identityVerified"], false);
    assert_eq!(body["provenance"]["fairHousingCleared"], true);
    assert_eq!(body["provenance"]["verifiedListerBadge"], false);
    assert_eq!(body["onChain"], Value::Null);
}

/// A `propertyId` that does not exist -> `404` (the FK probe runs before insert).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_unknown_property_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = post_listing(&env, &token, &draft_body(Uuid::new_v4())).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = post_listing(&env, &token, &draft_body(Uuid::new_v4())).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/listings")
        .json(&draft_body(Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// An empty title -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_empty_title_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = draft_body(property_id);
    body["title"] = json!("   ");
    let (status, error) = post_listing(&env, &token, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("title cannot be empty")
    );
}

/// A title past 200 chars -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_overlong_title_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = draft_body(property_id);
    body["title"] = json!("t".repeat(201));
    let (status, error) = post_listing(&env, &token, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("title must be at most 200 characters")
    );
}

/// A description past 4000 chars -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_overlong_description_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = draft_body(property_id);
    body["description"] = json!("d".repeat(4001));
    let (status, error) = post_listing(&env, &token, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("description must be at most 4000 characters")
    );
}

/// A non-positive rent -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_nonpositive_rent_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = draft_body(property_id);
    body["terms"]["rentMonthly"] = json!(0.0);
    let (status, error) = post_listing(&env, &token, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("terms.rentMonthly must be a positive number")
    );
}

/// A negative deposit -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_negative_deposit_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = draft_body(property_id);
    body["terms"]["securityDeposit"] = json!(-1.0);
    let (status, error) = post_listing(&env, &token, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("terms.securityDeposit must be a non-negative number")
    );
}

/// An empty lease-terms list -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_listing_rejects_empty_lease_terms_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = draft_body(property_id);
    body["terms"]["leaseTermsOffered"] = json!([]);
    let (status, error) = post_listing(&env, &token, &body).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        error["error"]
            .as_str()
            .unwrap()
            .contains("terms.leaseTermsOffered must not be empty")
    );
}

// `GET /listings/{id}` public detail ------------------------------------------

/// Detail is public and serves a draft by direct id (state is not filtered;
/// only `deleted_at` is), with the nested property and provenance.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_listing_returns_draft_by_id(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &token, property_id).await;

    // No cookie: public surface.
    let response = env
        .server
        .get(&format!("/api/v1/listings/{listing_id}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["id"].as_str().unwrap(), listing_id.to_string());
    assert_eq!(body["state"], "draft");
    assert_eq!(
        body["property"]["id"].as_str().unwrap(),
        property_id.to_string()
    );
    assert!(body["provenance"].is_object());
}

/// An unknown id -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_listing_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/listings/{}", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}

// `PUT /listings/{id}` owner-scoped update ------------------------------------

/// The owner updates the title; the change is reflected back.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_listing_returns_200(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &token, property_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}"),
        &token,
        &json!({ "title": "Renovated Loft" }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["title"], "Renovated Loft");
}

/// A different landlord cannot update someone else's listing -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_listing_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;
    let listing_id = common::create_draft_listing(&env, &owner_token, property_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}"),
        &other_token,
        &json!({ "title": "Hijacked" }),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(
        body.unwrap()["error"].as_str().unwrap(),
        "not_listing_owner"
    );
}

/// Updating an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_listing_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{}", Uuid::new_v4()),
        &token,
        &json!({ "title": "Nowhere" }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_listing_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{}", Uuid::new_v4()),
        &token,
        &json!({ "title": "x" }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Invalid terms on update -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_listing_rejects_invalid_terms_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &token, property_id).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}"),
        &token,
        &json!({
            "terms": {
                "rentMonthly": -5.0,
                "securityDeposit": 0.0,
                "leaseTermsOffered": ["1 Year"],
                "furnished": false,
            }
        }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// Editing the title to carry a prohibited phrase re-runs the Fair Housing
/// screen and flips `fairHousingCleared` to `false`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_listing_rescreens_fair_housing_on_text_change(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &token, property_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}"),
        &token,
        // "no children" is in the StubFairHousingScreen blocklist.
        &json!({ "title": "Quiet unit, no children" }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["provenance"]["fairHousingCleared"], false);
}

// `GET /listings/landlord` own listings, any state ----------------------------

/// The landlord sees their own draft (the public list would not).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_returns_own_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = common::create_draft_listing(&env, &token, property_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/listings/landlord",
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(
        body["data"][0]["id"].as_str().unwrap(),
        listing_id.to_string()
    );
    assert_eq!(body["data"][0]["state"], "draft");
}

/// The landlord list is scoped to the caller: another landlord's listing is
/// absent.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_excludes_other_landlords(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;
    common::create_draft_listing(&env, &owner_token, property_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/listings/landlord",
        &other_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["itemCount"], 0);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/listings/landlord",
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/listings/landlord").await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// `?state=active` returns only the active listing, hiding the caller's draft.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_filters_by_state(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    common::create_draft_listing(
        &env,
        &token,
        common::seed_property(&pool, landlord_id).await,
    )
    .await;
    let active_id = seed_active_listing(
        &env,
        &pool,
        &token,
        &draft_body(common::seed_property(&pool, landlord_id).await),
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/listings/landlord?state=active",
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(
        body["data"][0]["id"].as_str().unwrap(),
        active_id.to_string()
    );
    assert_eq!(body["data"][0]["state"], "active");
}

/// `?state=draft,active` (comma-separated) returns both lifecycle states.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_filters_by_multiple_states(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    common::create_draft_listing(
        &env,
        &token,
        common::seed_property(&pool, landlord_id).await,
    )
    .await;
    seed_active_listing(
        &env,
        &pool,
        &token,
        &draft_body(common::seed_property(&pool, landlord_id).await),
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/listings/landlord?state=draft,active",
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["itemCount"], 2);
}

/// An unrecognized `state` token is rejected with `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_listings_rejects_unknown_state(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/listings/landlord?state=bogus",
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

// `GET /listings` public active-only list -------------------------------------

/// A draft is invisible to the public list (active-only).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_excludes_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    common::create_draft_listing(&env, &token, property_id).await;

    let response = env.server.get("/api/v1/listings").await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(response.json::<Value>()["itemCount"], 0);
}

/// An active listing appears, carrying its nested property.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_includes_active_with_nested_property(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = seed_active_listing(&env, &pool, &token, &draft_body(property_id)).await;

    let response = env.server.get("/api/v1/listings").await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(
        body["data"][0]["id"].as_str().unwrap(),
        listing_id.to_string()
    );
    assert_eq!(body["data"][0]["state"], "active");
    assert_eq!(
        body["data"][0]["property"]["id"].as_str().unwrap(),
        property_id.to_string()
    );
}

/// `search` matches the listing title (ILIKE).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_filters_by_search(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut loft = draft_body(common::seed_property(&pool, landlord_id).await);
    loft["title"] = json!("Sunny Penthouse");
    seed_active_listing(&env, &pool, &token, &loft).await;
    let mut shack = draft_body(common::seed_property(&pool, landlord_id).await);
    shack["title"] = json!("Tiny Cabin");
    seed_active_listing(&env, &pool, &token, &shack).await;

    let response = env.server.get("/api/v1/listings?search=penthouse").await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(body["data"][0]["title"], "Sunny Penthouse");
}

/// `minRent` filters on `terms.rentMonthly`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_filters_by_min_rent(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut cheap = draft_body(common::seed_property(&pool, landlord_id).await);
    cheap["terms"]["rentMonthly"] = json!(1000.0);
    seed_active_listing(&env, &pool, &token, &cheap).await;
    let mut pricey = draft_body(common::seed_property(&pool, landlord_id).await);
    pricey["terms"]["rentMonthly"] = json!(5000.0);
    seed_active_listing(&env, &pool, &token, &pricey).await;

    let response = env.server.get("/api/v1/listings?minRent=3000").await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(body["data"][0]["terms"]["rentMonthly"], 5000.0);
}

/// `sortBy=rent` orders ascending when `sortOrder=asc`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_sorts_by_rent_ascending(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut pricey = draft_body(common::seed_property(&pool, landlord_id).await);
    pricey["terms"]["rentMonthly"] = json!(5000.0);
    seed_active_listing(&env, &pool, &token, &pricey).await;
    let mut cheap = draft_body(common::seed_property(&pool, landlord_id).await);
    cheap["terms"]["rentMonthly"] = json!(1000.0);
    seed_active_listing(&env, &pool, &token, &cheap).await;

    let response = env
        .server
        .get("/api/v1/listings?sortBy=rent&sortOrder=asc")
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["data"][0]["terms"]["rentMonthly"], 1000.0);
    assert_eq!(body["data"][1]["terms"]["rentMonthly"], 5000.0);
}

/// A radius around Denver includes a Denver listing and excludes a far one.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_filters_by_radius(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let denver = common::seed_property_at(&pool, landlord_id, 39.7392, -104.9903).await;
    seed_active_listing(&env, &pool, &token, &draft_body(denver)).await;
    let nyc = common::seed_property_at(&pool, landlord_id, 40.7128, -74.0060).await;
    seed_active_listing(&env, &pool, &token, &draft_body(nyc)).await;

    let response = env
        .server
        .get("/api/v1/listings?nearLat=39.7392&nearLng=-104.9903&radiusMiles=10")
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    assert_eq!(response.json::<Value>()["itemCount"], 1);
}

/// Pagination splits the active set across pages.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_paginates(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    seed_active_listing(
        &env,
        &pool,
        &token,
        &draft_body(common::seed_property(&pool, landlord_id).await),
    )
    .await;
    seed_active_listing(
        &env,
        &pool,
        &token,
        &draft_body(common::seed_property(&pool, landlord_id).await),
    )
    .await;

    let response = env.server.get("/api/v1/listings?page=2&page_size=1").await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 2);
    assert_eq!(body["pageCount"], 2);
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

/// A partial radius trio -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_rejects_partial_radius_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/listings?nearLat=39.7392&nearLng=-104.9903")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("must be provided together")
    );
}

/// `sortBy=distance` without a radius center -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_rejects_distance_sort_without_center_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/listings?sortBy=distance").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("sortBy=distance requires nearLat/nearLng")
    );
}

/// An unknown `sortBy` key -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_rejects_unknown_sort_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/listings?sortBy=color").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("unknown sortBy 'color'")
    );
}

/// An invalid `sortOrder` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_rejects_invalid_sort_order_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/listings?sortOrder=sideways").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("sortOrder must be 'asc' or 'desc'")
    );
}

// `POST /listings/{id}/view` unique tenant view -------------------------------

/// First view by a tenant counts: `counted=true`, `views=1`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn view_counts_first_time(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id =
        seed_active_listing(&env, &pool, &landlord_token, &draft_body(property_id)).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/view"),
        &tenant_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["counted"], true);
    assert_eq!(body["views"], 1);
}

/// A repeat view by the SAME tenant does not count again (`counted=false`,
/// `views` unchanged): the `(listing_id, user_id)` unique constraint dedups.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn view_dedups_same_tenant(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id =
        seed_active_listing(&env, &pool, &landlord_token, &draft_body(property_id)).await;
    let uri = format!("/api/v1/listings/{listing_id}/view");

    common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &tenant_token,
        &Value::Null,
    )
    .await;
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &tenant_token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["counted"], false);
    assert_eq!(body["views"], 1);
}

/// Distinct tenants each count once: `views=2`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn view_counts_distinct_tenants(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_t1, tenant1) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_t2, tenant2) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id =
        seed_active_listing(&env, &pool, &landlord_token, &draft_body(property_id)).await;
    let uri = format!("/api/v1/listings/{listing_id}/view");

    common::authed_request::<Value>(&env.server, &Method::POST, &uri, &tenant1, &Value::Null).await;
    let (_status, body) =
        common::authed_request::<Value>(&env.server, &Method::POST, &uri, &tenant2, &Value::Null)
            .await;

    assert_eq!(body.unwrap()["views"], 2);
}

/// A view on a non-active (draft) listing -> `404` (view tracks active only).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn view_returns_404_for_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_tenant, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    // Draft, NOT activated.
    let listing_id = common::create_draft_listing(&env, &landlord_token, property_id).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/view"),
        &tenant_token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A landlord token is rejected by the tenant role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn view_rejects_landlord_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{}/view", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn view_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post(&format!("/api/v1/listings/{}/view", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}
