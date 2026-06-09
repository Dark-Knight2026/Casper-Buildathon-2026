//! Wallet-based authentication: nonce generation and signature login.

use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{Query, State},
};
use axum_extra::extract::CookieJar;
use rand::{RngExt, distr::Alphanumeric};
use secrecy::{ExposeSecret, SecretString};
use sha2::{Digest, Sha256};

use crate::{
    common::{self, ApiError, ApiResult, AppState, UserInfo, UserRole},
    services::{
        auth::{
            self, cookies,
            db::UserRecord,
            jwt,
            models::{LoginRequest, LoginResponse, NonceRequest, NonceResponse},
            refresh,
        },
        users,
    },
};

// `GET /api/v1/auth/nonce`
//
/// Generates a cryptographic nonce for login challenge-response.
///
/// The nonce is securely stored in Redis with a short expiration time (5 minutes).
/// The user must sign the generated message using their wallet's private key to authenticate.
///
/// # Arguments
///
/// * `state` - The application state containing the Redis connection.
/// * `payload` - Query parameters containing the user's wallet address.
///
/// # Returns
///
/// * `Ok(Json<NonceResponse>)` - JSON containing the nonce and the message to sign.
///
/// # Errors
///
/// Returns `ApiError::Internal` if Redis operations fail.
#[utoipa::path(
  get,
  path = "/nonce",
  tag = "Auth",
  params(
        ("wallet_address" = String, Query, description = "The wallet address (public key)")),
  responses(
        (status = 200, description = "Nonce generated successfully", body = NonceResponse),
        (status = 400, description = "Invalid wallet address length"),
        (status = 500, description = "Internal server error")
    )
)]
#[inline]
pub async fn get_nonce(
    State(state): State<Arc<AppState>>,
    Query(payload): Query<NonceRequest>,
) -> ApiResult<Json<NonceResponse>> {
    let wallet = payload.wallet_address.to_ascii_lowercase();
    common::validate_wallet_address(&wallet)?;

    // Generate a random string (16 characters)
    let random_string: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    // Create a message that the user will sign
    let message = format!("Sign this message to login to LeaseFi. Nonce: {random_string}");

    // Store nonce in Redis (key uses lowercase address for case-insensitive lookup)
    state
        .redis
        .save_nonce(&wallet, &message)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to save nonce");
            ApiError::Internal(format!("Failed to save nonce: {e}"))
        })?;

    tracing::info!(
        event = "nonce_generated",
        wallet_address = %wallet,
        "Login nonce generated"
    );

    Ok(Json(NonceResponse {
        nonce: random_string,
        message,
    }))
}

/// Per-wallet rate-limit gate: rejects with 429 if too many recent failed
/// login attempts, blunting nonce-DoS probing.
async fn ensure_not_rate_limited(state: &AppState, wallet: &str) -> ApiResult<()> {
    if state
        .redis
        .is_login_rate_limited(wallet)
        .await
        .unwrap_or(false)
    {
        tracing::warn!(
            event = "login_rate_limited",
            wallet_address = %wallet,
            "Too many failed login attempts"
        );
        return Err(ApiError::TooManyRequests(
            "Too many failed login attempts, try again later".to_owned(),
        ));
    }
    Ok(())
}

/// Atomically consumes the nonce via GETDEL (one-time use, no TOCTOU
/// window). On miss, records a login failure so an attacker probing
/// `/auth/login/wallet` without ever paying for `/auth/nonce` still trips the
/// per-wallet rate-limit gate.
///
/// Threat-model tradeoff: consuming the nonce before signature
/// verification means an attacker who knows a wallet address can call
/// `/auth/login/wallet` with a garbage signature to invalidate the legitimate
/// user's nonce. We accept this: TOCTOU elimination is more critical
/// than the nonce-invalidation vector, because TOCTOU allows actual
/// replay attacks while nonce-DoS only causes a retry.
async fn consume_nonce_or_fail(state: &AppState, wallet: &str) -> ApiResult<String> {
    let Some(stored_nonce) = state.redis.take_nonce(wallet).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to get nonce");
        ApiError::Internal(format!("Failed to get nonce: {e}"))
    })?
    else {
        let _ = state.redis.record_login_failure(wallet).await;
        tracing::warn!(
            event = "login_failed",
            reason = "nonce_expired",
            wallet_address = %wallet,
            "Nonce not found or expired"
        );
        return Err(ApiError::Unauthorized(
            "Nonce not found or expired".to_owned(),
        ));
    };
    Ok(stored_nonce)
}

/// Verifies the Casper signature against the consumed nonce. Records a
/// rate-limit failure on signature mismatch (best-effort) so brute-force
/// attempts trip the wallet-level rate-limit gate.
async fn verify_signature_or_fail(
    state: &AppState,
    wallet: &str,
    signature: &SecretString,
    nonce: &str,
) -> ApiResult<()> {
    let is_valid = common::verify_casper_signature(wallet, signature.expose_secret(), nonce)
        .map_err(|e| {
            tracing::warn!(
                event = "login_failed",
                reason = "invalid_signature_format",
                wallet_address = %wallet,
                error = ?e,
                "Signature verification error"
            );
            ApiError::BadRequest("Invalid signature format".to_owned())
        })?;

    if !is_valid {
        let _ = state.redis.record_login_failure(wallet).await;
        tracing::warn!(
            event = "login_failed",
            reason = "signature_mismatch",
            wallet_address = %wallet,
            "Signature verification failed"
        );
        return Err(ApiError::Unauthorized("Invalid signature".to_owned()));
    }
    Ok(())
}

