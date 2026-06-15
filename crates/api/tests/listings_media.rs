//! Integration tests for the listing media pipeline (`/api/v1/listings/{id}/media`).
//!
//! - **Upload** (`POST`): owner-only multipart; magic-byte MIME sniff
//!   (PNG/JPEG/WebP), declared-vs-sniffed cross-check, EXIF strip (noop in the
//!   hackathon), content pin -> deterministic `bafy<sha256>` CID. New media
//!   starts `pending`.
//! - **Moderation** (`PUT /{mediaId}/moderation`): an AGENT decision, not the
//!   lister's; only `approved` media is shown publicly.
//! - **Reorder / remove** (`PUT`): owner-only; `order` sets positions, `remove`
//!   drops rows and their blobs.
//!
//! Media storage / pinning / stripping use the default `StubMediaStorage` /
//! `FakePinner` / `NoopMetadataStripper` wired by `setup_test_server`.

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
use common::{TestEnv, TestOverrides};

/// Seeds a property + draft listing owned by `landlord_id`; returns its id.
/// (Media upload only checks ownership, so a draft is enough.)
async fn owned_listing(env: &TestEnv, pool: &PgPool, landlord_id: Uuid, token: &str) -> Uuid {
    let property_id = common::seed_property(pool, landlord_id).await;
    common::create_draft_listing(env, token, property_id).await
}

/// Uploads a PNG to a listing's media; returns the status and JSON body.
async fn upload_media(env: &TestEnv, token: &str, listing_id: Uuid) -> (StatusCode, Value) {
    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes())
            .mime_type("image/png")
            .file_name("photo.png"),
    );
    let response = env
        .server
        .post(&format!("/api/v1/listings/{listing_id}/media"))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    let status = response.status_code();
    let body = serde_json::from_slice::<Value>(response.as_bytes()).unwrap_or(Value::Null);
    (status, body)
}

/// Uploads a PNG and returns its media id (asserts the upload succeeded).
async fn upload_media_id(env: &TestEnv, token: &str, listing_id: Uuid) -> Uuid {
    let (status, body) = upload_media(env, token, listing_id).await;
    assert_eq!(status, StatusCode::CREATED);
    Uuid::parse_str(body["id"].as_str().unwrap()).unwrap()
}

/// `PUT /listings/{id}/media/{mediaId}/moderation` to `status`.
async fn moderate(
    env: &TestEnv,
    token: &str,
    listing_id: Uuid,
    media_id: Uuid,
    status: &str,
) -> (StatusCode, Value) {
    let (code, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/media/{media_id}/moderation"),
        token,
        &json!({ "moderationStatus": status }),
    )
    .await;
    (code, body.unwrap_or(Value::Null))
}

// `POST /listings/{id}/media` upload ------------------------------------------

/// Happy path: a PNG uploads as `pending`, with a `bafy`-prefixed CID and a
/// stored URL, at position 0.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_returns_201_pending_with_cid(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;

    let (status, body) = upload_media(&env, &token, listing_id).await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body["moderationStatus"], "pending");
    assert_eq!(body["position"], 0);
    assert!(
        body["cid"].as_str().unwrap().starts_with("bafy"),
        "FakePinner returns a bafy<sha256> CID; got {}",
        body["cid"]
    );
    assert!(
        body["url"].as_str().is_some(),
        "stored media must echo a url"
    );
}

/// Bytes matching no supported image format -> `415`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_rejects_bad_mime_415(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(b"not an image".to_vec()).mime_type("image/png"),
    );
    let response = env
        .server
        .post(&format!("/api/v1/listings/{listing_id}/media"))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

/// A declared content-type that disagrees with the sniffed bytes -> `415`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_rejects_mime_mismatch_415(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;

    // PNG bytes, but the client claims JPEG.
    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes()).mime_type("image/jpeg"),
    );
    let response = env
        .server
        .post(&format!("/api/v1/listings/{listing_id}/media"))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

/// A multipart body with no `file` field -> `400`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_missing_file_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;

    let form = MultipartForm::new().add_text("caption", "no file here");
    let response = env
        .server
        .post(&format!("/api/v1/listings/{listing_id}/media"))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

/// A payload above the handler's `MAX_MEDIA_BYTES` (10 MiB) -> `413`.
///
/// The outer `RequestBodyLimitLayer` is raised to 12 MiB here so the body
/// reaches the handler intact: the production 8 MiB layer would truncate the
/// stream first and surface as a `400` multipart-parse error, never reaching
/// this guard. The raised cap lets us target the handler's explicit
/// `bytes.len() > MAX_MEDIA_BYTES` check directly.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_rejects_oversize_413(pool: PgPool) {
    let env = common::setup_test_server_with(
        pool.clone(),
        false,
        TestOverrides {
            request_body_limit_mb: Some(12),
            ..TestOverrides::default()
        },
    )
    .await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;

    // 11 MiB clears the 12 MiB layer but trips the handler's 10 MiB guard.
    let mut oversized = common::fake_png_bytes();
    oversized.resize(11 * 1024 * 1024, 0u8);
    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(oversized)
            .mime_type("image/png")
            .file_name("big.png"),
    );
    let response = env
        .server
        .post(&format!("/api/v1/listings/{listing_id}/media"))
        .add_header(COOKIE, format!("access_token={token}"))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::PAYLOAD_TOO_LARGE);
}

