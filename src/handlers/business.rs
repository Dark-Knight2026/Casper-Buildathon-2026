use axum::{extract::State, http::StatusCode, Json};
use axum::{routing::post, Router};
use rust_decimal::Decimal;
use rust_decimal::prelude::FromPrimitive;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;
use crate::AppState;
use crate::auth::AuthUser;


// --- Tax Models ---

/// Request payload for calculating tax liability.
#[derive(Debug, Deserialize)]
pub struct TaxCalculationRequest {
    /// The fiscal year for which to calculate taxes (e.g., 2024).
    pub fiscal_year: i32,
    /// List of property IDs to include in the calculation.
    pub property_ids: Vec<Uuid>,
    /// Whether to include depreciation calculations in deductions.
    #[serde(default)]
    pub include_depreciation: bool,
}

/// Detailed tax report containing calculated figures and a breakdown.
#[derive(Debug, Serialize)]
pub struct TaxReport {
    /// The total income subject to tax after deductions.
    pub total_taxable_income: Decimal,
    /// The total amount of deductions applied.
    pub total_deductions: Decimal,
    /// The estimated tax amount to be paid.
    pub estimated_tax: Decimal,
    /// A detailed breakdown of tax components by category.
    pub breakdown: Vec<TaxCategory>,
}

/// Represents a specific category in the tax breakdown.
#[derive(Debug, Serialize)]
pub struct TaxCategory {
    /// The name of the tax category (e.g., "Property Tax", "Maintenance").
    pub category: String,
    /// The calculated amount for this category.
    pub amount: Decimal,
}

// --- Analytics Models ---

/// Request payload for retrieving property performance analytics.
#[derive(Debug, Deserialize)]
pub struct PropertyPerformanceRequest {
    /// The start date for the analysis period (ISO 8601 format, e.g., "2024-01-01").
    pub start_date: String, 
    /// The end date for the analysis period (ISO 8601 format).
    pub end_date: String,
    /// List of property IDs to analyze.
    pub property_ids: Vec<Uuid>,
}

/// Comprehensive report on property performance metrics.
#[derive(Debug, Serialize)]
pub struct PropertyPerformanceReport {
    /// Total revenue generated during the period.
    pub total_revenue: Decimal,
    /// Total expenses incurred during the period.
    pub total_expenses: Decimal,
    /// Net Operating Income (NOI) = Total Revenue - Total Expenses.
    pub net_operating_income: Decimal,
    /// Return on Investment (ROI) percentage.
    pub roi_percentage: Decimal,
    /// The average occupancy rate as a percentage (0-100).
    pub occupancy_rate: Decimal,
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

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/tax/calculate-liability", post(calculate_tax_liability))
        .route("/analytics/property-performance", post(get_property_performance))
}


#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use uuid::Uuid;

    #[test]
    fn test_tax_request_deserialization() {
        
        let property_id = Uuid::new_v4();
        let json_data = json!({
            "fiscal_year": 2024,
            "property_ids": [property_id.to_string()],
            "include_depreciation": true
        });

        
        let request: TaxCalculationRequest = serde_json::from_value(json_data).expect("Failed to deserialize");

        
        assert_eq!(request.fiscal_year, 2024);
        assert_eq!(request.property_ids[0], property_id);
        assert!(request.include_depreciation);
    }
}