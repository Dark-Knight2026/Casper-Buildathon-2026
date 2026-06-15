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

/// An unknown `propertyType` is rejected against the CHECK-constraint whitelist.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_property_rejects_unknown_property_type_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let mut payload = valid_payload();
    payload["propertyType"] = json!("castle");
    let (status, body) = post_property(&env, &token, &payload).await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("propertyType must be one of")
    );
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
    assert_eq!(body.unwrap(), json!([]));
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
