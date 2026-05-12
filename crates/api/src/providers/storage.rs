//! Media-storage abstraction.
//!
//! Defines the [`MediaStorage`] capability and a no-delivery
//! [`StubMediaStorage`] implementation used in dev/test. Production deployments
//! are expected to swap the storage in [`AppState`](crate::common::AppState)
//! for an S3-compatible (AWS S3, Cloudflare R2, MinIO) implementation without
//! touching call sites: handlers depend on the trait, not on the concrete
//! backend.
//!
//! Mirrors the [`EmailSender`](crate::providers::EmailSender) abstraction in
//! shape, motivation, and lifecycle.

use std::sync::Arc;

use async_trait::async_trait;

/// Errors produced by [`MediaStorage`] implementations.
///
/// Marked `#[non_exhaustive]` because future implementations (`S3`, `MinIO`,
/// presigned-URL hybrids) will surface provider-specific failure modes
/// (signed-URL expiry, region mismatch, content-length-mismatch on PUT) that
/// callers will want to react to without forcing every implementation to
/// shim them through `Transport`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum StorageError {
    /// Underlying transport (HTTP API, SDK call, etc.) failed. The string is
    /// operator-readable and carries enough context to triage from logs; it
    /// MUST NOT be returned verbatim to API clients (it can leak provider
    /// details, internal hostnames, or signed-URL parameters).
    #[error("storage transport error: {0}")]
    Transport(String),
    /// The implementation has no usable backend - typically the
    /// [`StubMediaStorage`] receiving a `delete` for a key that was never
    /// stored, or a real implementation called before its credentials were
    /// loaded. Callers SHOULD treat this as a 500-class failure but the
    /// distinct variant lets observability dashboards separate
    /// misconfiguration from genuine transport flakes.
    #[error("storage not configured")]
    NotConfigured,
}

/// Capability to store and remove opaque media blobs (avatars, property
/// images, lease PDFs) under string keys.
///
/// Object-safe (via `#[async_trait]`) so it can be stored as
/// `Arc<dyn MediaStorage>` in [`AppState`](crate::common::AppState) and
/// shared across handlers without making the entire state struct generic
/// over the concrete backend type.
///
/// Keys are caller-provided and treated opaquely. Implementations MAY
/// transform them (e.g. prepend a bucket path) but the public URL returned
/// by `put` is the only stable identifier the caller should persist.
#[async_trait]
pub trait MediaStorage: Send + Sync {
    /// Stores `bytes` under `key` and returns a publicly fetchable URL.
    ///
    /// `content_type` is the validated MIME the caller already sniffed; the
    /// implementation MAY pass it to the backend as `Content-Type` metadata
    /// but is not required to.
    ///
    /// Implementations overwrite any existing object at the same key
    /// without complaint - callers that need versioning should encode the
    /// version into the key itself.
    ///
    /// # Errors
    ///
    /// Returns [`StorageError::Transport`] when the underlying backend
    /// rejects the write (network failure, permission denied, quota
    /// exhausted). Validation errors (oversize `bytes`, bad MIME) are the
    /// caller's responsibility and are not represented here.
    async fn put(
        &self,
        key: &str,
        bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<String, StorageError>;

    /// Removes the object at `key`. Idempotent: deleting a non-existent
    /// key is `Ok(())`, not an error - callers that pre-check existence
    /// would race with concurrent deletes anyway.
    ///
    /// # Errors
    ///
    /// Returns [`StorageError::Transport`] when the backend itself fails
    /// (auth, network). Returning anything else from a "key not found"
    /// outcome would force every caller to write match-and-ignore code.
    async fn delete(&self, key: &str) -> Result<(), StorageError>;
}

/// Shared, type-erased handle to a [`MediaStorage`] implementation.
///
/// Stand-in for the verbose `Arc<dyn MediaStorage>` at call sites that pass
/// the storage around (server bootstrap, [`AppState`](crate::common::AppState)
/// field, future test fixtures). The alias is intentionally backend-agnostic:
/// the concrete value behind it may be [`StubMediaStorage`], a future
/// `S3MediaStorage`, or any other implementation - the name says only that
/// it is shared (`Arc`) and erased (`dyn`).
pub type SharedMediaStorage = Arc<dyn MediaStorage>;

// -----------------------------------------------------------------------------

/// Default base URL for non-image stub uploads when `MEDIA_STUB_BASE_URL`
/// is unset. Uses the IANA `example.com` domain so the URL is syntactically
/// valid but obviously not a real CDN.
const DEFAULT_STUB_BASE_URL: &str = "https://example.com/media-stub";

/// 256x256 grey square SVG with "AVATAR" text, embedded as a `data:` URI.
///
/// Returned by [`StubMediaStorage::put`] for image keys so frontend devs
/// see a real placeholder rendered in the UI instead of a broken-image
/// icon. The browser renders this without any network round-trip and the
/// URL is stable across restarts, which simplifies snapshot tests on the
/// frontend.
const AVATAR_PLACEHOLDER_DATA_URI: &str = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSIxMjgiIHk9IjEzNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM0YTU1NjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFWQVRBUjwvdGV4dD48L3N2Zz4=";

/// No-delivery implementation that emits the upload as a `tracing` event
/// and returns a deterministic placeholder URL.
///
/// For keys that look like avatar uploads (`avatars/...`) the returned URL
/// is the inline `data:image/svg+xml` placeholder, so the frontend
/// renders a real 256x256 image without any backend dependency. For other
/// keys the URL is `{base}/{key}`, which is enough to keep API contracts
/// stable while a real `S3MediaStorage` is being wired up.
///
/// MUST NOT be installed in any environment where users could reasonably
/// expect their uploaded media to persist - the bytes are dropped on the
/// floor.
#[derive(Debug, Clone)]
pub struct StubMediaStorage {
    base_url: String,
}

impl StubMediaStorage {
    /// Builds a stub backed by `base_url` for non-image keys. Pass `None`
    /// to use [`DEFAULT_STUB_BASE_URL`].
    #[inline]
    #[must_use]
    pub fn new(base_url: Option<String>) -> Self {
        Self {
            base_url: base_url.unwrap_or_else(|| DEFAULT_STUB_BASE_URL.to_owned()),
        }
    }
}

impl Default for StubMediaStorage {
    #[inline]
    fn default() -> Self {
        Self::new(None)
    }
}

#[async_trait]
impl MediaStorage for StubMediaStorage {
    #[inline]
    async fn put(
        &self,
        key: &str,
        bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<String, StorageError> {
        tracing::info!(
            event = "media_put_stub",
            key = %key,
            size = bytes.len(),
            content_type = %content_type,
            "Media upload logged (no real storage configured)"
        );
        // Avatar keys get the inline placeholder so the frontend renders a
        // real image; everything else gets a synthetic CDN-shaped URL the
        // frontend can store, log, or echo back without surprises.
        if key.starts_with("avatars/") {
            Ok(AVATAR_PLACEHOLDER_DATA_URI.to_owned())
        } else {
            Ok(format!("{}/{}", self.base_url, key))
        }
    }

    #[inline]
    async fn delete(&self, key: &str) -> Result<(), StorageError> {
        tracing::info!(
            event = "media_delete_stub",
            key = %key,
            "Media delete logged (no real storage configured)"
        );
        Ok(())
    }
}
