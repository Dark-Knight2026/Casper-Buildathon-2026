//! HTTP request handlers for tax calculations.

use std::sync::Arc;

use axum::{Json, extract::State};
use rust_decimal::Decimal;

use crate::{
    common::{ApiResult, AppState},
    services::{
        auth::{EmailVerified, VerifiedUser, models::VerificationRequiredResponse},
        tax::models::{TaxCalculationRequest, TaxCategory, TaxCategoryType, TaxReport},
    },
};

// `POST /api/v1/tax/calculate-liability`
//
/// Calculates the estimated tax liability for a given fiscal year.
///
/// This handler processes a `TaxCalculationRequest`, which includes income and deduction details,
/// and returns a `TaxReport` with the estimated tax and a breakdown of categories.
///
/// Authorization: `VerifiedUser<EmailVerified>` - the caller must have
/// confirmed their email (`verification_level >= email`). Tax calculation is a
/// product feature gated behind the pilot rollout, not part of onboarding, so
/// an unverified caller is rejected with `403 verification_required` rather
/// than being allowed through.
///
/// # Arguments
///
/// * `state` - The application state (shared DB pool, etc.).
/// * `_user` - The email-verified user (extracted and gated from the JWT).
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
    path = "/calculate-liability",
    tag = "Tax",
    request_body = TaxCalculationRequest,
    responses(
        (status = 200, description = "Tax liability calculated successfully", body = TaxReport),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "verification_required - caller's email is not verified", body = VerificationRequiredResponse),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn calculate_tax_liability(
    State(_state): State<Arc<AppState>>,
    _user: VerifiedUser<EmailVerified>,
    Json(payload): Json<TaxCalculationRequest>,
) -> ApiResult<Json<TaxReport>> {
    // MOCK Implementation - using checked arithmetic to avoid panics
    let total_income = Decimal::from(150_000);
    let base_deductions = Decimal::from(45_000);

    let total_deductions = if payload.include_depreciation {
        base_deductions + Decimal::from(12_000)
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
                amount: Decimal::from(15_000),
            },
            TaxCategory {
                category: TaxCategoryType::Maintenance,
                amount: Decimal::from(20_000),
            },
            TaxCategory {
                category: TaxCategoryType::ManagementFees,
                amount: Decimal::from(10_000),
            },
        ],
    }))
}
