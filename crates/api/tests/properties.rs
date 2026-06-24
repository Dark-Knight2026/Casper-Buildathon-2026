//! Integration tests for the property domain (`/api/v1/properties`).
//!
//! The four surfaces, and what each guards:
//! - **Dedup-aware upsert** (`POST`): a re-create of the same physical asset
//!   collapses onto the existing row and answers `200` instead of `201`. The
//!   fingerprint is address/geo-derived and carries NO owner, so the collapse
//!   crosses landlords - a second landlord posting the same address gets the
//!   first landlord's property back.
//! - **Detail read** (`GET /{id}`): public, `404` for an unknown id.
//! - **Offer history** (`GET /{id}/listings`): landlord-only, owner-scoped.
//! - **Geo search** (`GET /search`): radius + bbox, public, every validation
//!   branch.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// Minimal valid create payload. Tests clone and mutate a single field so the
/// dedup fingerprint changes (or stays equal) deliberately.
fn valid_payload() -> Value {
    json!({
        "addressLine1": "100 Market St",
        "city": "Denver",
        "stateOrProvince": "CO",
        "postalCode": "80202",
        "propertyType": "single_family",
    })
}

/// Valid payload carrying coordinates, for the geo-search tests. `line1` keeps
/// each row's fingerprint distinct so they all persist.
fn geo_payload(line1: &str, lat: f64, lng: f64) -> Value {
    json!({
        "addressLine1": line1,
        "city": "Denver",
        "stateOrProvince": "CO",
        "postalCode": "80202",
        "propertyType": "single_family",
        "latitude": lat,
        "longitude": lng,
    })
}

/// `POST /properties` as a landlord, returning the status and JSON body
/// (`Property` on success, `ErrorResponse` otherwise).
async fn post_property(env: &TestEnv, token: &str, payload: &Value) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/properties",
        token,
        payload,
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// `PUT /properties/{id}` as a landlord, returning the status and JSON body
/// (`Property` on success, `ErrorResponse` otherwise).
async fn put_property(
    env: &TestEnv,
    token: &str,
    property_id: Uuid,
    payload: &Value,
) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/properties/{property_id}"),
        token,
        payload,
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// Inserts a listing for `property_id` in the given lifecycle `state` with a
/// fully-cleared authority gate (tier `T1`, identity + Fair Housing verified),
/// so a revalidation reset is observable. Returns the listing id.
async fn seed_listing(pool: &PgPool, property_id: Uuid, listed_by: Uuid, state: &str) -> Uuid {
    sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO listings (
                property_id, listed_by, intent, state, title,
                identity_verified, authority_tier, fair_housing_cleared
            )
            VALUES ($1, $2, 'rent_ltr', $3, 'Test listing', true, 'T1', true)
            RETURNING id
        ",
    )
    .bind(property_id)
    .bind(listed_by)
    .bind(state)
    .fetch_one(pool)
    .await
    .expect("seed listing")
}

// `POST /properties` dedup-aware create ---------------------------------------

/// Happy path: a landlord creates a property and the RESO-aligned facade is
/// reflected back (the wire names, not the legacy DB column names).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_returns_201_with_reso_fields(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let payload = json!({
        "addressLine1": "100 Market St",
        "addressLine2": "Unit 4",
        "city": "Denver",
        "stateOrProvince": "CO",
        "postalCode": "80202",
        "propertyType": "condo",
        "bedroomsTotal": 2,
        "bathroomsTotal": 1.5,
        "livingArea": 900,
        "parkingFeatures": ["garage", "covered"],
    });
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["stateOrProvince"], "CO");
    assert_eq!(body["postalCode"], "80202");
    assert_eq!(body["bedroomsTotal"], 2);
    assert_eq!(body["bathroomsTotal"], 1.5);
    assert_eq!(body["livingArea"], 900);
    assert_eq!(body["parkingFeatures"], json!(["garage", "covered"]));
    // normalized_address is GENERATED as REGEXP_REPLACE(LOWER(line1+city+state+
    // zip), '[^a-z0-9]', ''): lowercase first, then strip to alphanumerics.
    // addressLine2 ("Unit 4") is NOT part of this column (it only feeds the
    // fingerprint). So "100 Market St"+"Denver"+"CO"+"80202" -> "100marketstdenverco80202".
    assert_eq!(
        body["normalizedAddress"].as_str().unwrap(),
        "100marketstdenverco80202"
    );

    // The on-chain id is always part of the response shape, and null until the
    // indexer observes a PropertyCreated event and writes the contract id.
    assert!(
        body.get("onchainPropertyId").is_some(),
        "onchainPropertyId must be part of the property shape"
    );
    assert!(
        body["onchainPropertyId"].is_null(),
        "onchainPropertyId must be null before on-chain registration"
    );

    // The row is owned by the caller's `sub`.
    let owner = sqlx::query_scalar::<_, Uuid>("SELECT landlord_id FROM properties WHERE id = $1")
        .bind(Uuid::parse_str(body["id"].as_str().unwrap()).unwrap())
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(owner, landlord_id);
}

