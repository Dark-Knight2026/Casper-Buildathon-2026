//! Image metadata-stripping abstraction.
//!
//! Defines the [`MetadataStripper`] capability and a [`NoopMetadataStripper`]
//! that returns bytes unchanged, used for the hackathon. A real byte-level
//! stripper (EXIF/GPS in JPEG `APP1`, PNG `eXIf`/`tEXt`, WebP `EXIF`/`XMP`)
//! swaps in via [`AppState`](crate::common::AppState) without touching call
//! sites: the media pipeline depends on the trait, not the concrete backend.
//!
//! Mirrors the [`ContentPinner`](crate::providers::ContentPinner) abstraction in
//! shape, motivation, and lifecycle. Trait and first (stub) impl share this
//! file; a real stripper arrives as a sibling module when it exists.

use std::sync::Arc;

use async_trait::async_trait;

/// Capability to strip privacy-sensitive metadata (EXIF/GPS, XMP) from image
/// bytes before they are stored or pinned.
///
/// Object-safe (via `#[async_trait]`) so it can live as
/// `Arc<dyn MetadataStripper>` in [`AppState`](crate::common::AppState) and be
/// shared across handlers without making the state generic over the backend.
#[async_trait]
pub trait MetadataStripper: Send + Sync {
    /// Returns sanitized image bytes with metadata removed. `mime` is the
    /// already-sniffed format so an implementation can pick its per-format
    /// parser. On unrecognized or malformed input an implementation returns the
    /// bytes unchanged rather than failing - a stripper must never corrupt a
    /// valid image.
    async fn strip(&self, bytes: &[u8], mime: &str) -> Vec<u8>;
}

/// Shared, type-erased handle to a [`MetadataStripper`] implementation.
pub type SharedMetadataStripper = Arc<dyn MetadataStripper>;

// -----------------------------------------------------------------------------

/// Hackathon no-op: returns the bytes unchanged (metadata is NOT stripped).
///
/// MUST NOT be relied on as a privacy control - uploaded photos keep their
/// EXIF/GPS. Swap for a real byte-level stripper before production; the WARN at
/// bootstrap flags that this is active.
#[derive(Debug, Clone, Default)]
pub struct NoopMetadataStripper;

impl NoopMetadataStripper {
    /// Constructs the no-op stripper.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl MetadataStripper for NoopMetadataStripper {
    #[inline]
    async fn strip(&self, bytes: &[u8], _mime: &str) -> Vec<u8> {
        bytes.to_vec()
    }
}
