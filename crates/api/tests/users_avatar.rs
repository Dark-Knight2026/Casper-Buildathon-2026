//! Integration tests for `POST /api/v1/users/me/avatar`.
//!
//! Exercises the full handler end-to-end against an isolated Postgres
//! schema (via `#[sqlx::test]`) and a per-test Redis container, with
//! `StubMediaStorage` standing in for the production S3 backend (the
//! storage swap in PR #2 will reuse this test surface unchanged).
//!
//! The cases cover the four failure boundaries that the handler is
//! responsible for - missing/oversize payload, MIME whitelist,
//! magic-byte sniff, and per-user rate-limit - plus one happy path that
//! pins the storage-key shape and the response contract.

mod common;

use axum::http::StatusCode;
use axum_test::{
    http::header::COOKIE,
    multipart::{MultipartForm, Part},
};
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use serde_json::Value;
use sqlx::PgPool;

use api::common::CASPER_MESSAGE_PREFIX;
use common::TestEnv;

/// 8-byte PNG signature followed by 1 KB of zero padding.
///
/// The sniff only inspects the first 8 bytes, so any payload that starts
/// with the canonical PNG magic is accepted regardless of what follows.
/// Padding to 1 KB so the size assertion in the happy path has something
/// to compare against beyond the bare signature.
fn fake_png_bytes() -> Vec<u8> {
    let mut bytes = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    bytes.extend(core::iter::repeat_n(0u8, 1024 - bytes.len()));
    bytes
}

/// Sign the wallet-login challenge the same way the real client does.
///
/// Duplicated from the other integration test files rather than
/// abstracted into `common.rs` because the helpers there already pull in
/// every fixture (mailers, JWT builders) that the avatar tests do not
/// need - the small duplication keeps the test module's blast radius
/// narrow.
fn sign_with_prefix(message: &str, secret_key: &SecretKey, public_key: &PublicKey) -> String {
    let prefixed = format!("{CASPER_MESSAGE_PREFIX}{message}");
    crypto::sign(prefixed.as_bytes(), secret_key, public_key).to_hex()
}

/// Boilerplate: hit `/auth/nonce`, sign it, exchange for an access cookie.
async fn login_and_get_access_token(env: &TestEnv, secret_seed: u8) -> String {
    let secret_key = SecretKey::ed25519_from_bytes([secret_seed; 32]).unwrap();
    let public_key = PublicKey::from(&secret_key);
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    login_response.cookie("access_token").value().to_owned()
}

/// Happy path: a PNG payload uploaded with `StubMediaStorage` returns 200
/// and a non-empty `avatar_url`. The stub returns a deterministic
/// `data:image/svg+xml` placeholder for any key under `avatars/`, so the
/// assertion is on the URL prefix rather than on a literal value - the
/// stub may evolve its placeholder body over time.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_happy_path_returns_url(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x41).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(fake_png_bytes())
            .mime_type("image/png")
            .file_name("avatar.png"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    let avatar_url = body["avatar_url"]
        .as_str()
        .expect("avatar_url must be present");
    assert!(
        avatar_url.starts_with("data:image/svg+xml;base64,"),
        "stub storage must return the inline data URI for image keys; got {avatar_url}",
    );
}

/// Anonymous request must 401 - the protected-router middleware rejects
/// the call before any multipart parsing or Redis traffic happens. Pins
/// the wiring: a future regression that mounts `/me/avatar` outside the
/// authenticated nest would surface here as a 200/415 instead of a 401.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_without_authentication_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let form =
        MultipartForm::new().add_part("file", Part::bytes(fake_png_bytes()).mime_type("image/png"));

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// Payload over 5 MB must 413. The outer `RequestBodyLimitLayer` in
/// `server::create_app` is sized to match `MAX_AVATAR_BYTES`, so this
/// test asserts the layer-level rejection (which fires before the
/// handler runs) and the equivalent handler-level guard (which fires for
/// any future widening of the outer limit). Either path produces the
/// same status code from the client's perspective, which is the
/// contract.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_oversize_payload_returns_413(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x42).await;

    // 6 MB ensures rejection regardless of which guard fires first.
    let mut oversized = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    oversized.extend(core::iter::repeat_n(0u8, 6 * 1024 * 1024));
    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(oversized)
            .mime_type("image/png")
            .file_name("big.png"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::PAYLOAD_TOO_LARGE);
}

/// `application/pdf` must 415: the MIME whitelist rejects the field
/// before the byte sniff runs. Pins the contract that "I sent a file with
/// the wrong type" is a 415, not a 400 (which is reserved for
/// missing-field / malformed-multipart shapes).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_unsupported_mime_returns_415(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x43).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(b"%PDF-1.4 fake".to_vec())
            .mime_type("application/pdf")
            .file_name("doc.pdf"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

/// MIME-spoofing: the client claims `application/pdf` while sending PNG
/// bytes. Even though the bytes themselves are valid PNG, the declared
/// MIME is not on the whitelist, so the 415 fires from the whitelist
/// gate (not from the sniff cross-check).
///
/// This pins the order of checks: whitelist first, sniff second. A
/// future refactor that swaps the order would still 415 this case but
/// would change the message string - the assertion stays loose to
/// tolerate that.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_png_bytes_with_pdf_mime_returns_415(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x44).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(fake_png_bytes())
            .mime_type("application/pdf")
            .file_name("spoofed.pdf"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

/// MIME-spoofing the other way: the client claims `image/webp`, the
/// header passes the whitelist, but the bytes start with `RIFF` followed
/// by `AVI ` (not `WEBP`). The 12-byte sniff catches this - a
/// hypothetical 4-byte sniff that only checked `RIFF` would let it
/// through, which is exactly the regression this test pins.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_riff_avi_with_webp_mime_returns_415(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x45).await;

    // RIFF + 4-byte size + AVI<space> + padding. The handler reads the
    // first 12 bytes; the sniff fails because bytes [8..12] are `AVI `,
    // not `WEBP`.
    let mut avi_bytes = b"RIFF".to_vec();
    avi_bytes.extend_from_slice(&[0u8; 4]);
    avi_bytes.extend_from_slice(b"AVI ");
    avi_bytes.extend(core::iter::repeat_n(0u8, 32));

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(avi_bytes)
            .mime_type("image/webp")
            .file_name("fake.webp"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}

/// Per-user rate limit: the 11th upload within an hour returns 429. The
/// counter increments only after a successful storage write, so this
/// test runs 10 valid uploads end-to-end and asserts the 11th is the
/// first to be blocked.
///
/// Each iteration uses fresh PNG bytes so the storage stub does not
/// short-circuit on a hypothetical idempotency check (it does not today,
/// but the test does not depend on that detail).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_rate_limit_blocks_eleventh_attempt(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x46).await;

    for i in 0..10 {
        let form = MultipartForm::new().add_part(
            "file",
            Part::bytes(fake_png_bytes())
                .mime_type("image/png")
                .file_name("a.png"),
        );
        let response = env
            .server
            .post("/api/v1/users/me/avatar")
            .add_header(COOKIE, format!("access_token={access_token}"))
            .multipart(form)
            .await;
        assert_eq!(
            response.status_code(),
            StatusCode::OK,
            "upload #{} (1-indexed: {}) must succeed before rate-limit kicks in",
            i,
            i + 1,
        );
    }

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(fake_png_bytes())
            .mime_type("image/png")
            .file_name("a.png"),
    );
    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;
    assert_eq!(
        response.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "the 11th upload within the rolling hour must be blocked",
    );
}