/// A second create of the same address by the same landlord collapses onto the
/// existing row: `200`, same id, no duplicate inserted.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_dedup_returns_200_on_repeat(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (first_status, first) = post_property(&env, &token, &valid_payload()).await;
    assert_eq!(first_status, StatusCode::CREATED);

    let (second_status, second) = post_property(&env, &token, &valid_payload()).await;
    assert_eq!(second_status, StatusCode::OK);
    assert_eq!(second["id"], first["id"]);

    let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM properties")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1, "dedup must not insert a duplicate row");
}

/// The fingerprint is owner-free: a DIFFERENT landlord posting the same address
/// gets the first landlord's property back (`200`, same id). The physical asset
/// is shared; ownership lives on listings, not the property.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_dedup_collapses_across_landlords(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_a, token_a) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_b, token_b) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status_a, body_a) = post_property(&env, &token_a, &valid_payload()).await;
    assert_eq!(status_a, StatusCode::CREATED);

    let (status_b, body_b) = post_property(&env, &token_b, &valid_payload()).await;
    assert_eq!(status_b, StatusCode::OK);
    assert_eq!(
        body_b["id"], body_a["id"],
        "same address must resolve to the same physical asset regardless of landlord"
    );
}

/// A distinct address (here: a different postal code) yields a distinct
/// fingerprint and therefore a new row (`201`, different id).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_distinct_postal_returns_201(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (_s1, first) = post_property(&env, &token, &valid_payload()).await;

    let mut other = valid_payload();
    other["postalCode"] = json!("80203");
    let (status, second) = post_property(&env, &token, &other).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_ne!(second["id"], first["id"]);
}

/// `RoleUser<LandlordRole>` rejects a tenant token with `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_tenant_with_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = post_property(&env, &token, &valid_payload()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No `access_token` cookie -> `401` before the handler runs.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .post("/api/v1/properties")
        .json(&valid_payload())
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// An empty required field is rejected with the field-named `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_empty_address_line1_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["addressLine1"] = json!("   ");
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("addressLine1 cannot be empty")
    );
}

/// An unknown `propertyType` is rejected by serde at deserialization, before
/// the handler runs. That surfaces as a `422` with a plain-text body (not the
/// `ErrorResponse` envelope), so only the status is asserted.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_unknown_property_type_422(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["propertyType"] = json!("castle");
    let (status, _body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
}

/// Latitude outside `[-90, 90]` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_latitude_out_of_range_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["latitude"] = json!(95.0);
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("latitude is out of range")
    );
}

/// Longitude outside `[-180, 180]` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_longitude_out_of_range_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["longitude"] = json!(-181.0);
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("longitude is out of range")
    );
}

/// A negative integer attribute -> `400` naming the field.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_negative_bedrooms_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["bedroomsTotal"] = json!(-1);
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("bedroomsTotal must be non-negative")
    );
}

/// A negative fractional bathroom count -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_negative_bathrooms_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["bathroomsTotal"] = json!(-0.5);
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("bathroomsTotal must be a non-negative number")
    );
}

/// A string past the length cap -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_overlong_city_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["city"] = json!("x".repeat(101)); // MAX_CITY_LEN = 100
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("city must be at most 100 characters")
    );
}

