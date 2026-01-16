use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use crate::models::{
    PropertyPerformanceReport, PropertyPerformanceRequest, TaxCalculationRequest, TaxCategory,
    TaxReport,
};
use serde_json::{json, Value}; 
use std::sync::Arc;
use serde::Serialize;
use crate::auth::AuthUser;
use crate::AppState;

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
    let mut total_income = Decimal::from_i64(150000).unwrap();
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