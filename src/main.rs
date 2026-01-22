use axum::{
routing::{get, post}, Router,
};
use tower_http::trace::TraceLayer;
use redis::Client as RedisClient;
use std::net::SocketAddr;
use std::sync::Arc;
// Import handlers explicitly
use handlers::{calculate_tax_liability, get_property_performance, get_nonce, login, health_check};

pub mod auth;
pub mod db;
pub mod handlers;
pub mod models;
pub mod crypto;




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
        .merge(handlers::health::router()) 
        .nest("/api/v1/auth", handlers::auth::router())         
        .nest("/api/v1", handlers::business::router())          
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // 7. Start server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr_str = format!("0.0.0.0:{}", port);
    let addr: SocketAddr = addr_str.parse().expect("Invalid address");

    tracing::info!("🚀 Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutting down gracefully...");
}