/// More than 32 parking features -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_too_many_parking_features_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["parkingFeatures"] = json!(vec!["spot"; 33]); // MAX_PARKING_FEATURES = 32
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("parkingFeatures must have at most 32 items")
    );
}

// `GET /properties/{id}` public detail ----------------------------------------

/// The detail read is public (no auth) and returns the stored record.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_property_returns_200_public(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_status, created) = post_property(&env, &token, &valid_payload()).await;
    let property_id = created["id"].as_str().unwrap();

    // No cookie attached: this surface is public.
    let response = env
        .server
        .get(&format!("/api/v1/properties/{property_id}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["id"].as_str().unwrap(), property_id);
    assert_eq!(body["city"], "Denver");
}

/// An unknown id -> `404` (sqlx `RowNotFound` maps to `NotFound`).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_property_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/properties/{}", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::NOT_FOUND);
}

// `GET /properties/{id}/listings` owner-scoped offer history ------------------

/// The owner sees the (initially empty) offer history.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn property_listings_returns_empty_for_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_status, created) = post_property(&env, &token, &valid_payload()).await;
    let property_id = created["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/properties/{property_id}/listings"),
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["data"], json!([]), "no listings yet");
    assert_eq!(body["itemCount"], 0);
    assert_eq!(body["pageCount"], 0);
}

/// The offer history is paged: `page_size` caps the returned slice while
/// `itemCount` reports the full total.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn property_listings_paginates(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_status, created) = post_property(&env, &token, &valid_payload()).await;
    let property_id = Uuid::parse_str(created["id"].as_str().unwrap()).unwrap();

    for _ in 0..3 {
        seed_listing(&pool, property_id, landlord_id, "active").await;
    }

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/properties/{property_id}/listings?page=1&page_size=2"),
        &token,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["itemCount"], 3, "total across all pages");
    assert_eq!(body["pageCount"], 2, "3 items at page_size 2 spans 2 pages");
    assert_eq!(
        body["data"].as_array().map(Vec::len),
        Some(2),
        "the first page holds exactly page_size items",
    );
}

/// A different landlord is not the property owner -> `403 not_property_owner`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn property_listings_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_a, token_a) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_b, token_b) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_status, created) = post_property(&env, &token_a, &valid_payload()).await;
    let property_id = created["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/properties/{property_id}/listings"),
        &token_b,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(
        body.unwrap()["error"].as_str().unwrap(),
        "not_property_owner"
    );
}

/// An unknown property id -> `404` (checked before the owner gate).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn property_listings_returns_404_for_unknown_property(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/properties/{}/listings", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// The offer history requires auth.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn property_listings_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/properties/{}/listings", Uuid::new_v4()))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn property_listings_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/properties/{}/listings", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `GET /properties/search` geo + pagination -----------------------------------

/// Without geo params, search lists every property and wraps them in the
/// paginated envelope (`itemCount`, `pageCount`, `data`).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_lists_all_without_geo(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    post_property(&env, &token, &geo_payload("1 A St", 39.7392, -104.9903)).await;
    post_property(&env, &token, &geo_payload("2 B St", 40.7128, -74.0060)).await;

    let response = env.server.get("/api/v1/properties/search").await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 2);
    assert_eq!(body["data"].as_array().unwrap().len(), 2);
}

/// A tight radius around Denver excludes the New York property.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_radius_filters_within_distance(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    post_property(&env, &token, &geo_payload("Denver", 39.7392, -104.9903)).await;
    post_property(&env, &token, &geo_payload("New York", 40.7128, -74.0060)).await;

    let response = env
        .server
        .get("/api/v1/properties/search?nearLat=39.7392&nearLng=-104.9903&radiusMiles=10")
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(body["data"][0]["addressLine1"], "Denver");
}

/// Radius results are distance-ordered: the nearer property comes first.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_radius_orders_by_distance(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    // Denver center, Boulder ~25mi north.
    post_property(&env, &token, &geo_payload("Denver", 39.7392, -104.9903)).await;
    post_property(&env, &token, &geo_payload("Boulder", 40.0150, -105.2705)).await;

    let response = env
        .server
        .get("/api/v1/properties/search?nearLat=39.7392&nearLng=-104.9903&radiusMiles=50")
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 2);
    assert_eq!(body["data"][0]["addressLine1"], "Denver");
    assert_eq!(body["data"][1]["addressLine1"], "Boulder");
}