/// Enforces the self-registration role whitelist. `None` defaults to
/// `Tenant`. Privileged roles (admin, etc.) fail fast with 400 rather
/// than being silently dropped on conflict in the upsert path.
fn validate_self_registration_role(role: Option<UserRole>, wallet: &str) -> ApiResult<UserRole> {
    let requested = role.unwrap_or(UserRole::Tenant);
    if !requested.is_self_registerable() {
        tracing::warn!(
            event = "login_failed",
            reason = "invalid_role",
            wallet_address = %wallet,
            role = %requested,
            "Role not allowed for self-registration"
        );
        return Err(ApiError::BadRequest(
            "Role not allowed for self-registration".to_owned(),
        ));
    }
    Ok(requested)
}

/// Resolves the user record via the wallet upsert. The `NotActive` arm
/// rejects wallets linked to non-`active` users (suspended / inactive /
/// pending) with 403: tokens must NOT be issued in that case, otherwise
/// the 15-minute access window becomes the blast radius of any later
/// status downgrade if the gate is missed.
async fn resolve_active_user(
    state: &AppState,
    email: &str,
    wallet: &str,
    role: UserRole,
) -> ApiResult<UserRecord> {
    match auth::upsert_user_by_wallet(&state.db, email, wallet, role).await? {
        auth::UpsertOutcome::Resolved(record) => Ok(record),
        auth::UpsertOutcome::NotActive => {
            tracing::warn!(
                event = "login_failed",
                reason = "user_not_active",
                wallet_address = %wallet,
                "User exists but status is not active"
            );
            Err(ApiError::Forbidden("Account is not active".to_owned()))
        }
    }
}

// `POST /api/v1/auth/login/wallet`
//
/// Authenticates a user by verifying their signature against a stored nonce.
///
/// 1. Retrieves the previously generated nonce from Redis using the wallet address.
/// 2. Verifies the provided signature against the stored message and public key.
/// 3. If valid, creates or updates the user record in the database.
/// 4. Mints a short-lived access JWT and an opaque refresh token.
/// 5. Returns both via `Set-Cookie` (HttpOnly+SameSite=Strict), and a
///    body containing only the user profile.
///
/// # Arguments
///
/// * `state` - The application state.
/// * `payload` - JSON payload containing the wallet address and signature.
///
/// # Returns
///
/// `(CookieJar, Json<LoginResponse>)` - jar carries `access_token`
/// (Path=/, Max-Age=15m) and `refresh_token` (Path=/api/v1/auth,
/// Max-Age=14d) cookies; body has user info only.
///
/// # Errors
///
/// Returns:
/// - `ApiError::BadRequest` if wallet address length is invalid or signature format is wrong
/// - `ApiError::Unauthorized` if signature or nonce is invalid
/// - `ApiError::Internal` for DB/Redis failures or timestamp overflow
#[utoipa::path(
    post,
    path = "/login/wallet",
    tag = "Auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 400, description = "Invalid wallet address or signature format"),
        (status = 401, description = "Invalid signature or expired nonce"),
        (status = 500, description = "Internal server error")
    )
)]
#[inline]
pub async fn login_wallet(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    let wallet_address = payload.wallet_address.to_ascii_lowercase();

    common::validate_wallet_address(&wallet_address)?;
    ensure_not_rate_limited(&state, &wallet_address).await?;
    let stored_nonce = consume_nonce_or_fail(&state, &wallet_address).await?;
    verify_signature_or_fail(&state, &wallet_address, &payload.signature, &stored_nonce).await?;
    let role = validate_self_registration_role(payload.role.clone(), &wallet_address)?;

    // Synthesize a placeholder email because `users.email` is NOT NULL in
    // schema. SHA-256 over the address keeps it collision-free; truncating
    // to 20 bytes (40 hex) keeps the local-part within the 64-char
    // RFC 5321 cap with room to spare for the `wallet_` prefix.
    let hash = Sha256::digest(wallet_address.as_bytes());
    let placeholder_email = format!("wallet_{}@leasefi.local", hex::encode(&hash[..20]));

    let user_record =
        resolve_active_user(&state, &placeholder_email, &wallet_address, role).await?;
    let user_role = UserRole::from_str(&user_record.role).unwrap_or(UserRole::Unknown);

    let encoded = jwt::encode_access_token(
        user_record.id,
        user_role,
        user_record.verification_level,
        &state.config.jwt_secret,
    )?;
    let issued_refresh = refresh::issue_login_refresh_token(&state.db, user_record.id).await?;
    // upsert_user_by_wallet returns only id/role/verification; the public
    // response body needs joined `active_leases_count` and the cached
    // wallet_address that the post-upsert trigger fills in, so reload
    // the full profile here.
    let profile = users::fetch_user_profile(&state.db, user_record.id).await?;

    let jar = cookies::build_session_cookies(
        encoded.token,
        issued_refresh.plaintext,
        state.config.cookie_secure,
    );

    tracing::info!(
        event = "user_login",
        user_id = %user_record.id,
        wallet_address = %wallet_address,
        refresh_family = %issued_refresh.family_id,
        "User logged in successfully"
    );

    Ok((
        jar,
        Json(LoginResponse {
            user: UserInfo::from(profile),
        }),
    ))
}
