//! Identity-verification (KYC) abstraction.
//!
//! Defines the [`KycProvider`] capability and a [`FakeKycProvider`] that always
//! reports verified. Production deployments swap in a
//! real provider (Persona, TransUnion) in
//! [`AppState`](crate::common::AppState) without touching call sites: the
//! authority gate depends on the trait, not the concrete backend.
//!
//! Mirrors the [`MediaStorage`](crate::providers::MediaStorage) abstraction in
//! shape, motivation, and lifecycle. Trait and first (fake) impl share this
//! file; a real provider arrives as a sibling module when it exists.

use std::sync::Arc;

use async_trait::async_trait;
use uuid::Uuid;

/// Errors produced by [`KycProvider`] implementations.
///
/// `#[non_exhaustive]` because a real provider (Persona, `TransUnion`) will
/// surface backend-specific failures (rate limit, document rejected, inquiry
/// expired) that callers may want to branch on without every implementation
/// shimming them through `Transport`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum KycError {
    /// Underlying transport (provider API/SDK) failed. Operator-readable; MUST
    /// NOT be returned verbatim to API clients (it can leak provider details).
    #[error("kyc transport error: {0}")]
    Transport(String),
}

/// Result alias for fallible [`KycProvider`] operations.
pub type KycResult<T> = Result<T, KycError>;

/// Outcome of an identity-verification check.
#[derive(Debug, Clone)]
pub struct KycOutcome {
    /// Whether the subject's identity is verified.
    pub verified: bool,
    /// Provider-side reference (inquiry/case id) for audit, when available.
    pub reference: Option<String>,
}

/// Capability to verify a user's real-world identity (KYC).
///
/// Object-safe (via `#[async_trait]`) so it can live as `Arc<dyn KycProvider>`
/// in [`AppState`](crate::common::AppState) and be shared across handlers
/// without making the state generic over the backend.
#[async_trait]
pub trait KycProvider: Send + Sync {
    /// Verifies the identity of the user with id `user_id`.
    ///
    /// A real provider resolves the user's PII (held by the provider, not us)
    /// from `user_id` and runs its checks; the fake ignores the
    /// argument and always reports verified.
    ///
    /// # Errors
    ///
    /// Returns [`KycError::Transport`] when the backend itself fails (network,
    /// auth). A completed check that returns "not verified" is `Ok` with
    /// `verified = false`, not an error.
    async fn verify_identity(&self, user_id: Uuid) -> KycResult<KycOutcome>;
}

/// Shared, type-erased handle to a [`KycProvider`] implementation.
pub type SharedKycProvider = Arc<dyn KycProvider>;

// -----------------------------------------------------------------------------

/// Stub implementation that always reports verified.
///
/// MUST NOT be installed where a real authority gate is expected to hold - it
/// green-lights every identity. Swap for a real provider (Persona, `TransUnion`)
/// before any production deployment.
#[derive(Debug, Clone, Default)]
pub struct FakeKycProvider;

impl FakeKycProvider {
    /// Constructs the fake provider.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl KycProvider for FakeKycProvider {
    #[inline]
    async fn verify_identity(&self, user_id: Uuid) -> KycResult<KycOutcome> {
        tracing::info!(
            event = "kyc_verify_stub",
            user_id = %user_id,
            "Identity auto-verified (no real KYC provider configured)"
        );
        Ok(KycOutcome {
            verified: true,
            reference: Some(format!("fake-kyc-{user_id}")),
        })
    }
}