/// A bounding box around Denver excludes the New York property.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_bbox_filters(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    post_property(&env, &token, &geo_payload("Denver", 39.7392, -104.9903)).await;
    post_property(&env, &token, &geo_payload("New York", 40.7128, -74.0060)).await;

    // bbox = minLng,minLat,maxLng,maxLat around Denver only.
    let response = env
        .server
        .get("/api/v1/properties/search?bbox=-105.0,39.0,-104.0,40.0")
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 1);
    assert_eq!(body["data"][0]["addressLine1"], "Denver");
}

/// Pagination: page 2 at size 1 returns the second of two rows, with the total
/// count and page count reflecting the full set.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_paginates(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    post_property(&env, &token, &geo_payload("1 A St", 39.7392, -104.9903)).await;
    post_property(&env, &token, &geo_payload("2 B St", 40.7128, -74.0060)).await;

    let response = env
        .server
        .get("/api/v1/properties/search?page=2&page_size=1")
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    assert_eq!(body["itemCount"], 2);
    assert_eq!(body["pageCount"], 2);
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

/// An incomplete radius trio (only two of the three) -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_partial_radius_triplet_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?nearLat=39.7392&nearLng=-104.9903")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("must be provided together")
    );
}

/// A radius above the 500-mile ceiling -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_radius_out_of_range_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?nearLat=39.7392&nearLng=-104.9903&radiusMiles=600")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("radiusMiles must be in (0, 500]")
    );
}

/// A center latitude out of range (with the full trio present) -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_near_lat_out_of_range_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?nearLat=100&nearLng=-104.9903&radiusMiles=10")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("nearLat is out of range")
    );
}

/// A bbox without exactly four comma-separated parts -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_malformed_bbox_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?bbox=-105.0,39.0,-104.0")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("bbox must be 'minLng,minLat,maxLng,maxLat'")
    );
}

/// A bbox with a non-numeric part -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_bbox_non_numeric_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?bbox=-105.0,39.0,east,40.0")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("bbox values must be numbers")
    );
}

/// A bbox with an out-of-range coordinate -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_bbox_out_of_range_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?bbox=-105.0,39.0,-104.0,200.0")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("bbox coordinates out of range")
    );
}

/// A bbox whose min exceeds its max -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn search_rejects_bbox_min_exceeds_max_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/properties/search?bbox=-104.0,40.0,-105.0,39.0")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
    assert!(
        response.json::<Value>()["error"]
            .as_str()
            .unwrap()
            .contains("bbox min must not exceed max")
    );
}

// `PUT /properties/{id}` edit + listing revalidation --------------------------

/// Happy path: a landlord edits fields and the change is persisted and
/// reflected back in the RESO-aligned facade.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_returns_200_with_changes(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let payload = json!({ "bedroomsTotal": 5, "propertyType": "condo" });
    let (status, body) = put_property(&env, &token, property_id, &payload).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["bedroomsTotal"], 5);
    assert_eq!(body["propertyType"], "condo");
}

