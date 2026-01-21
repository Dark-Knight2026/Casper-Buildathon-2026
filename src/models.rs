use serde::{Deserialize, Serialize};
use uuid::Uuid;
use rust_decimal::Decimal;

// --- Auth Models ---

/// Request payload for generating a login nonce.
#[derive(Debug, Deserialize)]
pub struct NonceRequest {
    /// The wallet address (public key) of the user attempting to log in.
    pub wallet_address: String,
}

/// Response containing the generated nonce and the message to be signed.
#[derive(Debug, Serialize)]
pub struct NonceResponse {
    /// A randomly generated string used to prevent replay attacks.
    pub nonce: String,
    /// The full message string that the user must sign with their wallet.
    /// Format: "Sign this message to login to LeaseFi. Nonce: <nonce>"
    pub message: String, 
}

/// Request payload for verifying a login signature.
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    /// The wallet address (public key) of the user.
    pub wallet_address: String,
    /// The signature produced by signing the nonce message with the user's private key.
    pub signature: String,
}

/// Response returned upon successful login, containing the JWT and user info.
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    /// Use this JSON Web Token (JWT) for authenticating subsequent requests.
    pub token: String,
    /// Basic information about the authenticated user.
    pub user: UserInfo,
}

/// Basic user information returned after authentication.
#[derive(Debug, Serialize)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    pub id: Uuid,
    /// The user's role (e.g., "tenant", "landlord").
    pub role: String,
}

/// JWT Claims structure used for token generation and validation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject: The User UUID.
    pub sub: String, 
    /// The role assigned to the user, used for permission checks.
    pub role: String,
    /// Expiration time of the token (Unix timestamp).
    pub exp: usize,
}

// --- Tax Models ---

/// Request payload for calculating tax liability.
#[derive(Debug, Deserialize)]
pub struct TaxCalculationRequest {
    /// The fiscal year for which to calculate taxes (e.g., 2024).
    pub fiscal_year: i32,
    /// List of property IDs to include in the calculation.
    pub property_ids: Vec<Uuid>,
    /// Whether to include depreciation calculations in deductions.
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
    pub category: String,
    /// The calculated amount for this category.
    pub amount: Decimal,
}

// --- Analytics Models ---

/// Request payload for retrieving property performance analytics.
#[derive(Debug, Deserialize)]
pub struct PropertyPerformanceRequest {
    /// The start date for the analysis period (ISO 8601 format, e.g., "2024-01-01").
    pub start_date: String, 
    /// The end date for the analysis period (ISO 8601 format).
    pub end_date: String,
    /// List of property IDs to analyze.
    pub property_ids: Vec<Uuid>,
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

        
        let request: TaxCalculationRequest = serde_json::from_value(json_data).expect("Failed to deserialize");

        
        assert_eq!(request.fiscal_year, 2024);
        assert_eq!(request.property_ids[0], property_id);
        assert!(request.include_depreciation);
    }
}