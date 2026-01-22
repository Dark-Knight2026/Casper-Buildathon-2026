use axum::{extract::{Query, State}, http::StatusCode, Json};
use axum::{routing::{get, post}, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::sync::Arc;
use redis::AsyncCommands;
use rand::{distr::Alphanumeric, Rng};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use crate::AppState;
use crate::crypto::verify_casper_signature;
use crate::models::Claims;

// --- Auth Models ---

/// Request payload for generating a login nonce.
#[derive(Debug, Deserialize)]
pub struct NonceRequest {
    /// The wallet address (public key) of the user attempting to log in.
    pub wallet_address: String,
}

/// Response containing the generated nonce and the message to be signed.
#[derive(Debug, Serialize)]
pub struct NonceResponse {
    /// A randomly generated string used to prevent replay attacks.
    pub nonce: String,
    /// The full message string that the user must sign with their wallet.
    /// Format: "Sign this message to login to LeaseFi. Nonce: <nonce>"
    pub message: String, 
}

/// Request payload for verifying a login signature.
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    /// The wallet address (public key) of the user.
    pub wallet_address: String,
    /// The signature produced by signing the nonce message with the user's private key.
    pub signature: String,
}

/// Response returned upon successful login, containing the JWT and user info.
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    /// Use this JSON Web Token (JWT) for authenticating subsequent requests.
    pub token: String,
    /// Basic information about the authenticated user.
    pub user: UserInfo,
}

/// Basic user information returned after authentication.
#[derive(Debug, Serialize)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    pub id: Uuid,
    /// The user's role (e.g., "tenant", "landlord").
    pub role: String,
}


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
/// * `Err(StatusCode)` - 500 Internal Server Error if Redis operations fail.
pub async fn get_nonce(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(payload): axum::extract::Query<NonceRequest>,
) -> Result<Json<NonceResponse>, StatusCode> {
    // Generate a random string (16 characters)
    let random_string: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    // Create a message that the user will sign
    let message = format!("Sign this message to login to LeaseFi. Nonce: {}", random_string);

    // Store in Redis
    let redis_key = format!("nonce:{}", payload.wallet_address);
    
    let mut redis_conn = state.redis.get_multiplexed_async_connection().await
        .map_err(|e| {
            tracing::error!("Redis connection error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let _: () = redis_conn.set_ex(&redis_key, &message, 300).await
        .map_err(|e| {
            tracing::error!("Failed to save nonce to Redis: {}", e);
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
/// * `Err(StatusCode)` - 401 Unauthorized if signature or nonce is invalid,
///   or 500 Internal Server Error for DB/Redis failures.
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    
    // Validation: Check wallet address length
    if payload.wallet_address.len() < 16 {
        tracing::error!("Wallet address is too short");
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut redis_conn = state.redis.get_multiplexed_async_connection().await
        .map_err(|e| {
            tracing::error!("Redis connection error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let redis_key = format!("nonce:{}", payload.wallet_address);

    let stored_nonce: String = redis_conn.get(&redis_key).await
        .map_err(|_| {
            tracing::error!("❌ Nonce NOT FOUND or EXPIRED for key: {}", redis_key);
            StatusCode::UNAUTHORIZED
        })?;

    let expected_message = stored_nonce;

    // Security: Verify Signature and RETURN ERROR if invalid
    let is_valid = verify_casper_signature(
        &payload.wallet_address,
        &payload.signature,
        &expected_message
    ).map_err(|e| {
        tracing::error!("Crypto verification error: {:?}", e);
        StatusCode::BAD_REQUEST
    })?;

    if !is_valid {
        tracing::error!("🔒 Signature INVALID (Math mismatch)");
        return Err(StatusCode::UNAUTHORIZED);
    }
    
    tracing::info!("🔓 Signature VALID");

    // Remove Nonce (protection against signature reuse)
    let _: () = redis_conn.del(&redis_key).await.unwrap_or(());

    // Since the users table requires an email address, we generate a fake one for new users.
    let placeholder_email = format!("wallet_{}@leasefi.local", &payload.wallet_address[..16]);
    
    // If a user with this wallet_address already exists, return it.
    // If not, create a new one.
    let user = sqlx::query!(
        r#"
        INSERT INTO users (
            email, 
            role, 
            wallet_address, 
            first_name, 
            last_name,
            auth_id,
            status
        )
        VALUES ($1, 'tenant', $2, 'Wallet', 'User', NULL, 'active')
        ON CONFLICT (wallet_address) DO UPDATE 
            SET last_login_at = NOW()
        RETURNING id, role
        "#,
        placeholder_email,
        payload.wallet_address
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Database error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // Generating a JWT token
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user.id.to_string(),
        role: user.role.clone(),
        exp: expiration as usize,
    };

    let secret = std::env::var("SUPABASE_JWT_SECRET")
        .map_err(|_| {
            tracing::error!("CRITICAL: SUPABASE_JWT_SECRET is not set in env");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|e| {
        tracing::error!("Token encoding error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(LoginResponse {
        token,
        user: UserInfo {
            id: user.id,
            role: user.role,
        },
    }))
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/nonce", get(get_nonce))
        .route("/login", post(login))
}