//! Lease-document rendering abstraction.
//!
//! Defines the [`LeaseDocumentRenderer`] capability and a
//! [`SimpleLeaseDocumentRenderer`] that renders the lease terms and clauses into
//! a deterministic plain-text document. A real renderer
//! (templated PDF, headless browser, external service) arrives as a sibling
//! module later; `/leases/{id}/document` depends on the trait, not the concrete
//! backend.
//!
//! Mirrors the [`KycProvider`](crate::providers::KycProvider) abstraction in
//! shape, motivation, and lifecycle. The renderer takes its own
//! [`LeaseDocumentData`] (not a domain row), so this module does not depend on
//! `services::leases`; the handler maps the lease into it.

use std::sync::Arc;

use async_trait::async_trait;
use chrono::NaiveDate;
use serde_json::Value;
use uuid::Uuid;

use crate::common::LeaseType;

/// Errors produced by [`LeaseDocumentRenderer`] implementations.
///
/// `#[non_exhaustive]` because a real renderer (PDF engine, external service)
/// will surface backend-specific failures (template error, timeout) that callers
/// may want to branch on without shimming them all through `Render`.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum LeaseDocumentError {
    /// The document could not be rendered. Operator-readable.
    #[error("lease document render error: {0}")]
    Render(String),
}

/// Result alias for fallible [`LeaseDocumentRenderer`] operations.
pub type LeaseDocumentResult<T> = Result<T, LeaseDocumentError>;

/// The lease terms a renderer needs to produce a document.
///
/// Owned by the provider layer (not `services::leases`) so the renderer stays
/// independent of the domain row; the handler maps a lease into this.
#[derive(Debug, Clone)]
pub struct LeaseDocumentData {
    /// Lease id.
    pub lease_id: Uuid,
    /// Landlord user id.
    pub landlord_id: Uuid,
    /// Tenant user ids.
    pub tenant_ids: Vec<Uuid>,
    /// Lease type.
    pub lease_type: LeaseType,
    /// Start date.
    pub start_date: NaiveDate,
    /// End date.
    pub end_date: NaiveDate,
    /// Monthly rent.
    pub monthly_rent: f64,
    /// Security deposit.
    pub security_deposit: f64,
    /// Settlement currency.
    pub currency: String,
    /// Agreement clauses (JSON array of `{title, content, category}`).
    pub clauses: Value,
}

/// Capability to render a lease agreement into a document blob.
///
/// Object-safe (via `#[async_trait]`) so it can live as
/// `Arc<dyn LeaseDocumentRenderer>` in [`AppState`](crate::common::AppState) and
/// be shared across handlers without making the state generic over the backend.
#[async_trait]
pub trait LeaseDocumentRenderer: Send + Sync {
    /// Renders `data` into a document, returning the raw bytes.
    ///
    /// # Errors
    ///
    /// Returns [`LeaseDocumentError::Render`] when the backend fails to produce
    /// the document.
    async fn render(&self, data: &LeaseDocumentData) -> LeaseDocumentResult<Vec<u8>>;
}

/// Shared, type-erased handle to a [`LeaseDocumentRenderer`] implementation.
pub type SharedLeaseDocumentRenderer = Arc<dyn LeaseDocumentRenderer>;

// -----------------------------------------------------------------------------

/// Stub implementation that renders a deterministic plain-text document.
///
/// Not a real legal document - a stable, human-readable rendering of the terms
/// and clauses whose bytes are deterministic (so the SHA-256 `documentHash` is
/// reproducible). Swap for a real templated-PDF renderer before production.
#[derive(Debug, Clone, Default)]
pub struct SimpleLeaseDocumentRenderer;

impl SimpleLeaseDocumentRenderer {
    /// Constructs the simple renderer.
    #[inline]
    #[must_use]
    pub const fn new() -> Self {
        Self
    }
}

#[async_trait]
impl LeaseDocumentRenderer for SimpleLeaseDocumentRenderer {
    #[inline]
    async fn render(&self, data: &LeaseDocumentData) -> LeaseDocumentResult<Vec<u8>> {
        use core::fmt::Write as _;

        let tenants = data
            .tenant_ids
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<_>>()
            .join(", ");

        let mut doc = String::new();
        // Each `write!` to a `String` is infallible, so the `Result` is ignored.
        let _ = write!(
            doc,
            "LEASE AGREEMENT\n\
             ===============\n\
             Lease ID: {id}\n\
             Landlord: {landlord}\n\
             Tenant(s): {tenants}\n\
             Type: {kind}\n\
             Term: {start} to {end}\n\
             Monthly Rent: {rent} {currency}\n\
             Security Deposit: {deposit} {currency}\n",
            id = data.lease_id,
            landlord = data.landlord_id,
            kind = data.lease_type,
            start = data.start_date,
            end = data.end_date,
            rent = data.monthly_rent,
            deposit = data.security_deposit,
            currency = data.currency.as_str(),
        );

        if let Some(clauses) = data.clauses.as_array().filter(|list| !list.is_empty()) {
            doc.push_str("\nClauses:\n");
            for clause in clauses {
                let title = clause.get("title").and_then(Value::as_str).unwrap_or("");
                let content = clause.get("content").and_then(Value::as_str).unwrap_or("");
                let _ = writeln!(doc, "- {title}: {content}");
            }
        }

        Ok(doc.into_bytes())
    }
}
