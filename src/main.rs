use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json, Router,
};
use redis::Client as RedisClient;
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

// Global application state
struct AppState {
    #[allow(dead_code)]
    db: sqlx::PgPool,
    redis: RedisClient,
}

#[tokio::main]
async fn main() {
    // 1. Initialize logging
    tracing_subscriber::fmt::init();

    // 2. Load environment variables
    dotenv::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");

    // 3. Connect to PostgreSQL
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    // Run migrations
    sqlx::migrate!("./supabase/migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    tracing::info!("Database connected and migrated");

    // 4. Initialize Redis client
    let redis_client = redis::Client::open(redis_url).expect("Invalid Redis URL");

    // 5. Build application state
    let state = Arc::new(AppState {
        db: pool,
        redis: redis_client,
    });

    // 6. Configure router
    let app = Router::new()
        .route("/health", get(health_handler))
        .with_state(state);

    // 7. Start server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr_str = format!("0.0.0.0:{}", port);
    let addr: SocketAddr = addr_str.parse().expect("Invalid address");

    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// Health check handler
async fn health_handler(State(state): State<Arc<AppState>>) -> (StatusCode, Json<Value>) {
    // 1. Check Redis
    let redis_status = match state.redis.get_multiplexed_async_connection().await {
        Ok(mut conn) => {
            match redis::cmd("PING").query_async::<String>(&mut conn).await {
                Ok(pong) if pong == "PONG" => "connected",
                Ok(_) => "unknown_response",
                Err(e) => {
                    tracing::error!("Redis ping failed: {}", e);
                    "error"
                }
            }
        },
        Err(e) => {
            tracing::error!("Failed to connect to Redis: {}", e);
            "disconnected"
        }
    };

    // 2. Check Database
    let db_status = match sqlx::query!("SELECT 1 AS heartbeat").fetch_one(&state.db).await {
        Ok(_) => "connected",
        Err(e) => {
            tracing::error!("Database ping failed: {}", e);
            "error"
        }
    };

    let status_code = if redis_status == "connected" && db_status == "connected" {
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