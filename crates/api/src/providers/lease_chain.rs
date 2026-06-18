//! On-chain Lease-contract read abstraction (off->on reconciliation).
//!
//! Defines the [`LeaseChainReader`] capability and a [`FakeLeaseChainReader`]
//! that treats the landlord's submitted commit params as consistent, used for
//! the hackathon. A real CSPR RPC reader (querying the `Lease` and `Escrow`
//! contracts) arrives as a sibling module later; `/commit` depends on the trait,
//! not the concrete backend.
//!
//! Mirrors the [`KycProvider`](crate::providers::KycProvider) abstraction in
//! shape, motivation, and lifecycle. Trait and first (fake) impl share this
//! file; a real reader becomes a sibling module when it exists.

use std::sync::Arc;

use async_trait::async_trait;

/// Errors produced by [`LeaseChainReader`] implementations.
///
/// `#[non_exhaustive]` because a real CSPR RPC reader will surface
/// backend-specific failures (node unavailable, malformed `CLValue`) that
/// callers may want to branch on without shimming them all through `Transport`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum LeaseChainError {
    /// Underlying transport (Casper RPC) failed. Operator-readable; MUST NOT be
    /// returned verbatim to API clients (it can leak node details).
    #[error("lease chain transport error: {0}")]
    Transport(String),
    /// No lease agreement exists on-chain for the requested id (the contract
    /// reverts `InvalidLeaseAgreementId`).
    #[error("lease agreement {0} not found on-chain")]
    NotFound(String),
}

/// Result alias for fallible [`LeaseChainReader`] operations.
pub type LeaseChainResult<T> = Result<T, LeaseChainError>;

/// On-chain view of a lease agreement, reduced to the fields `/commit`
/// reconciles against.
///
/// The full contract `LeaseAgreement` carries ten fields; only these two drive
/// backend reconciliation, so the rest are intentionally not mirrored (the
/// off-chain terms were already validated at create time).
#[derive(Debug, Clone)]
pub struct OnchainLeaseAgreement {
    /// Frozen lease NFT token id (U256 as a decimal string).
    ///
    /// Minted inside `create_lease_agreement` and never carried by the
    /// `LeaseAgreementCreated` event, so reading the agreement back is the only
    /// way the backend learns it.
    pub token_id: String,
    /// Whether the agreement is already finalised on-chain (guards against
    /// activating a lease the contract has since finished).
    pub is_finished: bool,
}

/// Capability to read `Lease`-contract state for off->on reconciliation.
///
/// Object-safe (via `#[async_trait]`) so it can live as
/// `Arc<dyn LeaseChainReader>` in [`AppState`](crate::common::AppState) and be
/// shared across handlers without making the state generic over the backend.
/// All ids are U256 decimal strings, matching `leases.onchain_lease_id`.
#[async_trait]
pub trait LeaseChainReader: Send + Sync {
    /// Reads the on-chain agreement bound to `onchain_lease_id`.
    ///
    /// # Errors
    ///
    /// Returns [`LeaseChainError::NotFound`] when no agreement has that id, or
    /// [`LeaseChainError::Transport`] when the backend itself fails.
    async fn get_lease_agreement_by_id(
        &self,
        onchain_lease_id: &str,
    ) -> LeaseChainResult<OnchainLeaseAgreement>;

    /// Whether the agreement's security-deposit invoice is paid.
    ///
    /// # Errors
    ///
    /// Returns [`LeaseChainError`] when the backend fails or the id is unknown.
    async fn is_security_deposit_paid(&self, onchain_lease_id: &str) -> LeaseChainResult<bool>;

    /// Whether every invoice on the agreement is paid.
    ///
    /// # Errors
    ///
    /// Returns [`LeaseChainError`] when the backend fails or the id is unknown.
    async fn is_all_invoices_paid(&self, onchain_lease_id: &str) -> LeaseChainResult<bool>;
}

/// Shared, type-erased handle to a [`LeaseChainReader`] implementation.
pub type SharedLeaseChainReader = Arc<dyn LeaseChainReader>;

// -----------------------------------------------------------------------------

/// Hackathon implementation that treats the submitted commit params as
/// consistent.
///
/// MUST NOT be installed where real reconciliation is expected to hold - it
/// reports every deposit/invoice as paid and never fails a `/commit`. Swap for a
/// real CSPR RPC reader before any production deployment.
#[derive(Debug, Clone, Default)]
pub struct FakeLeaseChainReader;

impl FakeLeaseChainReader {
    /// Constructs the fake reader.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl LeaseChainReader for FakeLeaseChainReader {
    #[inline]
    async fn get_lease_agreement_by_id(
        &self,
        onchain_lease_id: &str,
    ) -> LeaseChainResult<OnchainLeaseAgreement> {
        tracing::info!(
            event = "lease_chain_read_stub",
            onchain_lease_id = %onchain_lease_id,
            "Returning synthetic consistent lease agreement (no real LeaseChainReader configured)"
        );
        // Echo the lease id as the token id: the fake has no real chain state, so
        // it stands in a deterministic, non-finished agreement.
        Ok(OnchainLeaseAgreement {
            token_id: onchain_lease_id.to_owned(),
            is_finished: false,
        })
    }

    #[inline]
    async fn is_security_deposit_paid(&self, _onchain_lease_id: &str) -> LeaseChainResult<bool> {
        Ok(true)
    }

    #[inline]
    async fn is_all_invoices_paid(&self, _onchain_lease_id: &str) -> LeaseChainResult<bool> {
        Ok(true)
    }
}
