//! `LeaseFi` Backend API
//!
//! This crate provides the backend API for the `LeaseFi` platform,
//! including authentication, business logic handlers, and health checks.

/// Authentication middleware and extractors.
pub mod auth;
/// Application configuration and state management.
pub mod config;
/// Cryptographic utilities for signature verification.
pub mod crypto;
/// Error types for the application.
pub mod errors;
/// HTTP request handlers.
pub mod handlers;
/// Shared data models and types.
pub mod models;

/// Server implementation and startup logic.
pub mod implementation {
    use crate::{
        config::{AppState, Config},
        errors::ServerError,
        handlers,
    };
    use axum::Router;
    use axum::http::{Method, header};
    use core::net::SocketAddr;
    use core::str::FromStr;
    use core::time::Duration;
    use secrecy::ExposeSecret;
    use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
    use std::sync::Arc;
    use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
    use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, trace::TraceLayer};

    /// Starts the application server.
    ///
    /// Initializes logging, loads configuration, connects to databases,
    /// and starts the HTTP server with graceful shutdown support.
    ///
    /// # Errors
    ///
    /// Returns `ServerError` if:
    /// - Database connection fails
    /// - Database migrations fail (when enabled)
    /// - Server binding fails
    ///
    /// # Panics
    ///
    /// Panics if:
    /// - Configuration cannot be loaded from environment variables
    /// - `DATABASE_URL` format is invalid
    /// - Redis URL is invalid
    /// - `CORS_ORIGIN` header value is invalid
    /// - TCP listener binding fails
    #[inline]
    pub async fn main() -> Result<(), ServerError> {
        // 1. Initialize logging
        tracing_subscriber::fmt::init();
        dotenv::dotenv().ok();

        // Load environment variables
        let config = Config::from_env().expect("Failed to load configuration");

        let db_options = PgConnectOptions::from_str(config.database_url.expose_secret())
            .map_err(|e| {
                // Log error details server-side without exposing the connection string
                tracing::error!(error = %e, "Failed to parse DATABASE_URL");
            })
            .expect("Invalid DATABASE_URL format - check server logs for details");

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(3))
            .connect_with(db_options)
            .await?;

        // Run migrations
        if std::env::var("RUN_MIGRATIONS").unwrap_or_default() == "true" {
            sqlx::migrate!("../../supabase/migrations")
                .run(&pool)
                .await?;
        }

        tracing::info!("Database connected");

        // 2. Initialize Redis client
        let redis_client =
            redis::Client::open(config.redis_url.clone()).expect("Invalid Redis URL");

        // 3. Build application state
        let state = Arc::new(AppState {
            db: pool,
            redis: redis_client,
            config: config.clone(),
        });

        // 4. Configure rate limiting for auth endpoints (SC-005)
        let auth_rate_limit = Arc::new(
            GovernorConfigBuilder::default()
                .per_second(1)
                .burst_size(15)
                .finish()
                .unwrap_or_default(),
        );

        // 5. Configure CORS (SC-007)
        let cors = CorsLayer::new()
            .allow_origin(
                config
                    .cors_origin
                    .parse::<header::HeaderValue>()
                    .expect("Invalid CORS_ORIGIN"),
            )
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
            .allow_credentials(false);

        // 6. Configure router
        let app = Router::new()
            .merge(handlers::health::router())
            .nest(
                "/api/v1/auth",
                handlers::auth::router().layer(GovernorLayer::new(auth_rate_limit)),
            )
            .nest("/api/v1", handlers::business::router())
            .layer(cors)
            .layer(TraceLayer::new_for_http())
            .layer(RequestBodyLimitLayer::new(1024 * 1024)) // 1MB limit (SC-008)
            .with_state(state);

        let addr = SocketAddr::from(([0, 0, 0, 0], config.port));

        tracing::info!(address = %addr, "Server listening");

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await?;

        Ok(())
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
            () = ctrl_c => {},
            () = terminate => {},
        }

        tracing::info!("Shutting down gracefully...");
    }
}
