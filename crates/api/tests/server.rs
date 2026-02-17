//! Integration tests for server configuration: rate limiting, CORS.

mod common;

use axum::http::{Method, StatusCode};
use axum_test::http::header;
use sqlx::PgPool;

use api::server::AUTH_RATE_LIMIT_BURST;

/// Verifies that auth endpoints enforce rate limiting after `burst_size` (15) requests.
///
/// Configuration: `per_second(1)`, `burst_size(15)` via `GovernorLayer`.
#[sqlx::test(migrations = "../../supabase/migrations")]
async fn auth_endpoint_enforces_rate_limit(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    // Exhaust burst limit — all return 400 (missing wallet_address)
    for _ in 0..AUTH_RATE_LIMIT_BURST {
        let response = env.server.get("/api/v1/auth/nonce").await;
        assert_eq!(
            response.status_code(),
            StatusCode::BAD_REQUEST,
            "Requests within burst limit should reach the handler"
        );
    }

    // 16th request should be rate limited before reaching the handler
    let response = env.server.get("/api/v1/auth/nonce").await;
    assert_eq!(
        response.status_code(),
        StatusCode::TOO_MANY_REQUESTS,
        "Request exceeding burst limit should be rate limited"
    );
}

/// Verifies that non-auth endpoints are NOT rate limited.
#[sqlx::test(migrations = "../../supabase/migrations")]
async fn health_endpoint_is_not_rate_limited(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    // Send more requests than the auth burst limit
    for _ in 0..AUTH_RATE_LIMIT_BURST + 5 {
        let response = env.server.get("/health").await;
        assert_ne!(
            response.status_code(),
            StatusCode::TOO_MANY_REQUESTS,
            "Health endpoint should not be rate limited"
        );
    }
}

/// Verifies that the CORS layer sets `access-control-allow-origin` to the configured origin.
#[sqlx::test(migrations = "../../supabase/migrations")]
async fn cors_returns_configured_origin(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/health")
        .add_header(header::ORIGIN, common::TEST_CORS_ORIGIN)
        .await;

    let cors_origin = response.header(header::ACCESS_CONTROL_ALLOW_ORIGIN);
    assert_eq!(
        cors_origin.to_str().unwrap(),
        common::TEST_CORS_ORIGIN,
        "CORS header should contain the configured origin"
    );
}

/// Verifies that CORS preflight returns the correct allowed methods and headers.
#[sqlx::test(migrations = "../../supabase/migrations")]
async fn cors_preflight_returns_allowed_methods(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .method(Method::OPTIONS, "/health")
        .add_header(header::ORIGIN, common::TEST_CORS_ORIGIN)
        .add_header(header::ACCESS_CONTROL_REQUEST_METHOD, "POST")
        .await;

    let allowed_methods = response
        .header(header::ACCESS_CONTROL_ALLOW_METHODS)
        .to_str()
        .unwrap()
        .to_string();

    for method in ["GET", "POST", "PUT", "DELETE"] {
        assert!(
            allowed_methods.contains(method),
            "{method} should be in access-control-allow-methods"
        );
    }
}

/// Verifies that the configured CORS origin does not match unauthorized origins.
///
/// With `AllowOrigin::exact`, the server always responds with the configured origin.
/// Browsers enforce CORS by checking that the response origin matches the page origin,
/// so `https://evil.com` != the configured origin causes the browser to block the response.
#[sqlx::test(migrations = "../../supabase/migrations")]
async fn cors_origin_does_not_match_unauthorized_request(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/health")
        .add_header(header::ORIGIN, "https://evil.com")
        .await;

    let cors_origin = response.header(header::ACCESS_CONTROL_ALLOW_ORIGIN);
    assert_ne!(
        cors_origin.to_str().unwrap(),
        "https://evil.com",
        "CORS origin must not match unauthorized origin (browser will block)"
    );
}
