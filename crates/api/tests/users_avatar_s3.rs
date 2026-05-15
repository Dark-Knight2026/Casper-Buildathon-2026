//! Integration tests for `POST /api/v1/users/me/avatar` against a real
//! `MinIO` container.
//!
//! Complement the `users_avatar.rs` suite (which pins handler-level
//! gates - MIME whitelist, magic-byte sniff, rate-limit, oversize -
//! against `StubMediaStorage`) by exercising the production
//! `S3MediaStorage` end-to-end:
//!
//! 1. Happy path (PNG): bytes uploaded through the handler land in
//!    the bucket under the documented `avatars/{user_id}.{ext}` key,
//!    and the returned `avatar_url` resolves to the same object.
//! 2. Re-upload anti-orphan: a subsequent upload with a different
//!    extension creates the new key and deletes the previous one.
//! 3. Transport-failure leak guard: when the storage backend is
//!    unreachable, the handler surfaces 500 with a generic body that
//!    does NOT leak bucket name, endpoint, or credentials.
//! 4. Delete idempotency: `MediaStorage::delete` on a key that was
//!    never stored returns `Ok(())`, which the anti-orphan sweep in
//!    the avatar handler depends on for every fresh upload.
//! 5. Happy path (WebP): equivalent to (1) but exercises the WebP
//!    branch of the MIME whitelist / magic-byte sniff, pinning that
//!    `image/webp` is a first-class avatar format and not just PNG/JPEG.
//!
//! The whole file is gated behind the `integration` feature so the
//! default `cargo test -p api` run (without Docker) stays green.
//! `make test` enables the feature via `--all-features` and brings up
//! the shared `minio-test` container from `docker-compose.test.yml`,
//! so the standard flow just works; ad-hoc runs need `cargo nextest
//! run -p api --features integration --test users_avatar_s3` against
//! an already-running test compose stack.

#![cfg(feature = "integration")]

mod common;

use std::sync::Arc;

use axum::http::StatusCode;
use axum_test::{
    http::header::COOKIE,
    multipart::{MultipartForm, Part},
};
use secrecy::ExposeSecret;
use serde_json::Value;
use sqlx::PgPool;

use api::{MediaStorage, S3MediaStorage, SharedMediaStorage};
use common::{MinioTestEnv, TestEnv, TestOverrides};

/// Starts a `MinIO` container, wires its config into an `S3MediaStorage`,
/// and returns both the test server and the live container handle.
///
/// The `MinioTestEnv` is returned alongside `TestEnv` so callers can
/// read objects back directly (`minio.bucket.get_object(...)`) without
/// going through the public HTTP URL - that decouples assertions from
/// `MinIO`'s default-private bucket policy (the production `public-read`
/// ACL is set on the upload itself, but `MinIO` requires a separate
/// bucket-level policy to actually allow anonymous GET).
async fn setup_with_minio(pool: PgPool) -> (TestEnv, MinioTestEnv) {
    let minio = MinioTestEnv::start().await;
    let storage = Arc::new(
        S3MediaStorage::new(
            &minio.config.bucket,
            minio.config.region.clone(),
            minio.config.endpoint.clone(),
            minio.config.access_key.expose_secret(),
            minio.config.secret_key.expose_secret(),
            minio.config.public_url_base.clone(),
        )
        .expect("S3MediaStorage init"),
    ) as SharedMediaStorage;
    let env = common::setup_test_server_with(
        pool,
        true,
        TestOverrides {
            media_storage: Some(storage),
            ..TestOverrides::default()
        },
    )
    .await;
    (env, minio)
}

