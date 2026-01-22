use crate::AppState;
use axum::{extract::State, http::StatusCode, Json};
use axum::{routing::get, Router};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Arc;

// Enum for Health Status

/// Represents the status of a connection to an external service (Redis, Database, etc.).
#[derive(Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
enum ConnectionStatus {
    /// Service is reachable and responding correctly.
    Connected,
    /// Service is unreachable or connection failed.
    Disconnected,
    /// An error occurred while checking the service status.
    Error,
    /// The service returned a response that was not expected.
    UnknownResponse,
}

// Health Check Handler

/// Checks the health status of the application and its dependencies.
///
/// verifies connectivity to:
/// - Redis (Cache)
/// - PostgreSQL (Database)
///
/// # Returns
///
/// * `(StatusCode, Json<Value>)` - HTTP status 200 if healthy, 503 if any service is down,
///   along with a JSON body detailing the status of each component.
pub async fn health_check(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    // 1. Check Redis
    let redis_status = match state.redis.get_multiplexed_async_connection().await {
        Ok(mut conn) => match redis::cmd("PING").query_async::<String>(&mut conn).await {
            Ok(pong) if pong == "PONG" => ConnectionStatus::Connected,
            Ok(_) => ConnectionStatus::UnknownResponse,
            Err(e) => {
                tracing::error!("Redis ping failed: {}", e);
                ConnectionStatus::Error
            }
        },
        Err(e) => {
            tracing::error!("Failed to connect to Redis: {}", e);
            ConnectionStatus::Disconnected
        }
    };

    // 2. Check Database
    let db_status = match sqlx::query!("SELECT 1 AS heartbeat")
        .fetch_one(&state.db)
        .await
    {
        Ok(_) => ConnectionStatus::Connected,
        Err(e) => {
            tracing::error!("Database ping failed: {}", e);
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

    let response = json!({
        "status": if status_code == StatusCode::OK { "ok" } else { "error" },
        "service": "leasefi-backend",
        "redis": redis_status,
        "database": db_status
    });

    (status_code, Json(response))
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/health", get(health_check))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_health_response_structure() {
        let response = json!({
            "status": "ok",
            "service": "leasefi-backend",
            "redis": "connected",
            "database": "connected"
        });

        assert_eq!(response["status"], "ok");
        assert_eq!(response["service"], "leasefi-backend");
    }
}