/// Without auth -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let response = env
        .server
        .put(&format!("/api/v1/properties/{property_id}"))
        .json(&json!({ "bedroomsTotal": 3 }))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// A landlord who does not own the property -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, _owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other_id, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;

    let (status, _body) = put_property(
        &env,
        &other_token,
        property_id,
        &json!({ "bedroomsTotal": 3 }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// An unknown property id -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_unknown_id_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) =
        put_property(&env, &token, Uuid::new_v4(), &json!({ "bedroomsTotal": 3 })).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Editing an address so its fingerprint collides with another property -> the
/// unique-violation surfaces as `409`, not a `500`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_address_conflict_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    // `valid_payload` is "100 Market St"; create a second property next door.
    let (_a_status, a) = post_property(&env, &token, &valid_payload()).await;
    let mut payload_b = valid_payload();
    payload_b["addressLine1"] = json!("200 Market St");
    let (_b_status, _b) = post_property(&env, &token, &payload_b).await;

    let a_id = Uuid::parse_str(a["id"].as_str().unwrap()).unwrap();
    let (status, _body) = put_property(
        &env,
        &token,
        a_id,
        &json!({ "addressLine1": "200 Market St" }),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
}

/// Editing a property revalidates its listings: live (`active`) and submitted
/// (`pending`) offers drop back to `draft`, a closed (`leased`) one keeps its
/// state, and the authority gate resets on every live listing (badge ->
/// `Unverified`).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_revalidates_listings(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let active = seed_listing(&pool, property_id, landlord_id, "active").await;
    let pending = seed_listing(&pool, property_id, landlord_id, "pending").await;
    let leased = seed_listing(&pool, property_id, landlord_id, "leased").await;

    let (status, _body) =
        put_property(&env, &token, property_id, &json!({ "bedroomsTotal": 4 })).await;
    assert_eq!(status, StatusCode::OK);

    for (listing_id, expected_state) in [(active, "draft"), (pending, "draft"), (leased, "leased")]
    {
        let (state, tier, identity, fair_housing) =
            sqlx::query_as::<_, (String, String, bool, bool)>(
                r"
                    SELECT state, authority_tier, identity_verified, fair_housing_cleared
                    FROM listings
                    WHERE id = $1
                ",
            )
            .bind(listing_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(state, expected_state);
        assert_eq!(tier, "T0");
        assert!(!identity);
        assert!(!fair_housing);
    }
}

// metadataUri pinning (IPFS) --------------------------------------------------

/// `POST` pins the property metadata and returns the resulting `ipfs://{cid}`
/// pointer, which is also persisted on the row.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_persists_metadata_uri(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, body) = post_property(&env, &token, &valid_payload()).await;
    assert_eq!(status, StatusCode::CREATED);

    let metadata_uri = body["metadataUri"].as_str().expect("metadataUri present");
    assert!(
        metadata_uri.starts_with("ipfs://"),
        "metadataUri must be an ipfs pointer, got {metadata_uri}"
    );

    let property_id = Uuid::parse_str(body["id"].as_str().unwrap()).unwrap();
    let stored = sqlx::query_scalar::<_, Option<String>>(
        "SELECT metadata_uri FROM properties WHERE id = $1",
    )
    .bind(property_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stored.as_deref(), Some(metadata_uri));
}

// `PATCH /properties/{id}/registration` write-once deploy hash ----------------
async fn patch_registration(
    env: &TestEnv,
    token: &str,
    property_id: Uuid,
    tx_hash: &str,
) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/properties/{property_id}/registration"),
        token,
        &json!({ "txHash": tx_hash }),
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// Happy path: the owner stores a deploy hash; the response carries the updated
/// property with `registrationTxHash` set, and the DB row matches.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_returns_200_and_persists(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let tx_hash = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    let (status, body) = patch_registration(&env, &token, property_id, tx_hash).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["registrationTxHash"].as_str().unwrap(), tx_hash);

    let stored = sqlx::query_scalar::<_, Option<String>>(
        "SELECT registration_tx_hash FROM properties WHERE id = $1",
    )
    .bind(property_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stored.as_deref(), Some(tx_hash));
}

/// A blank `txHash` (whitespace-only) is rejected before the DB is touched.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_rejects_blank_tx_hash_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let (status, body) = patch_registration(&env, &token, property_id, "   ").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("txHash cannot be empty")
    );
}

/// A second call from the same owner is rejected once the hash is already stored.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_rejects_second_call_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let tx_hash = "aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd";
    let (first_status, _) = patch_registration(&env, &token, property_id, tx_hash).await;
    assert_eq!(first_status, StatusCode::OK);

    let (second_status, body) = patch_registration(&env, &token, property_id, tx_hash).await;
    assert_eq!(second_status, StatusCode::CONFLICT);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("registration_tx_hash is already set")
    );
}

