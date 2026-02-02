pub mod auth;
pub mod config;
pub mod crypto;
pub mod errors;
pub mod handlers;
pub mod models;

pub mod implementation {
    use crate::{
        config::{AppState, Config},
        errors::ServerError,
        handlers,
    };
    use axum::Router;
    use secrecy::ExposeSecret;
    use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
    use std::net::SocketAddr;
    use std::str::FromStr;
    use std::sync::Arc;
    use std::time::Duration;
    use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
    use tower_http::trace::TraceLayer;

    #[inline]
    pub async fn main() -> Result<(), ServerError> {
        // 1. Initialize logging
        tracing_subscriber::fmt::init();
        dotenv::dotenv().ok();

        // Load environment variables
        let config = Config::from_env().expect("Failed to load configuration");

        let db_options = PgConnectOptions::from_str(config.database_url.expose_secret())
            .expect("Invalid DATABASE_URL");

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(3))
            .connect_with(db_options)
            .await
            .expect("Failed to connect to Postgres");

        // Run migrations
        if std::env::var("RUN_MIGRATIONS").unwrap_or_default() == "true" {
            sqlx::migrate!("./supabase/migrations")
                .run(&pool)
                .await
                .expect("Failed to run migrations");
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

        // 5. Configure router
        let app = Router::new()
            .merge(handlers::health::router())
            .nest(
                "/api/v1/auth",
                handlers::auth::router().layer(GovernorLayer::new(auth_rate_limit)),
            )
            .nest("/api/v1", handlers::business::router())
            .layer(TraceLayer::new_for_http())
            .with_state(state);

        let addr = SocketAddr::from(([0, 0, 0, 0], config.port));

        tracing::info!("🚀 Server listening on {}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await
            .unwrap();

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
            _ = ctrl_c => {},
            _ = terminate => {},
        }

        tracing::info!("Shutting down gracefully...");
    }
}
