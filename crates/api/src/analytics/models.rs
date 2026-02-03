//! Request and response models for analytics endpoints.

use crate::common::PropertyId;
use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

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
