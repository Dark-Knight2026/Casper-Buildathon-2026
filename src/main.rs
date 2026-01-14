use axum::{
    routing::{get, post},
    Router,
};
use dotenv::dotenv;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod db;
mod handlers;
mod models;

#[tokio::main]
async fn main() {
    dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize Database
    let pool = db::init_db().await.expect("Failed to connect to database");

    // Build our application with a route
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/v1/tax/calculate-liability", post(handlers::calculate_tax_liability))
        .route("/api/v1/analytics/property-performance", post(handlers::get_property_performance))
        .with_state(pool);

    // Run it
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}