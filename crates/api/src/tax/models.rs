//! Request and response models for tax endpoints.

use crate::common::PropertyId;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Represents the specific category of a tax-deductible expense.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
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

/// Request payload for calculating tax liability.
#[derive(Debug, Deserialize, ToSchema)]
pub struct TaxCalculationRequest {
    /// The fiscal year (must be positive).
    pub fiscal_year: u32,
    /// List of property IDs.
    #[schema(value_type = Vec<uuid::Uuid>)]
    pub property_ids: Vec<PropertyId>,
    /// Whether to include depreciation in calculations.
    #[serde(default)]
    pub include_depreciation: bool,
}

/// Detailed tax report containing calculated figures and a breakdown.
#[derive(Debug, Serialize, ToSchema)]
pub struct TaxReport {
    /// The total income subject to tax after deductions.
    #[schema(value_type = String, example = "105000.00")]
    pub total_taxable_income: Decimal,
    /// The total amount of deductions applied.
    #[schema(value_type = String, example = "45000.00")]
    pub total_deductions: Decimal,
    /// The estimated tax amount to be paid.
    #[schema(value_type = String, example = "25200.00")]
    pub estimated_tax: Decimal,
    /// A detailed breakdown of tax components by category.
    pub breakdown: Vec<TaxCategory>,
}

/// Represents a specific category in the tax breakdown.
#[derive(Debug, Serialize, ToSchema)]
pub struct TaxCategory {
    /// The name of the tax category (e.g., "Property Tax", "Maintenance").
    pub category: TaxCategoryType,
    /// The calculated amount for this category.
    #[schema(value_type = String, example = "15000.00")]
    pub amount: Decimal,
}