/// A non-owner cannot upload to someone else's listing -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = upload_media(&env, &other_token, listing_id).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Uploading to an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = upload_media(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = upload_media(&env, &token, Uuid::new_v4()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// No auth cookie -> `401`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_requires_auth_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes()).mime_type("image/png"),
    );
    let response = env
        .server
        .post(&format!("/api/v1/listings/{}/media", Uuid::new_v4()))
        .multipart(form)
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// `PUT /listings/{id}/media/{mediaId}/moderation` -----------------------------

/// An agent approves a pending media item.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn moderate_approves_as_agent(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_agent, agent_token) = common::seed_authed_user(&env, &pool, UserRole::Agent).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &landlord_token).await;
    let media_id = upload_media_id(&env, &landlord_token, listing_id).await;

    let (status, body) = moderate(&env, &agent_token, listing_id, media_id, "approved").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["moderationStatus"], "approved");
}

/// An agent rejects a media item.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn moderate_rejects_media(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_agent, agent_token) = common::seed_authed_user(&env, &pool, UserRole::Agent).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &landlord_token).await;
    let media_id = upload_media_id(&env, &landlord_token, listing_id).await;

    let (status, body) = moderate(&env, &agent_token, listing_id, media_id, "rejected").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["moderationStatus"], "rejected");
}

/// Moderation is an agent-only call: even the listing owner (a landlord) is
/// rejected by the role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn moderate_rejects_non_agent_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &landlord_token).await;
    let media_id = upload_media_id(&env, &landlord_token, listing_id).await;

    let (status, _body) = moderate(&env, &landlord_token, listing_id, media_id, "approved").await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Moderating an unknown media id -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn moderate_returns_404_for_unknown_media(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_agent, agent_token) = common::seed_authed_user(&env, &pool, UserRole::Agent).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &landlord_token).await;

    let (status, _body) =
        moderate(&env, &agent_token, listing_id, Uuid::new_v4(), "approved").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Pending media is hidden from the public detail; approval makes it visible.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn pending_media_hidden_until_approved(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, landlord_token) =
        common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_agent, agent_token) = common::seed_authed_user(&env, &pool, UserRole::Agent).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &landlord_token).await;
    let media_id = upload_media_id(&env, &landlord_token, listing_id).await;

    // Pending: public detail shows no media.
    let before = env
        .server
        .get(&format!("/api/v1/listings/{listing_id}"))
        .await;
    assert_eq!(before.json::<Value>()["media"].as_array().unwrap().len(), 0);

    moderate(&env, &agent_token, listing_id, media_id, "approved").await;

    // Approved: now it surfaces.
    let after = env
        .server
        .get(&format!("/api/v1/listings/{listing_id}"))
        .await;
    assert_eq!(after.json::<Value>()["media"].as_array().unwrap().len(), 1);
}

// `PUT /listings/{id}/media` reorder + remove ---------------------------------

/// `order` sets each id's position to its index in the list.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn reorder_sets_positions(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;
    let first = upload_media_id(&env, &token, listing_id).await;
    let second = upload_media_id(&env, &token, listing_id).await;

    // Reverse the order: second-uploaded should land at position 0.
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/media"),
        &token,
        &json!({ "order": [second, first] }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let media = body.unwrap();
    // Response is ordered by position ASC.
    assert_eq!(media[0]["id"].as_str().unwrap(), second.to_string());
    assert_eq!(media[0]["position"], 0);
    assert_eq!(media[1]["id"].as_str().unwrap(), first.to_string());
    assert_eq!(media[1]["position"], 1);
}

/// `remove` drops the listed media; the response carries only what survives.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn remove_deletes_media(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, landlord_id, &token).await;
    let first = upload_media_id(&env, &token, listing_id).await;
    let second = upload_media_id(&env, &token, listing_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/media"),
        &token,
        &json!({ "remove": [first] }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let media = body.unwrap();
    assert_eq!(media.as_array().unwrap().len(), 1);
    assert_eq!(media[0]["id"].as_str().unwrap(), second.to_string());
}

/// A non-owner cannot reorder/remove media -> `403`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_media_rejects_non_owner_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (owner_id, owner_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_other, other_token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let listing_id = owned_listing(&env, &pool, owner_id, &owner_token).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{listing_id}/media"),
        &other_token,
        &json!({ "order": [] }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

/// Reorder/remove on an unknown listing -> `404`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_media_returns_404_for_unknown(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{}/media", Uuid::new_v4()),
        &token,
        &json!({ "order": [] }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// A tenant token is rejected by the landlord role gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_media_rejects_tenant_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_id, token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _body) = common::authed_request::<Value>(
        &env.server,
        &Method::PUT,
        &format!("/api/v1/listings/{}/media", Uuid::new_v4()),
        &token,
        &json!({ "order": [] }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}
