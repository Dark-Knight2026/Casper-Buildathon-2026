//! Tests for analytics module: request deserialization and endpoint response structure.

mod common;

use axum::http::{Method, StatusCode};
use chrono::NaiveDate;
use serde_json::{Value, json};
use sqlx::PgPool;

use api::{UserId, UserRole, services::analytics::PropertyPerformanceRequest};

#[test]
fn property_performance_request_date_parsing() {
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

/// Verifies that the analytics endpoint returns the expected response structure.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn analytics_returns_expected_structure(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, body): (StatusCode, Option<Value>) = common::authed_request(
        &env.server,
        &Method::POST,
        "/api/v1/analytics/property-performance",
        &token,
        &json!({
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "property_ids": []
        }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("Response body should be valid JSON");

    assert!(body.get("total_revenue").is_some());
    assert!(body.get("total_expenses").is_some());
    assert!(body.get("net_operating_income").is_some());
    assert!(body.get("roi_percentage").is_some());
    assert!(body.get("occupancy_rate").is_some());
}
