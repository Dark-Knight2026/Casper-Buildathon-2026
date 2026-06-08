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
use casper_types::{AsymmetricType, PublicKey, SecretKey};
use redis::AsyncCommands;
use serde_json::Value;
use sqlx::PgPool;

use api::common::RedisStore;
use common::TestEnv;

/// Seed-based wallet login, kept local because the seed pins a
/// deterministic wallet that some assertions rely on (e.g. tests that
/// log the same wallet in twice and assert the second login resolves
/// to the same `users` row). The general-purpose
/// `common::login_and_extract` uses random keys and would defeat that
/// invariant.
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
    let signature_hex = common::sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login/wallet")
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
        Part::bytes(common::fake_png_bytes())
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

/// Parameterized `Content-Type` (RFC 2045) must NOT be rejected by the
/// MIME whitelist. The handler historically compared the raw declared
/// MIME against the literal whitelist with `!=`, so a header like
/// `image/jpeg; charset=binary` (which some HTTP clients append
/// automatically) collapsed to a 415 even when the bytes were a valid
/// JPEG/PNG/WebP. The fix strips parameters before the comparison and
/// before the `detected.mime != mime_str` cross-check; both gates must
/// agree, otherwise the cross-check would 415 the very payloads the
/// whitelist now accepts.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_parameterized_content_type_is_accepted(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x4D).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes())
            .mime_type("image/png; charset=binary")
            .file_name("avatar.png"),
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
        "RFC 2045 parameters on Content-Type must not break the whitelist gate",
    );
    let body = response.json::<Value>();
    assert!(
        body["avatar_url"].as_str().is_some(),
        "successful upload must echo avatar_url",
    );
}

/// Anonymous request must 401 - the protected-router middleware rejects
/// the call before any multipart parsing or Redis traffic happens. Pins
/// the wiring: a future regression that mounts `/me/avatar` outside the
/// authenticated nest would surface here as a 200/415 instead of a 401.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_without_authentication_returns_401(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes()).mime_type("image/png"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

/// Payload over `MAX_AVATAR_BYTES` (5 MiB) must 413. Two guards can fire,
/// depending on size relative to the outer cap:
/// - handler-level: `MAX_AVATAR_BYTES` < payload <= outer cap. The body
///   passes `RequestBodyLimitLayer` and the handler rejects it with a clean
///   413.
/// - layer-level: payload > outer cap. `RequestBodyLimitLayer` rejects it
///   before the handler runs - but only as a clean 413 when `Content-Length`
///   is known up front. A streamed (chunked) body over the cap is instead
///   truncated mid-parse and surfaces as a `MultipartError -> 400`, which is
///   the very outcome the 8 MiB floor exists to keep out of reach for avatars.
///   The layer-level 413 path is covered by
///   `upload_avatar_above_outer_cap_returns_413_at_layer` below.
///
/// `common::setup_test_server` sets `request_body_limit_mb: 8`, so this
/// test's 6 MiB payload exercises the HANDLER-level path: 6 MiB < 8 MiB
/// passes the layer, then 6 MiB > 5 MiB is rejected by the handler.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_oversize_payload_returns_413(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x42).await;

    // 6 MiB: above the 5 MiB handler cap, below the 8 MiB outer cap.
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

/// Layer-level 413: a body whose `Content-Length` exceeds the outer cap is
/// rejected by `RequestBodyLimitLayer` before the avatar handler ever runs.
///
/// The handler-level test above (with the production `request_body_limit_mb`
/// of 8) only exercises the handler's own `MAX_AVATAR_BYTES` guard. Here we
/// lower the outer cap to 6 MiB via `TestOverrides` and send a 7 MiB body.
///
/// Crucially this uses a fixed-size `bytes()` body, NOT the streaming
/// `multipart()` builder: the latter sends `Transfer-Encoding: chunked` with no
/// `Content-Length`, so the layer can only truncate the stream mid-parse, which
/// surfaces as a `MultipartError -> 400` (exactly the failure the 8 MiB floor
/// exists to avoid - see `server.rs`). A sized body carries `Content-Length`, so
/// the layer's eager pre-check fires and returns a clean 413 before routing -
/// the genuine layer-level path. The body bytes are never parsed, so any
/// content type works.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_above_outer_cap_returns_413_at_layer(pool: PgPool) {
    let overrides = common::TestOverrides {
        request_body_limit_mb: Some(6),
        ..Default::default()
    };
    let env = common::setup_test_server_with(pool, true, overrides).await;
    let access_token = login_and_get_access_token(&env, 0x48).await;

    // 7 MiB sized body: Content-Length 7 MiB > 6 MiB cap, so the layer's eager
    // check rejects it before the request is routed to the handler.
    let oversized = vec![0u8; 7 * 1024 * 1024];

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .content_type("multipart/form-data")
        .bytes(oversized.into())
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
        Part::bytes(common::fake_png_bytes())
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
            Part::bytes(common::fake_png_bytes())
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
        Part::bytes(common::fake_png_bytes())
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

