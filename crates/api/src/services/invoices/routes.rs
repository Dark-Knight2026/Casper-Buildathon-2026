//! Router configuration for invoice endpoints.
//!
//! Every invoice endpoint is authenticated and party-scoped (no public reads),
//! so this router is `.merge()`d into the protected router (blanket
//! `require_auth`); handlers resolve the caller and declare full `/invoices...`
//! paths.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::invoices::handlers};

// `/api/v1/invoices/...`
/// Builds the invoices `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::list_invoices))
        .routes(routes!(handlers::get_invoice))
        .routes(routes!(handlers::settle_invoice))
        .routes(routes!(handlers::get_receipt))
}
