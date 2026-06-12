//! Content-pinning (IPFS) abstraction.
//!
//! Defines the [`ContentPinner`] capability and a [`FakePinner`] that returns a
//! deterministic synthetic CID, used for the hackathon. Production deployments
//! swap in a real IPFS node/provider in
//! [`AppState`](crate::common::AppState) without touching call sites: the media
//! pipeline depends on the trait, not the concrete backend.
//!
//! Mirrors the [`MediaStorage`](crate::providers::MediaStorage) abstraction in
//! shape, motivation, and lifecycle. Trait and first (fake) impl share this
//! file; a real pinner arrives as a sibling module when it exists.

use std::sync::Arc;

use async_trait::async_trait;
use sha2::{Digest, Sha256};

/// Errors produced by [`ContentPinner`] implementations.
///
/// `#[non_exhaustive]` because a real IPFS backend will surface
/// provider-specific failures (gateway timeout, pin-quota exhausted, node
/// unreachable) that callers may want to branch on without every
/// implementation shimming them through `Transport`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum PinError {
    /// Underlying transport (IPFS node/API) failed. Operator-readable; MUST NOT
    /// be returned verbatim to API clients.
    #[error("content pin transport error: {0}")]
    Transport(String),
}

/// Result alias for fallible [`ContentPinner`] operations.
pub type PinResult<T> = Result<T, PinError>;

/// Capability to pin opaque content and return its content id (CID).
///
/// Object-safe (via `#[async_trait]`) so it can live as
/// `Arc<dyn ContentPinner>` in [`AppState`](crate::common::AppState) and be
/// shared across handlers without making the state generic over the backend.
#[async_trait]
pub trait ContentPinner: Send + Sync {
    /// Pins `bytes` and returns the resulting CID.
    ///
    /// Content-addressed: the same bytes always yield the same CID, so a repeat
    /// pin is idempotent.
    ///
    /// # Errors
    ///
    /// Returns [`PinError::Transport`] when the backend itself fails (network,
    /// auth, quota).
    async fn pin(&self, bytes: &[u8]) -> PinResult<String>;
}

/// Shared, type-erased handle to a [`ContentPinner`] implementation.
pub type SharedContentPinner = Arc<dyn ContentPinner>;

// -----------------------------------------------------------------------------

/// Hackathon implementation that returns a deterministic synthetic CID.
///
/// The CID is `bafy` + the hex SHA-256 of the bytes: content-addressed like a
/// real CID (same bytes -> same CID) but not a real multihash-encoded one. The
/// bytes are not stored anywhere - this MUST NOT be relied on to actually
/// retrieve content. Swap for a real IPFS node/provider before production.
#[derive(Debug, Clone, Default)]
pub struct FakePinner;

impl FakePinner {
    /// Constructs the fake pinner.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl ContentPinner for FakePinner {
    #[inline]
    async fn pin(&self, bytes: &[u8]) -> PinResult<String> {
        let digest = Sha256::digest(bytes);
        let cid = format!("bafy{}", hex::encode(digest));
        tracing::info!(
            event = "content_pin_stub",
            cid = %cid,
            size = bytes.len(),
            "Content pinned (no real IPFS provider configured)"
        );
        Ok(cid)
    }
}