/// Happy path: the handler must (a) return 200 with an `avatar_url`
/// matching the documented `{public_url_base}/avatars/{user_id}.{ext}`
/// shape, and (b) leave the exact upload bytes under that key in the
/// bucket. The second assertion is what distinguishes this from the
/// stub-storage version - it confirms the wire-level `PUT` actually
/// reaches `MinIO`, not just that the handler returned a URL string.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn avatar_upload_persists_bytes_to_minio(pool: PgPool) {
    let (env, minio) = setup_with_minio(pool).await;
    let session = common::login_and_extract(&env).await;

    let payload = common::fake_png_bytes();
    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(payload.clone())
            .mime_type("image/png")
            .file_name("avatar.png"),
    );
    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    let avatar_url = body["avatar_url"].as_str().expect("avatar_url in response");
    let expected_key = format!("avatars/{}.png", session.user_id);
    let expected_url = format!("{}/{}", minio.config.public_url_base, expected_key);
    assert_eq!(
        avatar_url, expected_url,
        "avatar_url must match path-style public URL",
    );

    let object = minio
        .bucket
        .get_object(&expected_key)
        .await
        .expect("MinIO get_object");
    assert_eq!(
        object.status_code(),
        200,
        "object must be readable from MinIO at the returned key",
    );
    assert_eq!(
        object.bytes(),
        payload.as_slice(),
        "bytes stored in MinIO must match the upload payload",
    );
}

/// Anti-orphan: re-uploading under a different extension MUST delete
/// the previous object, otherwise stale PNGs would accumulate every
/// time a user replaces a PNG avatar with a JPG one. The handler does
/// this in `delete_old_key_if_extension_changed` before the new `put`;
/// we verify the post-condition end-to-end against `MinIO`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn avatar_reupload_deletes_previous_extension(pool: PgPool) {
    let (env, minio) = setup_with_minio(pool).await;
    let session = common::login_and_extract(&env).await;

    let first = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_png_bytes())
            .mime_type("image/png")
            .file_name("avatar.png"),
    );
    let first_response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .multipart(first)
        .await;
    assert_eq!(first_response.status_code(), StatusCode::OK);

    let second = MultipartForm::new().add_part(
        "file",
        Part::bytes(common::fake_jpg_bytes())
            .mime_type("image/jpeg")
            .file_name("avatar.jpg"),
    );
    let second_response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .multipart(second)
        .await;
    assert_eq!(second_response.status_code(), StatusCode::OK);

    let old_key = format!("avatars/{}.png", session.user_id);
    let new_key = format!("avatars/{}.jpg", session.user_id);

    let new_object = minio
        .bucket
        .get_object(&new_key)
        .await
        .expect("MinIO get_object new key");
    assert_eq!(
        new_object.status_code(),
        200,
        "new extension must be present after re-upload",
    );

    let old_object = minio
        .bucket
        .get_object(&old_key)
        .await
        .expect("MinIO get_object old key");
    assert_eq!(
        old_object.status_code(),
        404,
        "previous extension must be deleted, found status {}",
        old_object.status_code(),
    );
}

/// Transport-failure mapping + leak guard. When the storage backend is
/// unreachable the handler MUST surface a generic 500 - the response
/// body MUST NOT echo bucket name, endpoint host:port, or credentials,
/// since the underlying `StorageError::Transport(...)` message contains
/// all of them and a naive `format!("{e}")` into the API response
/// would leak the lot to any caller.
///
/// Points `S3MediaStorage` at port 1 (RFC 6335 reserved) so the TCP
/// connect fails immediately. Doing so in-test, rather than stopping a
/// shared container, keeps the rest of the suite running and lets the
/// assertions probe for fake bucket/endpoint/key strings that we
/// authored on the spot.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn avatar_upload_with_dead_storage_returns_generic_500(pool: PgPool) {
    let fake_bucket = "fake-bucket";
    let fake_endpoint = "http://127.0.0.1:1";
    let fake_access_key = "FAKEACCESSKEY";
    let fake_secret_key = "fakesecret";
    let storage = Arc::new(
        S3MediaStorage::new(
            fake_bucket,
            "us-east-1".to_owned(),
            fake_endpoint.to_owned(),
            fake_access_key,
            fake_secret_key,
            format!("{fake_endpoint}/{fake_bucket}"),
        )
        .expect("S3MediaStorage init"),
    ) as SharedMediaStorage;
    let env = common::setup_test_server_with(
        pool,
        true,
        TestOverrides {
            media_storage: Some(storage),
            ..TestOverrides::default()
        },
    )
    .await;
    let session = common::login_and_extract(&env).await;

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

    assert_eq!(response.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
    let body_text = response.text();
    assert!(
        !body_text.contains(fake_access_key),
        "access key MUST NOT leak in response body: {body_text}",
    );
    assert!(
        !body_text.contains(fake_secret_key),
        "secret key MUST NOT leak in response body: {body_text}",
    );
    assert!(
        !body_text.contains("127.0.0.1:1"),
        "endpoint host:port MUST NOT leak in response body: {body_text}",
    );
    assert!(
        !body_text.contains(fake_bucket),
        "bucket name MUST NOT leak in response body: {body_text}",
    );
    // The handler maps every `StorageError` variant to a generic
    // operator-facing message through `tracing::error!(error = %err, ...)` and
    // `ApiError::Internal("media storage operation failed")`. The
    // `IntoResponse` impl then replaces that payload with a flat "An internal
    // server error occurred" body. Asserting both prefixes are absent locks the
    // leak guard at two layers - a regression in either one surfaces here
    // rather than waiting for a production incident.
    assert!(
        !body_text.contains("put failed:") && !body_text.contains("delete failed:"),
        "raw rust-s3 transport detail MUST NOT leak in response body: {body_text}",
    );
}

