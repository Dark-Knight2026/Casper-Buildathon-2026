use serde::{Deserialize, Serialize};
use uuid::Uuid;
use rust_decimal::Decimal;

// --- Auth Models ---

#[derive(Debug, Deserialize)]
pub struct NonceRequest {
    pub wallet_address: String,
}

#[derive(Debug, Serialize)]
pub struct NonceResponse {
    pub nonce: String,
    pub message: String, 
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub wallet_address: String,
    pub signature: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub role: String,
}

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
        assert_eq!(request.include_depreciation, true);
    }
}