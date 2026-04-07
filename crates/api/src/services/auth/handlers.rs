//! HTTP request handlers for authentication.

use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{Query, State},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use rand::{RngExt, distr::Alphanumeric};
use secrecy::ExposeSecret;
use sha2::{Digest, Sha256};

use crate::{
    common::{
        self, ApiError, ApiResult, AppState, CASPER_ED25519_PUBKEY_HEX_LEN,
        CASPER_SECP256K1_PUBKEY_HEX_LEN, Claims, JWT_AUDIENCE, JWT_ISSUER, UserRole,
    },
    services::auth::{
        self,
        models::{LoginRequest, LoginResponse, NonceRequest, NonceResponse, UserInfo},
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
    // a retry. Mitigation: rate-limit failed login attempts per wallet address.
    // xxx: add per-wallet rate-limit on failed logins to cap nonce-DoS impact
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

    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .ok_or_else(|| {
            ApiError::Internal("Timestamp overflow calculating JWT expiration".to_owned())
        })?
        .timestamp();

    // Safe conversion: timestamp is always positive for dates after 1970,
    // and JWT expiration within 24 hours fits in usize on all platforms
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let exp = usize::try_from(expiration.max(0))
        .map_err(|_| ApiError::Internal("JWT expiration timestamp overflow".to_owned()))?;

    let claims = Claims {
        sub: user_record.id,
        role: user_role.clone(),
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
    };

    let secret = state.config.jwt_secret.expose_secret();

    let token = jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| ApiError::Internal(format!("Token encoding error: {e}")))?;

    tracing::info!(
        event = "user_login",
        user_id = %user_record.id,
        wallet_address = %wallet_address,
        "User logged in successfully"
    );

    Ok(Json(LoginResponse {
        token,
        user: UserInfo {
            id: user_record.id,
            role: user_role,
        },
    }))
}
