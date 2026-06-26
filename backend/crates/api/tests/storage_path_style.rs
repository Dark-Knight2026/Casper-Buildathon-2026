//! Unit tests for `S3MediaStorage` addressing-style selection.
//!
//! Constructor-only: each test assembles the `Bucket` and asserts on
//! its addressing mode via [`S3MediaStorage::is_path_style`] without
//! making any network calls. The live S3 / `MinIO` behavior is
//! covered by `users_avatar_s3.rs` behind the `integration` feature;
//! the assertions here are about routing geometry that the wire-level
//! suite cannot probe (it always points at `MinIO`, which only
//! supports path-style anyway).

use api::S3MediaStorage;

/// Constructs an `S3MediaStorage` for the given endpoint with stable
/// dummy credentials. `rust-s3` does not contact the network from
/// `Bucket::new`, so the result is deterministic and independent of
/// where the tests run.
fn build_storage(endpoint: &str) -> S3MediaStorage {
    S3MediaStorage::new(
        "test-bucket",
        "us-east-1".to_owned(),
        endpoint.to_owned(),
        "access-key",
        "secret-key",
        format!("{endpoint}/test-bucket"),
    )
    .expect("S3MediaStorage::new should accept a well-formed config")
}

/// `MinIO` (and any non-AWS S3-compatible backend reachable by short
/// hostname) supports ONLY path-style addressing. Virtual-hosted-style
/// URLs require DNS to resolve `<bucket>.<endpoint>`, which a `MinIO`
/// container reachable at `http://minio:9000` inside a compose
/// network cannot provide. The constructor MUST keep path-style for
/// these endpoints - this test pins that as a regression guard so a
/// future "always virtual-hosted" change cannot silently break dev.
#[test]
fn s3_media_storage_uses_path_style_for_minio_endpoint() {
    let storage = build_storage("http://minio:9000");
    assert!(
        storage.is_path_style(),
        "MinIO-style endpoint must use path-style addressing",
    );
}

/// AWS S3 supports both addressing styles but has been deprecating
/// path-style for years: regions created after 2020-09 are
/// virtual-hosted-style ONLY, and the rest are scheduled to follow.
/// The constructor MUST detect AWS endpoints (`*.amazonaws.com`) and
/// DISABLE path-style so the resulting `Bucket` issues canonical
/// virtual-hosted URLs (`<bucket>.s3.<region>.amazonaws.com/<key>`).
///
/// This test is the regression guard for the
/// `fix(storage): apply with_path_style only for non-AWS endpoints`
/// commit and is expected to FAIL on the pre-fix code where
/// `with_path_style()` is invoked unconditionally.
#[test]
fn s3_media_storage_disables_path_style_for_aws_endpoint() {
    let storage = build_storage("https://s3.us-east-1.amazonaws.com");
    assert!(
        !storage.is_path_style(),
        "AWS endpoint must use virtual-hosted-style addressing",
    );
}
