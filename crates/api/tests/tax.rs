//! Tests for tax module: request deserialization and endpoint response structure.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::{
    UserId, UserRole, services::PROTECTED_RATE_LIMIT_BURST, services::tax::TaxCalculationRequest,
};

#[test]
fn tax_request_deserialization() {
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

/// Verifies that the tax calculation endpoint returns the expected response structure.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tax_returns_expected_structure(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, body): (StatusCode, Option<Value>) = common::authed_request(
        &env.server,
        &Method::POST,
        "/api/v1/tax/calculate-liability",
        &token,
        &json!({
            "fiscal_year": 2024,
            "property_ids": [],
            "include_depreciation": false
        }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("Response body should be valid JSON");

    assert!(body.get("total_taxable_income").is_some());
    assert!(body.get("total_deductions").is_some());
    assert!(body.get("estimated_tax").is_some());

    let breakdown = body["breakdown"]
        .as_array()
        .expect("breakdown should be an array");
    assert_eq!(breakdown.len(), 3, "Mock returns exactly 3 tax categories");
}

/// Protected endpoints must enforce rate limiting after burst is exhausted.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn protected_endpoint_enforces_rate_limit(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);
    let body = json!({
        "fiscal_year": 2024,
        "property_ids": [],
        "include_depreciation": false
    });

    for i in 0..=PROTECTED_RATE_LIMIT_BURST {
        let (status, _): (StatusCode, Option<Value>) = common::authed_request(
            &env.server,
            &Method::POST,
            "/api/v1/tax/calculate-liability",
            &token,
            &body,
        )
        .await;

        if i < PROTECTED_RATE_LIMIT_BURST {
            assert_eq!(
                status,
                StatusCode::OK,
                "Request {i} should succeed within burst limit"
            );
        } else {
            assert_eq!(
                status,
                StatusCode::TOO_MANY_REQUESTS,
                "Request {i} should be rate-limited after burst exhausted"
            );
        }
    }
}
