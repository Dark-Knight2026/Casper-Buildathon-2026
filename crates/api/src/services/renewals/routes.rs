//! Router configuration for lease-renewal endpoints.
//!
//! Every renewal endpoint is authenticated (no public reads), so this router is
//! `.merge()`d into the protected router (blanket `require_auth`); handlers add
//! `RoleUser`/party checks and declare full `/renewals...` paths.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::renewals::handlers};

// `/api/v1/renewals/...`
/// Builds the renewals `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::list_renewals))
        .routes(routes!(handlers::create_renewal))
        .routes(routes!(handlers::get_renewal))
}
