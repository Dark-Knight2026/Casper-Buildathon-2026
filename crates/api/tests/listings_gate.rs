//! Integration tests for the authority gate (ADR-007 D2, C23).
//!
//! The single enforcement point is `PUT /listings/{id}/state -> active`, which
//! requires ALL THREE gates, checked in order (identity -> authority -> fair
//! housing); the first unmet one short-circuits to `409`. Each gate is driven
//! to failure by shaping the listing's state rather than mocking providers,
//! except the identity branch, which needs a [`FailingKycProvider`] (the
//! default fake always verifies).
//!
//! Also covers the gate's read + input surfaces:
//! - `GET /{id}/provenance` (derived badge view),
//! - `POST /{id}/authority/documents` (T0 -> T1, PM attribution),
//! - `POST /{id}/fair-housing/screen` (advertising screen verdict).

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use axum_test::{
    http::header::COOKIE,
    multipart::{MultipartForm, Part},
};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// Posts a draft with a specific title (so a test can plant or avoid a
/// Fair-Housing-flagged phrase) and returns its id.
async fn post_draft_titled(env: &TestEnv, token: &str, property_id: Uuid, title: &str) -> Uuid {
    let body = json!({
        "propertyId": property_id,
        "title": title,
        "description": "A comfortable place to live",
        "terms": {
            "rentMonthly": 2000.0,
            "securityDeposit": 2000.0,
            "leaseTermsOffered": ["1 Year"],
            "furnished": false,
        },
    });
    let (status, created) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/listings",
        token,
        &body,
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    Uuid::parse_str(created.unwrap()["id"].as_str().unwrap()).unwrap()
}

/// `POST /listings/{id}/submit` (draft -> pending).
async fn submit(env: &TestEnv, token: &str, listing_id: Uuid) {
    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/submit"),
        token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "submit must move draft to pending");
}

/// `PUT /listings/{id}/state -> active`.
async fn set_active(env: &TestEnv, token: &str, listing_id: Uuid) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/state"),
        token,
        &json!({ "state": "active" }),
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// `POST /listings/{id}/authority/documents` with a PNG and the given type.
async fn upload_document(
    env: &TestEnv,
    token: &str,
    listing_id: Uuid,
    doc_type: &str,
) -> (StatusCode, Value) {
    let form = MultipartForm::new()
        .add_part(
            "file",
            Part::bytes(common::fake_png_bytes())
                .mime_type("image/png")
                .file_name("doc.png"),
        )
        .add_text("documentType", doc_type.to_owned());
    let response = env
        .server
        .post(&format!(
            "/api/v1/listings/{listing_id}/authority/documents"
        ))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    let status = response.status_code();
    let body = serde_json::from_slice::<Value>(response.as_bytes()).unwrap_or(Value::Null);
    (status, body)
}

/// `GET /listings/{id}/provenance`.
async fn get_provenance(env: &TestEnv, token: &str, listing_id: Uuid) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/listings/{listing_id}/provenance"),
        token,
        &Value::Null,
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

/// `POST /listings/{id}/fair-housing/screen`.
async fn screen(env: &TestEnv, token: &str, listing_id: Uuid) -> (StatusCode, Value) {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/listings/{listing_id}/fair-housing/screen"),
        token,
        &Value::Null,
    )
    .await;
    (status, body.unwrap_or(Value::Null))
}

// Authority gate on -> active -------------------------------------------------

/// A pending listing at T0 (no documents) cannot activate: identity passes
/// (fake KYC), but the authority-tier gate rejects T0.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn activate_blocked_by_authority_gate_at_t0(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;
    submit(&env, &token, listing_id).await;

    let (status, body) = set_active(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(
        body["error"].as_str().unwrap().contains("authority tier"),
        "expected the authority-tier gate to be named, got: {}",
        body["error"]
    );
}

/// A pending listing at T1 whose text was flagged cannot activate: identity and
/// authority pass, but the Fair Housing gate rejects it.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn activate_blocked_by_fair_housing_gate(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    // "no children" is in the StubFairHousingScreen blocklist -> not cleared.
    let listing_id = post_draft_titled(&env, &token, property_id, "Quiet unit, no children").await;
    submit(&env, &token, listing_id).await;
    let (doc_status, _doc) = upload_document(&env, &token, listing_id, "deed").await;
    assert_eq!(doc_status, StatusCode::CREATED);

    let (status, body) = set_active(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(
        body["error"].as_str().unwrap().contains("fair housing"),
        "expected the fair-housing gate to be named, got: {}",
        body["error"]
    );
}

/// A pending listing at T1 with clean text still cannot activate when KYC fails:
/// the identity gate rejects it (server wired with a failing KYC provider).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn activate_blocked_by_identity_gate(pool: PgPool) {
    let env = common::setup_test_server_failing_kyc(pool.clone()).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;
    submit(&env, &token, listing_id).await;
    upload_document(&env, &token, listing_id, "deed").await;

    let (status, body) = set_active(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::CONFLICT);
    assert!(
        body["error"].as_str().unwrap().contains("identity"),
        "expected the identity gate to be named, got: {}",
        body["error"]
    );
}

