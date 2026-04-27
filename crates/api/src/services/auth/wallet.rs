//! Wallet-based authentication: nonce generation and signature login.

use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{Query, State},
};
use rand::{RngExt, distr::Alphanumeric};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use utoipa::ToSchema;

use crate::{
    common::{
        self, ApiError, ApiResult, AppState, CASPER_ED25519_PUBKEY_HEX_LEN,
        CASPER_SECP256K1_PUBKEY_HEX_LEN, UserRole,
    },
    services::auth::{self, jwt, models::UserInfo},
};

/// Request payload for generating a login nonce.
#[derive(Debug, Deserialize, ToSchema)]
pub struct NonceRequest {
    /// The wallet address (public key).
    pub wallet_address: String,
}

/// Response containing the generated nonce.
#[derive(Debug, Serialize, ToSchema)]
pub struct NonceResponse {
    /// A randomly generated string used to prevent replay attacks.
    pub nonce: String,
    /// The full message string that the user must sign with their wallet.
    /// Format: `"Sign this message to log in to LeaseFi. Nonce: <nonce>"`
    pub message: String,
}

/// Request payload for verifying a login signature.
#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    /// The wallet address (public key) of the user.
    pub wallet_address: String,
    /// The cryptographic signature of the nonce message.
    #[schema(value_type = String)]
    pub signature: SecretString,
}

/// Response returned upon successful login.
#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    /// Use this JSON Web Token (JWT) for authenticating subsequent requests.
    pub token: String,
    /// Basic information about the authenticated user.
    pub user: UserInfo,
}

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
    // Validate wallet address length and hex content before touching Redis.
    let wallet = payload.wallet_address.to_ascii_lowercase();
    let len = wallet.len();
    if (len != CASPER_ED25519_PUBKEY_HEX_LEN && len != CASPER_SECP256K1_PUBKEY_HEX_LEN)
        || !wallet.chars().all(|c| c.is_ascii_hexdigit())
    {
        return Err(ApiError::BadRequest("Invalid wallet address".to_owned()));
    }

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

