//! Tenant background-check abstraction.
//!
//! Defines the [`BackgroundCheckProvider`] capability and a
//! [`FakeBackgroundCheckProvider`] that auto-clears every check. Production deployments swap in a real bureau (TransUnion,
//! Checkr) in [`AppState`](crate::common::AppState) without touching call
//! sites: handlers depend on the trait, not the concrete backend.
//!
//! Mirrors the [`KycProvider`](crate::providers::KycProvider) abstraction in
//! shape, motivation, and lifecycle. Trait and first (fake) impl share this
//! file; a real provider arrives as a sibling module when it exists.

use std::sync::Arc;

use async_trait::async_trait;
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::{Display, EnumString};
use utoipa::ToSchema;

/// The kind of background check to run on an applicant.
///
/// Stored as TEXT (CHECK) in the DB and carried on the wire; parsed at the
/// model boundary like the other `strum` enums.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum BackgroundCheckType {
    /// Credit history and score.
    Credit,
    /// Criminal record.
    Criminal,
    /// Prior eviction record.
    Eviction,
}

/// Lifecycle of a single background check. A real bureau returns `Pending`
/// first and resolves later; the fake completes synchronously.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum BackgroundCheckStatus {
    /// Requested, awaiting the bureau's result.
    Pending,
    /// Finished; `result` holds the report.
    Completed,
    /// The bureau could not complete the check.
    Failed,
}

/// Errors produced by [`BackgroundCheckProvider`] implementations.
///
/// `#[non_exhaustive]` because a real bureau (`TransUnion`, Checkr) will
/// surface backend-specific failures (rate limit, subject not found, consent
/// expired) that callers may want to branch on without shimming them through
/// `Transport`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum BackgroundCheckError {
    /// Underlying transport (bureau API/SDK) failed. Operator-readable; MUST
    /// NOT be returned verbatim to API clients (it can leak bureau details).
    #[error("background check transport error: {0}")]
    Transport(String),
}

/// Result alias for fallible [`BackgroundCheckProvider`] operations.
pub type BackgroundCheckResult<T> = Result<T, BackgroundCheckError>;

/// The applicant a check runs against. A real bureau resolves its own records
/// from this PII; the fake ignores it.
#[derive(Debug, Clone)]
pub struct CheckSubject {
    /// Applicant's full legal name.
    pub full_name: String,
    /// Applicant's date of birth.
    pub date_of_birth: NaiveDate,
}

/// Outcome of a completed (or failed) background check.
#[derive(Debug, Clone)]
pub struct CheckOutcome {
    /// Terminal status the run reached.
    pub status: BackgroundCheckStatus,
    /// The bureau's report, shape depending on the check type.
    pub result: Value,
    /// Bureau-side reference (inquiry/case id) for audit, when available.
    pub reference: Option<String>,
}

/// Capability to run a tenant background check.
///
/// Object-safe (via `#[async_trait]`) so it can live as
/// `Arc<dyn BackgroundCheckProvider>` in
/// [`AppState`](crate::common::AppState) and be shared across handlers without
/// making the state generic over the backend.
#[async_trait]
pub trait BackgroundCheckProvider: Send + Sync {
    /// Runs a `check_type` check against `subject`.
    ///
    /// # Errors
    ///
    /// Returns [`BackgroundCheckError::Transport`] when the backend itself
    /// fails (network, auth). A finished check with adverse findings is `Ok`
    /// with `status = Completed` and the findings in `result`, not an error.
    async fn run_check(
        &self,
        check_type: BackgroundCheckType,
        subject: &CheckSubject,
    ) -> BackgroundCheckResult<CheckOutcome>;
}

/// Shared, type-erased handle to a [`BackgroundCheckProvider`] implementation.
pub type SharedBackgroundCheckProvider = Arc<dyn BackgroundCheckProvider>;

// -----------------------------------------------------------------------------

/// Stub implementation that auto-clears every check synchronously.
///
/// MUST NOT be installed where a real screening decision is expected - it
/// reports a clean report for everyone. Swap for a real bureau (`TransUnion`,
/// Checkr) before any production deployment.
#[derive(Debug, Clone, Default)]
pub struct FakeBackgroundCheckProvider;

impl FakeBackgroundCheckProvider {
    /// Constructs the fake provider.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl BackgroundCheckProvider for FakeBackgroundCheckProvider {
    #[inline]
    async fn run_check(
        &self,
        check_type: BackgroundCheckType,
        _subject: &CheckSubject,
    ) -> BackgroundCheckResult<CheckOutcome> {
        tracing::info!(
            event = "background_check_stub",
            check_type = %check_type,
            "Background check auto-cleared (no real provider configured)"
        );
        Ok(CheckOutcome {
            status: BackgroundCheckStatus::Completed,
            result: serde_json::json!({
                "summary": "clear",
                "checkType": check_type.to_string(),
            }),
            reference: Some(format!("fake-bgcheck-{check_type}")),
        })
    }
}