/// Gate order: with both identity AND authority failing (failing KYC + T0), the
/// identity gate is reported first - it is checked before authority.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn gate_order_identity_before_authority(pool: PgPool) {
    let env = common::setup_test_server_failing_kyc(pool.clone()).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;
    submit(&env, &token, listing_id).await;

    let (status, body) = set_active(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::CONFLICT);
    let error = body["error"].as_str().unwrap();
    assert!(
        error.contains("identity"),
        "identity must be reported first, got: {error}"
    );
    assert!(
        !error.contains("authority tier"),
        "authority must not be reported before identity"
    );
}

/// All three gates satisfied (fake KYC verifies, T1 document, clean text): the
/// listing activates, gets a 90-day expiry, identity is stamped, and the
/// verified-lister badge lights up.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn activate_succeeds_when_all_gates_pass(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;
    submit(&env, &token, listing_id).await;
    let (doc_status, _doc) = upload_document(&env, &token, listing_id, "deed").await;
    assert_eq!(doc_status, StatusCode::CREATED);

    let (status, body) = set_active(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["state"], "active");
    assert!(
        !body["expiresAt"].is_null(),
        "activation must stamp an expiry window"
    );
    assert_eq!(body["provenance"]["identityVerified"], true);
    assert_eq!(body["provenance"]["verifiedListerBadge"], true);
}

// `GET /listings/{id}/provenance` ---------------------------------------------

/// A fresh draft's provenance: unverified identity, T0 / "Unverified", clean
/// Fair Housing, no badge.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn provenance_fresh_draft_is_t0_unverified(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let (status, body) = get_provenance(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["identityVerified"], false);
    assert_eq!(body["authorityTier"], "T0");
    assert_eq!(body["authorityLabel"], "Unverified");
    assert_eq!(body["fairHousingCleared"], true);
    assert_eq!(body["verifiedListerBadge"], false);
}

/// An uploaded document lifts provenance from T0 to T1 / "Documents on file".
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn provenance_after_document_is_t1(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;
    upload_document(&env, &token, listing_id, "deed").await;

    let (status, body) = get_provenance(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["authorityTier"], "T1");
    assert_eq!(body["authorityLabel"], "Documents on file");
}

/// Provenance for a listing the caller does not own -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn provenance_returns_404_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;
    let listing_id = post_draft_titled(&env, &owner_token, property_id, "Cozy Loft").await;

    let (status, _body) = get_provenance(&env, &other_token, listing_id).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn provenance_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = get_provenance(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `POST /listings/{id}/authority/documents` -----------------------------------

/// A deed lifts the authority tier to T1 without claiming PM attribution.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_deed_lifts_to_t1(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let (status, body) = upload_document(&env, &token, listing_id, "deed").await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["documentType"], "deed");
    assert_eq!(body["provenance"]["authorityTier"], "T1");
    assert_eq!(body["provenance"]["managedByPm"], false);
}

/// A management agreement also marks the listing PM-managed.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_management_agreement_sets_pm(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let (status, body) = upload_document(&env, &token, listing_id, "management_agreement").await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["provenance"]["managedByPm"], true);
}

/// A missing `file` field -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_missing_file_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let form = MultipartForm::new().add_text("documentType", "deed");
    let response = env
        .server
        .post(&format!(
            "/api/v1/listings/{listing_id}/authority/documents"
        ))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// A missing `documentType` field -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_missing_type_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes()).mime_type("image/png"),
    );
    let response = env
        .server
        .post(&format!(
            "/api/v1/listings/{listing_id}/authority/documents"
        ))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// An unrecognized `documentType` -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_invalid_type_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let (status, body) = upload_document(&env, &token, listing_id, "passport").await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(
        body["error"]
            .as_str()
            .unwrap()
            .contains("documentType must be one of")
    );
}

/// Bytes that match no supported document format (PDF/PNG/JPEG) -> `415`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_bad_mime_415(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let form = MultipartForm::new()
        .add_part(
            "file",
            Part::bytes(b"this is plain text, not a document".to_vec()).mime_type("text/plain"),
        )
        .add_text("documentType", "deed");
    let response = env
        .server
        .post(&format!(
            "/api/v1/listings/{listing_id}/authority/documents"
        ))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

/// A non-owner cannot upload a document to someone else's listing -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;
    let listing_id = post_draft_titled(&env, &owner_token, property_id, "Cozy Loft").await;

    let (status, _body) = upload_document(&env, &other_token, listing_id, "deed").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Uploading to an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = upload_document(&env, &token, Uuid::new_v4(), "deed").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn authority_document_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = upload_document(&env, &token, Uuid::new_v4(), "deed").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

// `POST /listings/{id}/fair-housing/screen` -----------------------------------

/// A clean listing clears the screen with no flags.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn fair_housing_screen_clean_listing_cleared(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Cozy Loft").await;

    let (status, body) = screen(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["cleared"], true);
    assert_eq!(body["flags"].as_array().unwrap().len(), 0);
}

/// A listing whose text carries a prohibited phrase is flagged and not cleared.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn fair_housing_screen_flags_prohibited(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let listing_id = post_draft_titled(&env, &token, property_id, "Great unit, no children").await;

    let (status, body) = screen(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["cleared"], false);
    assert!(
        !body["flags"].as_array().unwrap().is_empty(),
        "a flagged screen must explain why",
    );
}

/// Screening a listing the caller does not own -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn fair_housing_screen_returns_404_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, owner_id).await;
    let listing_id = post_draft_titled(&env, &owner_token, property_id, "Cozy Loft").await;

    let (status, _body) = screen(&env, &other_token, listing_id).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn fair_housing_screen_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = screen(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}
