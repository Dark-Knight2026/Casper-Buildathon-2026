//! Router configuration for authentication endpoints.
//!
//! Aggregates every `/auth/*` handler into a single `OpenApiRouter` so the
//! top-level `public_router` only references a single auth entry point.
//! Adding a new auth handler (e.g. password/OAuth flows) is a one-line change
//! here rather than a cross-file edit in `services/mod.rs`.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    common::AppState,
    services::auth::{logout, refresh, sessions, verify, wallet},
};

// `/api/v1/auth/...`
//
/// Builds the auth `OpenApiRouter`.
///
/// Returned router has no rate-limiter or middleware applied; the caller
/// (`public_router`) wraps it with the auth-tier `GovernorLayer`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(wallet::get_nonce))
        .routes(routes!(wallet::login))
        .routes(routes!(refresh::rotate))
        .routes(routes!(logout::logout))
        .routes(routes!(sessions::get_sessions))
        .routes(routes!(sessions::revoke_session))
        .routes(routes!(sessions::revoke_all_sessions))
        .routes(routes!(verify::send_verify_email))
        .routes(routes!(verify::confirm_verify_email))
}
