//! Verification- and role-gating extractors layered over [`AuthUser`].
//!
//! These let a handler state its authorization requirement in its own
//! signature - `VerifiedUser<EmailVerified>` or `RoleUser<AdminRole>` - rather
//! than re-checking `claims` by hand. The gate is encoded at the type level via
//! zero-sized marker types and a compile-time `const`, so there is no runtime
//! configuration and no per-handler branch to forget.
//!
//! # Cost
//!
//! Both extractors delegate to [`AuthUser::from_request_parts`], which under the
//! `require_auth` middleware short-circuits on the cached `AuthUser` stashed in
//! request extensions. The added gate is therefore a `Claims` clone plus one
//! comparison - it does not re-run the JWT decode or the Redis/DB auth lookups.
//!
//! # Marker types, not const generics
//!
//! `adt_const_params` (passing an enum value as a generic argument) is still
//! nightly, so the requirement is carried by a marker type implementing
//! [`VerificationMarker`] / [`RoleMarker`], each exposing the threshold as an
//! associated `const`.

use core::marker::PhantomData;
use std::sync::Arc;

use axum::{
    Json,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use thiserror::Error;

use crate::{
    common::{AppState, Claims, UserRole, VerificationLevel},
    services::auth::{
        AuthError, AuthUser,
        models::{RoleRequiredResponse, VerificationRequiredResponse},
    },
};

/// Marker selecting the minimum [`VerificationLevel`] an endpoint requires.
///
/// Implemented by zero-sized types ([`EmailVerified`], [`IdentityVerified`]) so
/// `VerifiedUser<EmailVerified>` reads as the gate in a handler signature.
pub trait VerificationMarker {
    /// Lowest level that satisfies the gate; the user's level must be `>=` this.
    const MIN_LEVEL: VerificationLevel;
}

/// Requires the caller's `verification_level` to be at least `email`.
#[derive(Debug)]
pub struct EmailVerified;

/// Requires the caller's `verification_level` to be at least `identity`.
///
/// Wired now (ahead of use) so the KYC work in PR #13 gates on it without
/// touching this module.
#[derive(Debug)]
pub struct IdentityVerified;

impl VerificationMarker for EmailVerified {
    const MIN_LEVEL: VerificationLevel = VerificationLevel::Email;
}

impl VerificationMarker for IdentityVerified {
    const MIN_LEVEL: VerificationLevel = VerificationLevel::Identity;
}

/// Marker selecting the exact [`UserRole`] an endpoint requires.
pub trait RoleMarker {
    /// The role the caller must have; the check is exact equality.
    const ROLE: UserRole;
}

/// Requires the caller to be an `admin`.
#[derive(Debug)]
pub struct AdminRole;

/// Requires the caller to be a `landlord`.
#[derive(Debug)]
pub struct LandlordRole;

/// Requires the caller to be a `tenant`.
#[derive(Debug)]
pub struct TenantRole;

/// Requires the caller to be an `agent`.
#[derive(Debug)]
pub struct AgentRole;

impl RoleMarker for AdminRole {
    const ROLE: UserRole = UserRole::Admin;
}

impl RoleMarker for LandlordRole {
    const ROLE: UserRole = UserRole::Landlord;
}

impl RoleMarker for TenantRole {
    const ROLE: UserRole = UserRole::Tenant;
}

impl RoleMarker for AgentRole {
    const ROLE: UserRole = UserRole::Agent;
}

/// Authenticated user proven to meet the verification gate `V`.
///
/// The inner [`Claims`] is public so handlers read `user.0.sub` exactly as they
/// do with [`AuthUser`]; the `PhantomData` carries the gate type with no runtime
/// footprint.
#[derive(Debug)]
pub struct VerifiedUser<V: VerificationMarker>(pub Claims, PhantomData<V>);

/// Authenticated user proven to hold the role required by `R`.
#[derive(Debug)]
pub struct RoleUser<R: RoleMarker>(pub Claims, PhantomData<R>);

impl<V> FromRequestParts<Arc<AppState>> for VerifiedUser<V>
where
    V: VerificationMarker,
{
    type Rejection = AuthGateError;

    #[inline]
    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;
        // A legacy token without a level claim is treated as ungated (M1): the
        // user re-logs in and gets a level-bearing token rather than us hitting
        // the DB on every gated request.
        let level = claims
            .verification_level
            .ok_or(AuthGateError::VerificationRequired {
                required: V::MIN_LEVEL,
            })?;
        if level < V::MIN_LEVEL {
            return Err(AuthGateError::VerificationRequired {
                required: V::MIN_LEVEL,
            });
        }
        Ok(Self(claims, PhantomData))
    }
}

impl<R: RoleMarker> FromRequestParts<Arc<AppState>> for RoleUser<R> {
    type Rejection = AuthGateError;

    #[inline]
    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let AuthUser(claims) = AuthUser::from_request_parts(parts, state).await?;
        if claims.role != R::ROLE {
            return Err(AuthGateError::RoleRequired { required: R::ROLE });
        }
        Ok(Self(claims, PhantomData))
    }
}

/// Rejection produced by [`VerifiedUser`] / [`RoleUser`].
///
/// Authentication failures defer to [`AuthError`] (so a missing or invalid
/// token still surfaces as `401 invalid_token`); the gate-specific variants are
/// the new `403`s carrying the unmet requirement back to the client.
#[derive(Debug, Error)]
pub enum AuthGateError {
    /// Authentication itself failed - delegated to [`AuthError`]'s response.
    #[error(transparent)]
    Auth(#[from] AuthError),
    /// Caller is authenticated but below the required verification level.
    #[error("verification level `{required}` required")]
    VerificationRequired {
        /// The level the endpoint demands.
        required: VerificationLevel,
    },
    /// Caller is authenticated but does not hold the required role.
    #[error("role `{required}` required")]
    RoleRequired {
        /// The role the endpoint demands.
        required: UserRole,
    },
}

impl IntoResponse for AuthGateError {
    #[inline]
    fn into_response(self) -> Response {
        match self {
            Self::Auth(err) => err.into_response(),
            Self::VerificationRequired { required } => (
                StatusCode::FORBIDDEN,
                Json(VerificationRequiredResponse {
                    error: "verification_required".to_owned(),
                    required_level: required,
                }),
            )
                .into_response(),
            Self::RoleRequired { required } => (
                StatusCode::FORBIDDEN,
                Json(RoleRequiredResponse {
                    error: "role_required".to_owned(),
                    required_role: required,
                }),
            )
                .into_response(),
        }
    }
}
