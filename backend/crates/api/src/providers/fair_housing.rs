//! Fair Housing advertising-screen abstraction.
//!
//! Defines the [`FairHousingScreen`] capability and a [`StubFairHousingScreen`]
//! that flags a minimal technical blocklist of protected-class phrases. Production deployments swap in the official CO/GC ruleset
//! (ADR §3.2) in [`AppState`](crate::common::AppState) without touching call
//! sites: the listing gate depends on the trait, not the concrete backend.
//!
//! Mirrors the [`KycProvider`](crate::providers::KycProvider) abstraction in
//! shape, motivation, and lifecycle. Trait and first (stub) impl share this
//! file; the real ruleset arrives as a sibling module when delivered.

use std::sync::Arc;

use async_trait::async_trait;

/// Errors produced by [`FairHousingScreen`] implementations.
///
/// `#[non_exhaustive]` because a real ruleset backend may surface
/// service-specific failures (model timeout, ruleset version mismatch) that
/// callers may want to branch on without every implementation shimming them
/// through `Transport`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum FairHousingError {
    /// Underlying transport (ruleset service/API) failed. Operator-readable;
    /// MUST NOT be returned verbatim to API clients.
    #[error("fair housing screen transport error: {0}")]
    Transport(String),
}

/// Result alias for fallible [`FairHousingScreen`] operations.
pub type FairHousingResult<T> = Result<T, FairHousingError>;

/// Outcome of screening a block of listing free-text.
#[derive(Debug, Clone)]
pub struct ScreenOutcome {
    /// Whether the text cleared the screen (no flags).
    pub cleared: bool,
    /// Human-readable reasons the text was flagged, for landlord remediation.
    /// Empty when `cleared`.
    pub flags: Vec<String>,
}

/// Capability to screen listing advertising text for protected-class language.
///
/// Object-safe (via `#[async_trait]`) so it can live as
/// `Arc<dyn FairHousingScreen>` in [`AppState`](crate::common::AppState) and be
/// shared across handlers without making the state generic over the backend.
#[async_trait]
pub trait FairHousingScreen: Send + Sync {
    /// Screens `text` and returns the outcome.
    ///
    /// A flagged result is `Ok` with `cleared = false` and a non-empty
    /// `flags` list - it is a normal screening verdict, not an error.
    ///
    /// # Errors
    ///
    /// Returns [`FairHousingError::Transport`] when the backend itself fails
    /// (network, auth, model unavailable).
    async fn screen(&self, text: &str) -> FairHousingResult<ScreenOutcome>;
}

/// Shared, type-erased handle to a [`FairHousingScreen`] implementation.
pub type SharedFairHousingScreen = Arc<dyn FairHousingScreen>;

// -----------------------------------------------------------------------------

/// Minimal technical blocklist of protected-class phrases.
///
/// Deliberately small and lower-cased: it is a stand-in for the official,
/// CO/GC-reviewed ruleset (ADR §3.2), not a complete Fair Housing engine. Each
/// entry is a coarse proxy for a protected class (familial status, religion,
/// national origin, disability, source of income). Matching is substring +
/// case-insensitive, so it over-flags by design - a real ruleset adds context
/// and word boundaries.
const BLOCKED_PHRASES: &[&str] = &[
    "adults only",
    "no children",
    "no kids",
    "mature couple",
    "christian",
    "muslim",
    "jewish",
    "catholic",
    "english only",
    "no immigrants",
    "able-bodied",
    "no wheelchairs",
    "no section 8",
    "no vouchers",
];

/// Stub implementation that flags the [`BLOCKED_PHRASES`] technical
/// blocklist.
///
/// MUST NOT be relied on as a real compliance control - it is a coarse
/// substring matcher, not the CO/GC ruleset. Swap before production.
#[derive(Debug, Clone, Default)]
pub struct StubFairHousingScreen;

impl StubFairHousingScreen {
    /// Constructs the stub screen.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl FairHousingScreen for StubFairHousingScreen {
    #[inline]
    async fn screen(&self, text: &str) -> FairHousingResult<ScreenOutcome> {
        let haystack = text.to_lowercase();
        let flags = BLOCKED_PHRASES
            .iter()
            .filter(|phrase| haystack.contains(**phrase))
            .map(|phrase| format!("prohibited protected-class language: \"{phrase}\""))
            .collect::<Vec<_>>();
        Ok(ScreenOutcome {
            cleared: flags.is_empty(),
            flags,
        })
    }
}
