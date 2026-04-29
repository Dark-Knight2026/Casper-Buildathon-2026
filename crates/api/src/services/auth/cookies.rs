//! Auth-cookie names and builders.
//!
//! Centralizes the per-cookie attributes (path, max-age, security flags) so
//! every issuance/clear path uses the same shape. Splitting this out of the
//! handler keeps the route handler focused on policy (when to issue, when to
//! clear) and lets refresh/logout reuse the exact same builders.

use axum_extra::extract::cookie::{Cookie, SameSite};
use time::Duration as CookieDuration;

/// Name of the cookie that carries the access token (short-lived JWT).
pub const ACCESS_TOKEN_COOKIE: &str = "access_token";

/// Name of the cookie that carries the opaque refresh token.
///
/// Scoped to `Path=/api/v1/auth` so the browser only sends it on auth
/// endpoints; protected requests never see it. This narrows the attack
/// surface if a non-auth handler is compromised - the refresh material
/// is simply never present in the request.
pub const REFRESH_TOKEN_COOKIE: &str = "refresh_token";

/// Path scope for the refresh-token cookie. Kept as a constant so refresh
/// (Phase 4.2) and logout (Phase 4.3) clear it on the exact same path -
/// otherwise the browser would not match the cookie for deletion and a stale
/// `refresh_token` would linger.
pub const REFRESH_COOKIE_PATH: &str = "/api/v1/auth";

/// Builds the access-token cookie.
///
/// `secure` is wired from `ServerConfig.cookie_secure` so HTTPS deployments
/// enforce TLS-only delivery while local HTTP dev still receives the cookie.
#[inline]
#[must_use]
pub fn build_access_cookie(
    value: String,
    max_age: CookieDuration,
    secure: bool,
) -> Cookie<'static> {
    Cookie::build((ACCESS_TOKEN_COOKIE, value))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Strict)
        .path("/")
        .max_age(max_age)
        .build()
}

/// Builds the refresh-token cookie.
///
/// Path is narrowed to `/api/v1/auth` so only `/auth/refresh` and
/// `/auth/logout` ever receive the refresh material; tax/analytics handlers
/// do not even have the option of seeing it.
#[inline]
#[must_use]
pub fn build_refresh_cookie(
    value: String,
    max_age: CookieDuration,
    secure: bool,
) -> Cookie<'static> {
    Cookie::build((REFRESH_TOKEN_COOKIE, value))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Strict)
        .path(REFRESH_COOKIE_PATH)
        .max_age(max_age)
        .build()
}

/// Builds an "expired" access-token cookie used by logout to instruct the
/// browser to drop its stored cookie immediately.
///
/// Browsers match the deletion cookie against the original by name + path +
/// domain - if any of those drift, the original lingers. The `Path`,
/// `HttpOnly`, `Secure` and `SameSite` attributes therefore mirror
/// [`build_access_cookie`] exactly; only `Max-Age` flips to `0` and the
/// value becomes empty.
#[inline]
#[must_use]
pub fn build_expired_access_cookie(secure: bool) -> Cookie<'static> {
    Cookie::build((ACCESS_TOKEN_COOKIE, ""))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Strict)
        .path("/")
        .max_age(CookieDuration::seconds(0))
        .build()
}

/// Builds an "expired" refresh-token cookie used by logout. See
/// [`build_expired_access_cookie`] for why every attribute (especially
/// `Path`) must mirror [`build_refresh_cookie`] - otherwise the browser
/// silently keeps the old refresh material.
#[inline]
#[must_use]
pub fn build_expired_refresh_cookie(secure: bool) -> Cookie<'static> {
    Cookie::build((REFRESH_TOKEN_COOKIE, ""))
        .http_only(true)
        .secure(secure)
        .same_site(SameSite::Strict)
        .path(REFRESH_COOKIE_PATH)
        .max_age(CookieDuration::seconds(0))
        .build()
}
