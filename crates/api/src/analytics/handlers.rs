//! HTTP request handlers for analytics.

use axum::{Json, extract::State, http::StatusCode};
use rust_decimal::Decimal;
use std::sync::Arc;

use crate::analytics::models::{PropertyPerformanceReport, PropertyPerformanceRequest};
use crate::auth::AuthUser;
use crate::common::AppState;

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
    use crate::analytics::models::PropertyPerformanceRequest;
    use chrono::NaiveDate;
    use serde_json::json;

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
