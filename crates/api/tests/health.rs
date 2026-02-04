//! Integration tests for health check endpoint.

mod common;

use axum::http::StatusCode;
use sqlx::PgPool;

#[sqlx::test(migrations = "../../supabase/migrations")]
async fn health_check_returns_status(pool: PgPool) {
    let env = common::setup_test_server(pool, true).await;

    let response = env.server.get("/health").await;

    // Should return 200 if services are up, 503 if down
    assert!(
        response.status_code() == StatusCode::OK
            || response.status_code() == StatusCode::SERVICE_UNAVAILABLE
    );

    let body: serde_json::Value = response.json();
    assert!(body.get("status").is_some());
    assert!(body.get("redis").is_some());
    assert!(body.get("database").is_some());
    assert_eq!(body["service"], "leasefi-backend");
}
