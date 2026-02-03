//! Server implementation and startup logic.

use crate::{
    analytics, auth,
    common::{AppState, Config, ServerError},
    health,
    openapi::ApiDoc,
    tax,
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
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};
use utoipa_swagger_ui::SwaggerUi;

/// Creates an `OpenAPI` router for public API endpoints that do not require authentication.
///
/// Includes rate limiting:
/// - Authentication endpoints (`/auth/*`)
#[inline]
pub fn public_router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(1)
            .burst_size(15)
            .finish()
            .unwrap_or_default(),
    );

    OpenApiRouter::new()
        .routes(routes!(auth::handlers::get_nonce))
        .routes(routes!(auth::handlers::login))
        .route_layer(GovernorLayer::new(rate_limit))
}

/// Creates an `OpenAPI` router for protected endpoints that require JWT authentication.
///
/// Authentication is enforced via the `AuthUser` extractor in handlers.
///
/// Includes:
/// - Tax endpoints (`/tax/*`)
/// - Analytics endpoints (`/analytics/*`)
#[inline]
pub fn protected_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(tax::handlers::calculate_tax_liability))
        .routes(routes!(analytics::handlers::get_property_performance))
}

/// Creates the full application router combining public and protected routes.
///
/// Route structure:
/// - `/health` - Health check (no rate limiting)
/// - `/api/v1/auth/*` - Authentication (rate limited)
/// - `/api/v1/*` - Protected endpoints (require JWT)
/// - `/swagger-ui` - `OpenAPI` documentation UI
/// - `/api-docs/openapi.json` - `OpenAPI` specification
///
/// # Arguments
///
/// * `state` - The shared application state.
#[inline]
pub fn create_router(state: Arc<AppState>) -> Router {
    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(health::handlers::health_check))
        .nest("/api/v1/auth", public_router())
        .nest("/api/v1", protected_router())
        .with_state(state)
        .split_for_parts();

    router.merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api))
}

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
    let redis_client = redis::Client::open(config.redis_url.clone()).expect("Invalid Redis URL");

    // 3. Build application state
    let state = Arc::new(AppState {
        db: pool,
        redis: redis_client,
        config: config.clone(),
    });

    // 4. Configure CORS
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

    // 5. Configure router with production middleware
    let app = create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(RequestBodyLimitLayer::new(1024 * 1024)); // 1MB limit

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));

    tracing::info!(address = %addr, "Server listening");

    let listener = tokio::net::TcpListener::bind(addr).await?;
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
