//! Request and response models for analytics endpoints.

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::common::PropertyId;

/// Request payload for retrieving property performance analytics.
#[derive(Debug, Deserialize, ToSchema)]
pub struct PropertyPerformanceRequest {
    /// Start date (YYYY-MM-DD).
    #[schema(example = "2024-01-01")]
    pub start_date: NaiveDate,
    /// End date (YYYY-MM-DD).
    #[schema(example = "2024-12-31")]
    pub end_date: NaiveDate,
    /// List of property IDs to analyze.
    #[schema(value_type = Vec<uuid::Uuid>)]
    pub property_ids: Vec<PropertyId>,
}

/// Comprehensive report on property performance metrics.
#[derive(Debug, Serialize, ToSchema)]
pub struct PropertyPerformanceReport {
    /// Total revenue generated during the period.
    #[schema(value_type = String, example = "240000.00")]
    pub total_revenue: Decimal,
    /// Total expenses incurred during the period.
    #[schema(value_type = String, example = "80000.00")]
    pub total_expenses: Decimal,
    /// Net Operating Income (NOI) = Total Revenue - Total Expenses.
    #[schema(value_type = String, example = "160000.00")]
    pub net_operating_income: Decimal,
    /// Return on Investment (ROI) percentage.
    #[schema(value_type = String, example = "16.00")]
    pub roi_percentage: Decimal,
    /// The average occupancy rate as a percentage (0-100).
    #[schema(value_type = String, example = "95.50")]
    pub occupancy_rate: Decimal,
}
