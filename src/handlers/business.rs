use axum::{extract::State, http::StatusCode, Json};
use axum::{routing::post, Router};
use chrono::NaiveDate;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::auth::AuthUser;
use crate::models::PropertyId;
use crate::AppState;

/// Represents the specific category of a tax-deductible expense.
#[derive(Debug, Serialize, Deserialize)]
pub enum TaxCategoryType {
    #[serde(rename = "Property Tax")]
    PropertyTax,
    #[serde(rename = "Maintenance")]
    Maintenance,
    #[serde(rename = "Management Fees")]
    ManagementFees,
    Other(String),
}

// --- Tax Models ---

/// Request payload for calculating tax liability.
#[derive(Debug, Deserialize)]
pub struct TaxCalculationRequest {
    /// The fiscal year (must be positive).
    pub fiscal_year: u32,
    /// List of property IDs.
    pub property_ids: Vec<PropertyId>,
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
    pub category: TaxCategoryType,
    /// The calculated amount for this category.
    pub amount: Decimal,
}

// --- Analytics Models ---

/// Request payload for retrieving property performance analytics.
#[derive(Debug, Deserialize)]
pub struct PropertyPerformanceRequest {
    /// Start date (YYYY-MM-DD).
    pub start_date: NaiveDate,
    /// End date (YYYY-MM-DD).
    pub end_date: NaiveDate,
    /// List of property IDs to analyze.
    pub property_ids: Vec<PropertyId>,
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
    _user: AuthUser,
    Json(payload): Json<TaxCalculationRequest>,
) -> Result<Json<TaxReport>, StatusCode> {
    // MOCK Implementation
    let total_income = Decimal::from_i64(150000).unwrap();
    let mut total_deductions = Decimal::from_i64(45000).unwrap();

    if payload.include_depreciation {
        total_deductions += Decimal::from_i64(12000).unwrap();
    }

    let taxable_income = total_income - total_deductions;
    let tax_rate = Decimal::from_f64(0.24).unwrap();
    let estimated_tax = taxable_income * tax_rate;

    Ok(Json(TaxReport {
        total_taxable_income: taxable_income,
        total_deductions,
        estimated_tax,
        breakdown: vec![
            TaxCategory {
                category: TaxCategoryType::PropertyTax,
                amount: Decimal::from_i64(15000).unwrap(),
            },
            TaxCategory {
                category: TaxCategoryType::Maintenance,
                amount: Decimal::from_i64(20000).unwrap(),
            },
            TaxCategory {
                category: TaxCategoryType::ManagementFees,
                amount: Decimal::from_i64(10000).unwrap(),
            },
        ],
    }))
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
    // MOCK Implementation
    Ok(Json(PropertyPerformanceReport {
        total_revenue: Decimal::from_i64(240000).unwrap(),
        total_expenses: Decimal::from_i64(80000).unwrap(),
        net_operating_income: Decimal::from_i64(160000).unwrap(),
        roi_percentage: Decimal::from_f64(16.0).unwrap(),
        occupancy_rate: Decimal::from_f64(95.5).unwrap(),
    }))
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/tax/calculate-liability", post(calculate_tax_liability))
        .route(
            "/analytics/property-performance",
            post(get_property_performance),
        )
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

        let request: TaxCalculationRequest =
            serde_json::from_value(json_data).expect("Failed to deserialize");

        assert_eq!(request.fiscal_year, 2024);
        assert_eq!(request.property_ids[0], property_id);
        assert!(request.include_depreciation);
    }

    #[test]
    fn test_date_parsing() {
        let json_data = json!({
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "property_ids": []
        });

        let request: PropertyPerformanceRequest =
            serde_json::from_value(json_data).expect("Date parsing failed");
        assert_eq!(
            request.start_date,
            NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()
        );
    }
}