/// A landlord who is not the property owner gets `404` (indistinguishable from
/// "not found" to avoid leaking the existence of the property).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_rejects_non_owner_404(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, _owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other_id, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;

    let (status, _body) = patch_registration(
        &env,
        &other_token,
        property_id,
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// An unknown property id also returns `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_returns_404_for_unknown_property(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = patch_registration(
        &env,
        &token,
        Uuid::new_v4(),
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// No `access_token` cookie -> `401` before the handler runs.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let response = env
        .server
        .patch(&format!("/api/v1/properties/{property_id}/registration"))
        .json(&json!({ "txHash": "abc" }))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn set_registration_tx_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = patch_registration(&env, &token, Uuid::new_v4(), "abc").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// `PUT` re-pins after an edit: a seeded property starts with no pointer, the
/// first edit pins one, and a second edit that changes the metadata yields a
/// different pointer (the CID tracks the descriptors, not a fixed placeholder).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_property_refreshes_metadata_uri(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    // The direct SQL seed leaves the pointer NULL until the first pin.
    let before = sqlx::query_scalar::<_, Option<String>>(
        "SELECT metadata_uri FROM properties WHERE id = $1",
    )
    .bind(property_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(before, None);

    let (status, first) =
        put_property(&env, &token, property_id, &json!({ "bedroomsTotal": 5 })).await;
    assert_eq!(status, StatusCode::OK);
    let uri_first = first["metadataUri"]
        .as_str()
        .expect("metadataUri present")
        .to_owned();
    assert!(uri_first.starts_with("ipfs://"));

    let (status, second) =
        put_property(&env, &token, property_id, &json!({ "bedroomsTotal": 6 })).await;
    assert_eq!(status, StatusCode::OK);
    let uri_second = second["metadataUri"].as_str().expect("metadataUri present");
    assert_ne!(
        uri_first, uri_second,
        "changing metadata must re-pin to a new CID"
    );

    let stored = sqlx::query_scalar::<_, Option<String>>(
        "SELECT metadata_uri FROM properties WHERE id = $1",
    )
    .bind(property_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stored.as_deref(), Some(uri_second));
}

/// Regression: a content-pin failure during create must not leave an orphaned
/// property row behind. The upsert, the IPFS pin, and the metadata-URI write
/// must be one atomic unit - if the pin fails, the insert rolls back, so the DB
/// never holds a committed property with a NULL `metadata_uri`.
///
/// Expected to FAIL on the pre-fix code: `upsert_property` commits the row
/// before the pin is attempted, so the failed create leaves one orphaned row.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_pin_failure_leaves_no_orphan_row(pool: PgPool) {
    let env = common::setup_test_server_failing_pinner(pool.clone()).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = post_property(&env, &token, &valid_payload()).await;
    assert_eq!(
        status,
        StatusCode::INTERNAL_SERVER_ERROR,
        "a content-pin transport failure must surface as 500",
    );

    let count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM properties WHERE landlord_id = $1")
            .bind(landlord_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        count, 0,
        "a pin failure must roll back the insert, leaving no property row without a metadata URI",
    );
}

/// Regression: a parking list whose non-blank entries are within the cap must be
/// accepted even when padded with trailing blank strings. The count has to be
/// taken AFTER blanks are dropped, not against the raw input length.
///
/// Expected to FAIL on the pre-fix code: the length check runs on the raw input
/// (34 > 32) and rejects the request with `400` before the blanks are filtered.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_accepts_parking_list_padded_with_blanks(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    // 32 valid entries (the MAX_PARKING_FEATURES cap) plus 2 trailing blanks:
    // 34 raw, 32 non-blank. Counting after the blank-filter keeps it within cap.
    let mut parking = (0..32).map(|i| json!(format!("p{i}"))).collect::<Vec<_>>();
    parking.push(json!(""));
    parking.push(json!(""));
    let mut payload = valid_payload();
    payload["parkingFeatures"] = Value::Array(parking);

    let (status, body) = post_property(&env, &token, &payload).await;
    assert_eq!(
        status,
        StatusCode::CREATED,
        "a parking list within the cap must not be rejected for trailing blanks; body: {body}",
    );
    assert_eq!(
        body["parkingFeatures"].as_array().map(Vec::len),
        Some(32),
        "blank entries must be stripped, leaving the 32 valid features",
    );
}
