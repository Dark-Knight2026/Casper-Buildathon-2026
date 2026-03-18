//! HTTP request handlers for health checks.

use std::sync::Arc;

use axum::{Json, extract::State, http::StatusCode};

use crate::{
    common::AppState,
    services::health::{
        db::heartbeat,
        models::{ConnectionStatus, HealthResponse},
    },
};

/// `GET /health`
///
/// Checks the health status of the application and its dependencies.
///
/// Verifies connectivity to:
/// - Redis (Cache)
/// - `PostgreSQL` (Database)
///
/// # Returns
///
/// * (`StatusCode`, `Json<HealthResponse>`) - HTTP status 200 if healthy, 503 if any service is down,
///   along with a JSON body detailing the status of each component.
#[utoipa::path(
    get,
    path = "/health",
    tag = "Health",
    responses(
        (status = 200, description = "All services are healthy", body = HealthResponse),
        (status = 503, description = "One or more services are unavailable", body = HealthResponse)
    )
)]
#[inline]
pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> (StatusCode, Json<HealthResponse>) {
    // 1. Check Redis
    let redis_status = match state.redis.ping().await {
        Ok(()) => ConnectionStatus::Connected,
        Err(e) => {
            tracing::error!(error = %e, "Redis ping failed");
            ConnectionStatus::Disconnected
        }
    };

    // 2. Check Database
    let db_status = match heartbeat(&state.db).await {
        Ok(()) => ConnectionStatus::Connected,
        Err(e) => {
            tracing::error!(error = %e, "Database ping failed");
            ConnectionStatus::Error
        }
    };
    let status_code = if redis_status == ConnectionStatus::Connected
        && db_status == ConnectionStatus::Connected
    {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    let response = HealthResponse {
        status: status_code,
        service: "leasefi-backend".to_owned(),
        redis: redis_status,
        database: db_status,
    };

    (status_code, Json(response))
}