/// Rate-limit accounting regression: when the trailing DB write
/// (`update_avatar_url`) fails, the rate-limit slot must NOT be
/// consumed. The bug was the operation order
/// `storage.put -> redis.record_attempt -> db.update_avatar_url`:
/// a DB failure after the Redis INCR leaves the user with an orphan
/// blob (billing concern) AND a burned rate-limit slot for an upload
/// that the client sees as a 5xx/4xx (correctness concern). The fix
/// reorders to `storage.put -> db.update_avatar_url -> redis.record_attempt`
/// so a DB failure aborts before the counter is touched.
///
/// Repro lever: soft-delete the user via direct UPDATE on `deleted_at`
/// only (bypassing both the `delete_me` gates AND the production
/// `soft_delete_user` path that would also stamp `jwt_invalidate_before`).
/// The auth middleware admits the JWT because `jwt_invalidate_before`
/// stays NULL after this stripped-down UPDATE - the cutoff check
/// reports "no cutoff" and the cookie passes through. Then
/// `db::update_avatar_url`'s `WHERE id = $1 AND deleted_at IS NULL`
/// matches zero rows and returns `RowNotFound`. The handler maps
/// that to 404 - and the rate-limit accounting is whatever happened
/// before the `update_avatar_url` call.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_db_failure_does_not_consume_rate_limit_slot(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    // Direct UPDATE soft-deletes the user without going through the
    // `DELETE /me` gates. Mirrors the production failure mode where
    // the JWT outlives the row by up to 15 minutes.
    sqlx::query!(
        r"
            UPDATE users
            SET deleted_at = NOW()
            WHERE id = $1
        ",
        session.user_id,
    )
    .execute(&pool)
    .await
    .expect("soft-delete user");

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes())
            .mime_type("image/png")
            .file_name("avatar.png"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .multipart(form)
        .await;

    // The DB UPDATE in `update_avatar_url` finds zero rows (the
    // `deleted_at IS NULL` filter excludes the just-soft-deleted row)
    // and the handler maps `Error::RowNotFound` to 404. Pre- and
    // post-fix this is the same; the discriminator is the Redis
    // counter checked below.
    assert_eq!(
        response.status_code(),
        StatusCode::NOT_FOUND,
        "soft-deleted user must hit the 404 path that proves the DB write failed",
    );

    // Load-bearing assertion: the rate-limit counter must NOT have
    // been incremented for an upload the client never observed as
    // successful. Pre-fix, `record_avatar_upload_attempt` ran before
    // `update_avatar_url` so this counter is at 1; post-fix the
    // counter is untouched (key absent).
    let redis_env = env
        .redis
        .as_ref()
        .expect("redis env required for this test");
    let mut conn = redis_env
        .client
        .get_multiplexed_async_connection()
        .await
        .expect("connect to test redis");

    let key = RedisStore::avatar_upload_attempts_key(session.user_id);
    let count = conn
        .get::<_, Option<u64>>(&key)
        .await
        .expect("read avatar_upload_attempts counter");

    assert!(
        count.is_none(),
        "DB-failed avatar upload must not consume a rate-limit slot; got counter = {count:?} for key {key}",
    );
}

/// Minimum-payload-size guard for the magic-byte sniff. Submitting only
/// the 3-byte JPEG SOI (`FF D8 FF`) with `Content-Type: image/jpeg` used
/// to pass: the whitelist accepted the header, the sniff checked
/// `payload.len() >= JPEG_MAGIC.len() == 3` and the cross-check matched,
/// so a 3-byte body was written to storage as a "valid JPEG" with a 200
/// response. A real JPEG cannot fit in three bytes (SOI alone is not a
/// renderable image), so this must 415 before any storage write.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn upload_avatar_truncated_jpeg_soi_returns_415(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;
    let access_token = login_and_get_access_token(&env, 0x47).await;

    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(vec![0xFF, 0xD8, 0xFF])
            .mime_type("image/jpeg")
            .file_name("tiny.jpg"),
    );

    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={access_token}"))
        .multipart(form)
        .await;

    assert_eq!(
        response.status_code(),
        StatusCode::UNSUPPORTED_MEDIA_TYPE,
        "3-byte SOI is not a renderable JPEG and must be rejected before storage write",
    );
}
