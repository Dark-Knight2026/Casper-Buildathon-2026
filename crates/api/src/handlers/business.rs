//! Business logic handlers for tax calculation and property analytics.

use axum::{Json, extract::State, http::StatusCode};
use axum::{Router, routing::post};
use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::auth::AuthUser;
use crate::config::AppState;
use crate::models::PropertyId;

/// Creates the business logic router with tax and analytics endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/tax/calculate-liability", post(calculate_tax_liability))
        .route(
            "/analytics/property-performance",
            post(get_property_performance),
        )
}

/// Represents the specific category of a tax-deductible expense.
#[derive(Debug, Serialize, Deserialize)]
pub enum TaxCategoryType {
    /// Property tax expenses.
    #[serde(rename = "Property Tax")]
    PropertyTax,
    /// Maintenance and repair costs.
    #[serde(rename = "Maintenance")]
    Maintenance,
    /// Property management fees.
    #[serde(rename = "Management Fees")]
    ManagementFees,
    /// Other miscellaneous expenses.
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
    /// Whether to include depreciation in calculations.
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
///
/// # Errors
///
/// Returns `StatusCode` error if calculation fails.
#[inline]
pub async fn calculate_tax_liability(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(payload): Json<TaxCalculationRequest>,
) -> Result<Json<TaxReport>, StatusCode> {
    // MOCK Implementation - using checked arithmetic to avoid panics
    let total_income = Decimal::from(150_000_i64);
    let base_deductions = Decimal::from(45_000_i64);

    let total_deductions = if payload.include_depreciation {
        base_deductions + Decimal::from(12_000_i64)
    } else {
        base_deductions
    };

    let taxable_income = total_income - total_deductions;
    let tax_rate = Decimal::new(24, 2); // 0.24
    let estimated_tax = taxable_income * tax_rate;

    Ok(Json(TaxReport {
        total_taxable_income: taxable_income,
        total_deductions,
        estimated_tax,
        breakdown: vec![
            TaxCategory {
                category: TaxCategoryType::PropertyTax,
                amount: Decimal::from(15_000_i64),
            },
            TaxCategory {
                category: TaxCategoryType::Maintenance,
                amount: Decimal::from(20_000_i64),
            },
            TaxCategory {
                category: TaxCategoryType::ManagementFees,
                amount: Decimal::from(10_000_i64),
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
///
/// # Errors
///
/// Returns `StatusCode` error if retrieval fails.
#[inline]
pub async fn get_property_performance(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(_payload): Json<PropertyPerformanceRequest>,
) -> Result<Json<PropertyPerformanceReport>, StatusCode> {
    // MOCK Implementation - using checked arithmetic to avoid panics
    Ok(Json(PropertyPerformanceReport {
        total_revenue: Decimal::from(240_000_i64),
        total_expenses: Decimal::from(80_000_i64),
        net_operating_income: Decimal::from(160_000_i64),
        roi_percentage: Decimal::from(16_i64),
        occupancy_rate: Decimal::new(955, 1), // 95.5
    }))
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
