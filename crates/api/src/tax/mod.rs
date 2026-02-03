//! Tax calculation feature module.
//!
//! Provides tax liability calculation for properties.

/// HTTP request handlers for tax calculations.
pub mod handlers;
/// Request and response models for tax endpoints.
pub mod models;
/// Router configuration for tax endpoints.
pub mod routes;

pub use handlers::calculate_tax_liability;
pub use models::{TaxCalculationRequest, TaxCategory, TaxCategoryType, TaxReport};
pub use routes::router;
