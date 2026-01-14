use serde::{Deserialize, Serialize};
use uuid::Uuid;
use rust_decimal::Decimal;

// --- Auth Models ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // User UUID
    pub role: String,
    pub exp: usize,
}

// --- Tax Models ---

#[derive(Debug, Deserialize)]
pub struct TaxCalculationRequest {
    pub fiscal_year: i32,
    pub property_ids: Vec<Uuid>,
    #[serde(default)]
    pub include_depreciation: bool,
}

#[derive(Debug, Serialize)]
pub struct TaxReport {
    pub total_taxable_income: Decimal,
    pub total_deductions: Decimal,
    pub estimated_tax: Decimal,
    pub breakdown: Vec<TaxCategory>,
}

#[derive(Debug, Serialize)]
pub struct TaxCategory {
    pub category: String,
    pub amount: Decimal,
}

// --- Analytics Models ---

#[derive(Debug, Deserialize)]
pub struct PropertyPerformanceRequest {
    pub start_date: String, // ISO 8601
    pub end_date: String,
    pub property_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct PropertyPerformanceReport {
    pub total_revenue: Decimal,
    pub total_expenses: Decimal,
    pub net_operating_income: Decimal,
    pub roi_percentage: Decimal,
    pub occupancy_rate: Decimal,
}