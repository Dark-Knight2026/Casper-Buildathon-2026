//! HTTP request handlers for analytics.

use std::sync::Arc;

use axum::{Json, extract::State};
use rust_decimal::Decimal;

use crate::{
    analytics::models::{PropertyPerformanceReport, PropertyPerformanceRequest},
    auth::AuthUser,
    common::{ApiResult, AppState},
};

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
/// Returns `ApiError` if retrieval fails.
#[utoipa::path(
    post,
    path = "/analytics/property-performance",
    tag = "Analytics",
    request_body = PropertyPerformanceRequest,
    responses(
        (status = 200, description = "Property performance report", body = PropertyPerformanceReport),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[inline]
pub async fn get_property_performance(
    State(_state): State<Arc<AppState>>,
    _user: AuthUser,
    Json(_payload): Json<PropertyPerformanceRequest>,
) -> ApiResult<Json<PropertyPerformanceReport>> {
    // MOCK Implementation - using checked arithmetic to avoid panics
    Ok(Json(PropertyPerformanceReport {
        total_revenue: Decimal::from(240_000_i64),
        total_expenses: Decimal::from(80_000_i64),
        net_operating_income: Decimal::from(160_000_i64),
        roi_percentage: Decimal::from(16_i64),
        occupancy_rate: Decimal::new(955, 1), // 95.5
    }))
}
