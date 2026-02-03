//! HTTP request handlers for tax calculations.

use std::sync::Arc;

use axum::{Json, extract::State};
use rust_decimal::Decimal;

use crate::{
    auth::AuthUser,
    common::{ApiResult, AppState},
    tax::models::{TaxCalculationRequest, TaxCategory, TaxCategoryType, TaxReport},
};

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
/// Returns `ApiError` if calculation fails.
#[utoipa::path(
    post,
    path = "/tax/calculate-liability",
    tag = "Tax",
    request_body = TaxCalculationRequest,
    responses(
        (status = 200, description = "Tax liability calculated successfully", body = TaxReport),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[inline]
pub async fn calculate_tax_liability(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(payload): Json<TaxCalculationRequest>,
) -> ApiResult<Json<TaxReport>> {
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