/// `MediaStorage::delete` MUST be idempotent: deleting a key that was never
/// stored returns `Ok(())`, not an error. This is the trait-level contract (see
/// `providers/storage.rs` rustdoc on `MediaStorage::delete`) - the avatar
/// handler's anti-orphan sweep depends on it, since the sweep enumerates "every
/// avatar extension we might have stored" and DELETEs each one. Without
/// idempotency, every fresh user upload (which has no prior key to delete)
/// would surface a transport error.
///
/// AWS S3 and `MinIO` both return 204 No Content for DELETE on a non-existent
/// key; the test pins that the `S3MediaStorage` implementation surfaces that as
/// `Ok(())` rather than wrapping it in a Transport error.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn s3_media_storage_delete_nonexistent_key_is_ok(pool: PgPool) {
    let _ = pool; // shared compose Postgres not needed for this test, but the
    // `#[sqlx::test]` macro requires the parameter.
    let minio = common::MinioTestEnv::start().await;
    let storage = S3MediaStorage::new(
        &minio.config.bucket,
        minio.config.region.clone(),
        minio.config.endpoint.clone(),
        minio.config.access_key.expose_secret(),
        minio.config.secret_key.expose_secret(),
        minio.config.public_url_base.clone(),
    )
    .expect("S3MediaStorage init");

    let result = storage.delete("avatars/never-existed.png").await;

    assert!(
        result.is_ok(),
        "delete on missing key must return Ok(()), got {result:?}",
    );
}

/// `image/webp` is one of three accepted MIME types alongside PNG and JPEG (see
/// `services/users/handlers.rs:117`). The existing happy-path tests cover
/// PNG/JPEG; this test pins WebP end-to-end against real `MinIO`, asserting
/// both the documented public-URL shape and that the exact bytes round-trip
/// through the bucket.
///
/// Regression-flavored more than smoke-test: the magic-byte sniff for WebP is
/// 12-byte composite (`RIFF` + length + `WEBP`), and a regression in either the
/// sniff or the extension routing would reject the upload at 415 before the
/// bytes ever reach `MinIO`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn avatar_upload_webp_persists_bytes_to_minio(pool: PgPool) {
    let (env, minio) = setup_with_minio(pool).await;
    let session = common::login_and_extract(&env).await;

    let payload = common::fake_webp_bytes();
    let form = MultipartForm::new().add_part(
        "file",
        Part::bytes(payload.clone())
            .mime_type("image/webp")
            .file_name("avatar.webp"),
    );
    let response = env
        .server
        .post("/api/v1/users/me/avatar")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .multipart(form)
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body = response.json::<Value>();
    let avatar_url = body["avatar_url"].as_str().expect("avatar_url in response");
    let expected_key = format!("avatars/{}.webp", session.user_id);
    let expected_url = format!("{}/{}", minio.config.public_url_base, expected_key);
    assert_eq!(
        avatar_url, expected_url,
        "avatar_url must match path-style public URL for webp",
    );

    let object = minio
        .bucket
        .get_object(&expected_key)
        .await
        .expect("MinIO get_object");
    assert_eq!(
        object.status_code(),
        200,
        "webp object must be readable from MinIO at the returned key",
    );
    assert_eq!(
        object.bytes(),
        payload.as_slice(),
        "bytes stored in MinIO must match the webp upload payload",
    );
}
