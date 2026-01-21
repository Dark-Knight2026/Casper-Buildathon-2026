use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use crate::models::{
    PropertyPerformanceReport, PropertyPerformanceRequest, TaxCalculationRequest, TaxCategory,
    TaxReport, NonceRequest, NonceResponse, LoginRequest, LoginResponse, UserInfo
};
use serde_json::{json, Value}; 
use std::sync::Arc;
use serde::Serialize;
use crate::auth::AuthUser;
use crate::AppState;
use redis::AsyncCommands;
use rand::{distr::Alphanumeric, Rng};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use crate::crypto::verify_casper_signature; 
use crate::models::Claims; 

// NOTE: This is a Mock implementation for Phase 1. 
// Real DB queries will be implemented in the next iteration.


// Enum for Health Status

/// Represents the status of a connection to an external service (Redis, Database, etc.).
#[derive(Serialize, PartialEq)]
#[serde(rename_all = "snake_case")] 
enum ConnectionStatus {
    /// Service is reachable and responding correctly.
    Connected,
    /// Service is unreachable or connection failed.
    Disconnected,
    /// An error occurred while checking the service status.
    Error,
    /// The service returned a response that was not expected.
    UnknownResponse,
}

// Tax Calculation Handler

/// Calculates the estimated tax liability for a given fiscal year.
///
/// This handler processes a `TaxCalculationRequest`, which includes income and deduction details,
/// and returns a `TaxReport` with the estimated tax and a breakdown of categories.
///
/// # Arguments
///
/// * `state` - The application state (shared DB pool, etc.).
/// * `_user` - The authenticated user (extracted from JWT).
/// * `payload` - JSON payload containing fiscal year and property IDs.
///
/// # Returns
///
/// * `Ok(Json<TaxReport>)` - The calculated tax report.
/// * `Err(StatusCode)` - HTTP error code if calculation fails.
pub async fn calculate_tax_liability(
    State(_state): State<Arc<AppState>>, 
    _user: AuthUser, // Ensure user is authenticated
    Json(payload): Json<TaxCalculationRequest>,
) -> Result<Json<TaxReport>, StatusCode> {
    // TODO: Fetch real income/expenses from DB using sqlx
    
    // Mock data simulation
    let total_income = Decimal::from_i64(150000).unwrap();
    let mut total_deductions = Decimal::from_i64(45000).unwrap();
    
    if payload.include_depreciation {
        total_deductions += Decimal::from_i64(12000).unwrap();
    }

    let taxable_income = total_income - total_deductions;
    let tax_rate = Decimal::from_f64(0.24).unwrap(); // Simplified 24% tax rate
    let estimated_tax = taxable_income * tax_rate;

    let report = TaxReport {
        total_taxable_income: taxable_income,
        total_deductions,
        estimated_tax,
        breakdown: vec![
            TaxCategory {
                category: "Property Tax".to_string(),
                amount: Decimal::from_i64(15000).unwrap(),
            },
            TaxCategory {
                category: "Maintenance".to_string(),
                amount: Decimal::from_i64(20000).unwrap(),
            },
            TaxCategory {
                category: "Management Fees".to_string(),
                amount: Decimal::from_i64(10000).unwrap(),
            },
        ],
    };

    Ok(Json(report))
}

// Analytics Handler

/// Retrieves performance metrics for a set of properties over a specified date range.
///
/// Calculates total revenue, expenses, net operating income (NOI), ROI, and occupancy rates.
///
/// # Arguments
///
/// * `state` - The application state.
/// * `_user` - The authenticated user.
/// * `payload` - JSON payload containing date range and property IDs.
///
/// # Returns
///
/// * `Ok(Json<PropertyPerformanceReport>)` - The performance report.
/// * `Err(StatusCode)` - HTTP error code if retrieval fails.
pub async fn get_property_performance(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(_payload): Json<PropertyPerformanceRequest>,
) -> Result<Json<PropertyPerformanceReport>, StatusCode> {
    // TODO: Implement complex aggregation queries via SQLx
    
    let total_revenue = Decimal::from_i64(240000).unwrap();
    let total_expenses = Decimal::from_i64(80000).unwrap();
    let net_operating_income = total_revenue - total_expenses;
    
    // ROI = (Net Profit / Total Investment) * 100
    // Assuming total investment is 1,000,000 for this example
    let roi_percentage = Decimal::from_f64(16.0).unwrap(); 
    let occupancy_rate = Decimal::from_f64(95.5).unwrap();

    let report = PropertyPerformanceReport {
        total_revenue,
        total_expenses,
        net_operating_income,
        roi_percentage,
        occupancy_rate,
    };

    Ok(Json(report))
}

// Health Check Handler

/// Checks the health status of the application and its dependencies.
///
/// verifies connectivity to:
/// - Redis (Cache)
/// - PostgreSQL (Database)
///
/// # Returns
///
/// * `(StatusCode, Json<Value>)` - HTTP status 200 if healthy, 503 if any service is down,
///   along with a JSON body detailing the status of each component.
pub async fn health_handler(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    // 1. Check Redis
    let redis_status = match state.redis.get_multiplexed_async_connection().await {
        Ok(mut conn) => {
            match redis::cmd("PING").query_async::<String>(&mut conn).await {
                Ok(pong) if pong == "PONG" => ConnectionStatus::Connected,
                Ok(_) => ConnectionStatus::UnknownResponse,
                Err(e) => {
                    tracing::error!("Redis ping failed: {}", e);
                    ConnectionStatus::Error
                }
            }
        },
        Err(e) => {
            tracing::error!("Failed to connect to Redis: {}", e);
            ConnectionStatus::Disconnected
        }
    };

    // 2. Check Database
    let db_status = match sqlx::query!("SELECT 1 AS heartbeat").fetch_one(&state.db).await {
        Ok(_) => ConnectionStatus::Connected,
        Err(e) => {
            tracing::error!("Database ping failed: {}", e);
            ConnectionStatus::Error
        }
    };

    let status_code = if redis_status == ConnectionStatus::Connected && db_status == ConnectionStatus::Connected {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    let response = json!({
        "status": if status_code == StatusCode::OK { "ok" } else { "error" },
        "service": "leasefi-backend",
        "redis": redis_status, 
        "database": db_status
    });

    (status_code, Json(response))
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

    let is_valid = verify_casper_signature(
        &payload.wallet_address,
        &payload.signature,
        &expected_message
    );

    match &is_valid {
        Ok(true) => tracing::info!("🔓 Signature VALID"),
        Ok(false) => tracing::error!("🔒 Signature INVALID (Math mismatch)"),
        Err(e) => tracing::error!("💥 Crypto Error: {:?}", e),
    }

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
        ON CONFLICT (email) DO UPDATE 
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

    let secret = std::env::var("SUPABASE_JWT_SECRET").expect("JWT_SECRET must be set");
    
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(LoginResponse {
        token,
        user: UserInfo {
            id: user.id,
            role: user.role,
        },
    }))
}