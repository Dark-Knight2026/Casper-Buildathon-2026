//! Tests for API model serialization/deserialization.

use chrono::NaiveDate;
use serde_json::json;
use uuid::Uuid;

use api::{analytics::PropertyPerformanceRequest, tax::TaxCalculationRequest};

#[test]
fn test_property_performance_request_date_parsing() {
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

#[test]
fn test_tax_request_deserialization() {
    let property_id = Uuid::new_v4();
    let json_data = json!({
        "fiscal_year": 2024,
        "property_ids": [property_id.to_string()],
        "include_depreciation": true
    });

    let request: TaxCalculationRequest =
        serde_json::from_value(json_data).expect("Failed to deserialize");

    assert_eq!(request.fiscal_year, 2024);
    assert_eq!(request.property_ids[0], property_id);
    assert!(request.include_depreciation);
}
