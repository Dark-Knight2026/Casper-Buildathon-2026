use axum::{
routing::{get, post}, Router,
};
use redis::Client as RedisClient;
use std::net::SocketAddr;
use std::sync::Arc;
// Import handlers explicitly
use handlers::{calculate_tax_liability, get_property_performance, health_handler};

pub mod auth;
pub mod db;
pub mod handlers;
pub mod models;




// Global application state
pub struct AppState {
    pub db: sqlx::PgPool, 
    pub redis: RedisClient,
}

#[tokio::main]
async fn main() {
    // 1. Initialize logging
    tracing_subscriber::fmt::init();

    // 2. Load environment variables
    dotenv::dotenv().ok();
    // DATABASE_URL is read inside db::init_db()
    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");

    // 3. Connect to PostgreSQL 
    let pool = db::init_db().await.expect("Failed to connect to Postgres");

    // Run migrations
    if std::env::var("RUN_MIGRATIONS").unwrap_or_default() == "true" {
        sqlx::migrate!("./supabase/migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");
    }

    tracing::info!("Database connected");

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
        .route("/api/v1/tax/calculate-liability", post(calculate_tax_liability))
        .route("/api/v1/analytics/property-performance", post(get_property_performance))
        .with_state(state);

    // 7. Start server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr_str = format!("0.0.0.0:{}", port);
    let addr: SocketAddr = addr_str.parse().expect("Invalid address");

    tracing::info!("🚀 Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

