//! Tests for tax module: request deserialization and endpoint response structure.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::{
    UserId, UserRole, common::VerificationLevel, services::PROTECTED_RATE_LIMIT_BURST,
    services::tax::TaxCalculationRequest,
};

#[test]
fn tax_request_deserialization() {
    let property_id = Uuid::new_v4();
    let json_data = json!({
        "fiscal_year": 2024,
        "property_ids": [property_id.to_string()],
        "include_depreciation": true
    });

    let request =
        serde_json::from_value::<TaxCalculationRequest>(json_data).expect("Failed to deserialize");

    assert_eq!(request.fiscal_year, 2024);
    assert_eq!(request.property_ids[0], property_id);
    assert!(request.include_depreciation);
}

/// An email-verified caller gets the expected response structure.
///
/// Doubles as the "verified passes the gate" half of the `VerifiedUser<EmailVerified>`
/// pilot contract: the token carries `verification_level = email`, so the
/// `403` gate is cleared and the handler runs normally.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tax_returns_expected_structure(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let token = common::mint_access_token_with_level(
        UserId::default(),
        UserRole::Tenant,
        &env.jwt_secret,
        Some(VerificationLevel::Email),
    );

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

/// An authenticated-but-unverified caller is blocked by the pilot gate.
///
/// `verification_level = none` is below the `email` threshold, so the
/// `VerifiedUser<EmailVerified>` extractor rejects with `403` and the
/// machine-readable body the frontend reads to render the "verify your email"
/// CTA: `{ "error": "verification_required", "required_level": "email" }`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tax_rejects_unverified_caller(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let token = common::mint_access_token_with_level(
        UserId::default(),
        UserRole::Tenant,
        &env.jwt_secret,
        Some(VerificationLevel::None),
    );

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

    assert_eq!(status, StatusCode::FORBIDDEN);
    let body = body.expect("403 carries a JSON body");
    assert_eq!(body["error"], "verification_required");
    assert_eq!(body["required_level"], "email");
}

/// Protected endpoints must enforce rate limiting after burst is exhausted.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn protected_endpoint_enforces_rate_limit(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    // Email-verified token so requests clear the `VerifiedUser<EmailVerified>`
    // gate and reach the rate limiter rather than short-circuiting on `403`.
    let token = common::mint_access_token_with_level(
        UserId::default(),
        UserRole::Tenant,
        &env.jwt_secret,
        Some(VerificationLevel::Email),
    );
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
