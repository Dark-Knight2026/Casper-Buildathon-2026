//! Router configuration for lease-agreement endpoints.
//!
//! Every lease endpoint is authenticated (no public reads), so this router is
//! `.merge()`d into the protected router (blanket `require_auth`); handlers add
//! `RoleUser`/ownership checks and declare full `/leases...` paths.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::leases::handlers};

// `/api/v1/leases/...`
/// Builds the leases `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::create_lease))
        .routes(routes!(handlers::get_lease))
}
