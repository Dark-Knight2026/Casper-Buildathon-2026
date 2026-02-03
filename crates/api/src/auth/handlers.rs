//! HTTP request handlers for authentication.

use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use chrono::{Duration, Utc};
use core::str::FromStr;
use jsonwebtoken::{EncodingKey, Header};
use rand::{Rng, distr::Alphanumeric};
use redis::AsyncCommands;
use secrecy::ExposeSecret;
use sha2::{Digest, Sha256};
use std::sync::Arc;

use crate::auth;
use crate::auth::models::{LoginRequest, LoginResponse, NonceRequest, NonceResponse, UserInfo};
use crate::common::{self, AppState, Claims, UserRole};

// --- Constants ---
const LOGIN_NONCE_TTL: u64 = 300;

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
/// Returns `StatusCode::INTERNAL_SERVER_ERROR` if Redis operations fail.
#[utoipa::path(
    get,
    path = "/nonce",
    tag = "Auth",
    params(
        ("wallet_address" = String, Query, description = "The wallet address (public key)")
    ),
    responses(
        (status = 200, description = "Nonce generated successfully", body = NonceResponse),
        (status = 500, description = "Internal server error")
    )
)]
#[inline]
pub async fn get_nonce(
    State(state): State<Arc<AppState>>,
    Query(payload): Query<NonceRequest>,
) -> Result<Json<NonceResponse>, StatusCode> {
    // Generate a random string (16 characters)
    let random_string: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    // Create a message that the user will sign
    let message = format!("Sign this message to login to LeaseFi. Nonce: {random_string}");

    // Store in Redis
    let redis_key = format!("nonce:{}", payload.wallet_address);

    let mut redis_conn = state
        .redis
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Redis connection error");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let _: () = redis_conn
        .set_ex(&redis_key, &message, LOGIN_NONCE_TTL)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to save nonce to Redis");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(NonceResponse {
        nonce: random_string,
        message,
    }))
}

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
/// - `StatusCode::BAD_REQUEST` if wallet address length is invalid or signature format is wrong
/// - `StatusCode::UNAUTHORIZED` if signature or nonce is invalid
/// - `StatusCode::INTERNAL_SERVER_ERROR` for DB/Redis failures or timestamp overflow
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
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    // Validation: Check wallet address length
    let len = payload.wallet_address.len();
    if len != 66 && len != 68 {
        tracing::error!(
            length = len,
            expected = "66 or 68",
            "Invalid wallet address length"
        );
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut redis_conn = state
        .redis
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Redis connection error");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let redis_key = format!("nonce:{}", payload.wallet_address);

    let stored_nonce: String = redis_conn.get(&redis_key).await.map_err(|_| {
        tracing::error!(key = %redis_key, "Nonce not found or expired");
        StatusCode::UNAUTHORIZED
    })?;

    // Security: Verify Signature and RETURN ERROR if invalid
    let is_valid = common::verify_casper_signature(
        &payload.wallet_address,
        payload.signature.expose_secret(),
        &stored_nonce,
    )
    .map_err(|e| {
        tracing::error!(error = ?e, "Crypto verification error");
        StatusCode::BAD_REQUEST
    })?;

    if !is_valid {
        tracing::error!("Signature verification failed");
        return Err(StatusCode::UNAUTHORIZED);
    }

    tracing::info!("Signature verified successfully");

    // Remove Nonce (protection against signature reuse)
    let _: () = redis_conn.del(&redis_key).await.unwrap_or(());

    // Since the users table requires an email address, we generate a unique one using a hash.
    // Using `SHA-256` hash prevents collisions that could occur with simple address truncation.
    let hash = Sha256::digest(payload.wallet_address.as_bytes());
    let placeholder_email = format!("wallet_{}@leasefi.local", hex::encode(&hash[..20]));

    // If a user with this wallet_address already exists, return it.
    // If not, create a new one.
    let user_record =
        auth::upsert_user_by_wallet(&state.db, &placeholder_email, &payload.wallet_address)
            .await
            .map_err(|e| {
                tracing::error!(error = %e, "Database error");
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

    let user_role = UserRole::from_str(&user_record.role).unwrap_or(UserRole::Unknown);

    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .ok_or_else(|| {
            tracing::error!("Timestamp overflow calculating JWT expiration");
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .timestamp();

    // Safe conversion: timestamp is always positive for dates after 1970,
    // and JWT expiration within 24 hours fits in usize on all platforms
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let exp = usize::try_from(expiration.max(0)).map_err(|_| {
        tracing::error!("JWT expiration timestamp overflow");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let claims = Claims {
        sub: user_record.id,
        role: user_role.clone(),
        exp,
    };

    let secret = state.config.jwt_secret.expose_secret();

    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| {
        tracing::error!(error = %e, "Token encoding error");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(LoginResponse {
        token,
        user: UserInfo {
            id: user_record.id,
            role: user_role,
        },
    }))
}