// `GET /api/v1/auth/login`
//
/// Authenticates a user by verifying their signature against a stored nonce.
///
/// 1. Retrieves the previously generated nonce from Redis using the wallet address.
/// 2. Verifies the provided signature against the stored message and public key.
/// 3. If valid, creates or updates the user record in the database.
/// 4. Generates a signed JWT for session management.
///
/// # Arguments
///
/// * `state` - The application state.
/// * `payload` - JSON payload containing the wallet address and signature.
///
/// # Returns
///
/// * `Ok(Json<LoginResponse>)` - JSON containing the JWT and user info.
///
/// # Errors
///
/// Returns:
/// - `ApiError::BadRequest` if wallet address length is invalid or signature format is wrong
/// - `ApiError::Unauthorized` if signature or nonce is invalid
/// - `ApiError::Internal` for DB/Redis failures or timestamp overflow
#[utoipa::path(
    post,
    path = "/login",
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
#[allow(clippy::too_many_lines)]
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<Json<LoginResponse>> {
    // Normalize to lowercase for consistent Redis key lookup.
    let wallet_address = payload.wallet_address.to_ascii_lowercase();

    // Validation: Check wallet address length (Ed25519 or Secp256k1) and hex content.
    let len = wallet_address.len();
    if (len != CASPER_ED25519_PUBKEY_HEX_LEN && len != CASPER_SECP256K1_PUBKEY_HEX_LEN)
        || !wallet_address.chars().all(|c| c.is_ascii_hexdigit())
    {
        tracing::warn!(
            length = len,
            expected_ed25519 = CASPER_ED25519_PUBKEY_HEX_LEN,
            expected_secp256k1 = CASPER_SECP256K1_PUBKEY_HEX_LEN,
            "Invalid wallet address"
        );
        return Err(ApiError::BadRequest("Invalid wallet address".to_owned()));
    }

    // Per-wallet rate limit: reject early if this wallet has too many recent
    // failed login attempts, preventing nonce-DoS attacks.
    if state
        .redis
        .is_login_rate_limited(&wallet_address)
        .await
        .unwrap_or(false)
    {
        tracing::warn!(
            event = "login_rate_limited",
            wallet_address = %wallet_address,
            "Too many failed login attempts"
        );
        return Err(ApiError::TooManyRequests(
            "Too many failed login attempts, try again later".to_owned(),
        ));
    }

    // Atomically consume nonce from Redis (one-time use via GETDEL).
    // This prevents replay attacks and eliminates the TOCTOU race window
    // that existed with separate GET + DEL commands.
    //
    // Threat-model tradeoff: consuming the nonce before signature verification
    // means an attacker who knows a wallet address can call `/auth/login` with
    // a garbage signature to invalidate the legitimate user's nonce. The user
    // must then request a new nonce and retry. This is an accepted trade-off:
    // TOCTOU elimination is more critical than the nonce-invalidation vector,
    // because TOCTOU allows actual replay attacks while nonce-DoS only causes
    // a retry. Mitigation: per-wallet rate limiting on failed logins (above).
    let stored_nonce = state
        .redis
        .take_nonce(&wallet_address)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to get nonce");
            ApiError::Internal(format!("Failed to get nonce: {e}"))
        })?
        .ok_or_else(|| {
            tracing::warn!(
                event = "login_failed",
                reason = "nonce_expired",
                wallet_address = %wallet_address,
                "Nonce not found or expired"
            );
            ApiError::Unauthorized("Nonce not found or expired".to_owned())
        })?;

    // Security: Verify Signature and RETURN ERROR if invalid
    let is_valid = common::verify_casper_signature(
        &wallet_address,
        payload.signature.expose_secret(),
        &stored_nonce,
    )
    .map_err(|e| {
        tracing::warn!(
            event = "login_failed",
            reason = "invalid_signature_format",
            wallet_address = %wallet_address,
            error = ?e,
            "Signature verification error"
        );
        ApiError::BadRequest("Invalid signature format".to_owned())
    })?;

    if !is_valid {
        // Record failure for per-wallet rate limiting (best-effort).
        let _ = state.redis.record_login_failure(&wallet_address).await;
        tracing::warn!(
            event = "login_failed",
            reason = "signature_mismatch",
            wallet_address = %wallet_address,
            "Signature verification failed"
        );
        return Err(ApiError::Unauthorized("Invalid signature".to_owned()));
    }

    // Since the users table requires an email address, we generate a unique one using a hash.
    // Using `SHA-256` hash prevents collisions that could occur with simple address truncation.
    let hash = Sha256::digest(wallet_address.as_bytes());
    let placeholder_email = format!("wallet_{}@leasefi.local", hex::encode(&hash[..20]));

    // If a user with this wallet_address already exists, return it. If not, create a new one.
    let user_record =
        auth::upsert_user_by_wallet(&state.db, &placeholder_email, &wallet_address).await?;
    let user_role = UserRole::from_str(&user_record.role).unwrap_or(UserRole::Unknown);

    let encoded = jwt::encode_access_token(
        user_record.id,
        user_role.clone(),
        user_record.verification_level,
        &state.config.jwt_secret,
    )?;

    tracing::info!(
        event = "user_login",
        user_id = %user_record.id,
        wallet_address = %wallet_address,
        "User logged in successfully"
    );

    // 2.3 transition: only `id` and `role` are populated until 3.2 wires
    // `auth::db::fetch_user_profile` into this handler. Remaining `Option`
    // fields stay `None` and are skipped by serde, so the JSON shape on the
    // wire is unchanged.
    Ok(Json(LoginResponse {
        token: encoded.token,
        user: UserInfo {
            id: user_record.id,
            role: user_role,
            wallet_address: None,
            status: None,
            email: None,
            first_name: None,
            last_name: None,
            phone: None,
            avatar_url: None,
            bio: None,
            is_profile_complete: None,
            active_leases_count: None,
            created_at: None,
            updated_at: None,
        },
    }))
}
