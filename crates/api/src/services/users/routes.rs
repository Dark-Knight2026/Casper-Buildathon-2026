//! Router configuration for user-profile endpoints.
//!
//! Aggregates every users handler into a single `OpenApiRouter` so the
//! top-level `protected_router` only references one users entry point.
//! Adding a new users handler (e.g. `PATCH /me`, email-change flow) is a
//! one-line change here rather than a cross-file edit in `services/mod.rs`.
//!
//! Path prefix `/users` is NOT repeated in the handlers' `#[utoipa::path]`;
//! it is added once via `.nest("/users", ...)` in `services::protected_router`,
//! so handlers below mount as e.g. `path = "/me"` -> `/api/v1/users/me`.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::users::handlers};

// `/api/v1/users/...`
//
/// Builds the users `OpenApiRouter`.
///
/// Returned router has no auth or rate-limiter middleware applied; the caller
/// (`protected_router`) wraps it with the protected-tier `GovernorLayer`, the
/// `require_auth` middleware, and the `/users` path prefix via `.nest()`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(
            handlers::get_me,
            handlers::patch_me,
            handlers::delete_me
        ))
        .routes(routes!(handlers::request_email_change))
        .routes(routes!(handlers::confirm_email_change))
        .routes(routes!(handlers::upload_avatar))
        .routes(routes!(handlers::patch_me_role))
}
