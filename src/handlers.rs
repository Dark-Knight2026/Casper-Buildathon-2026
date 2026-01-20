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
#[derive(Serialize, PartialEq)]
#[serde(rename_all = "snake_case")] 
enum ConnectionStatus {
    Connected,
    Disconnected,
    Error,
    UnknownResponse,
}

// Tax Calculation Handler
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
            SET last_login_at = NOW() -- Якщо юзер існує, просто оновлюємо час входу
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