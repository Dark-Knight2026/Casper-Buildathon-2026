//! Server implementation and startup logic.

use core::{net::SocketAddr, str::FromStr, time::Duration};
use std::env;
use std::sync::Arc;

use axum::{
    Router,
    http::{Method, header},
};
use secrecy::ExposeSecret;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use tokio::{
    net::TcpListener,
    signal::{
        self,
        unix::{self, SignalKind},
    },
};
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, trace::TraceLayer};
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    ApiDoc, AppState, RedisStore, ServerConfig, ServerError, analytics, auth, health, ico, tax,
    transactions,
};

// Public router ---------------------------------------------------------------

/// Rate limit: requests allowed per second for auth endpoints.
pub const AUTH_RATE_LIMIT_PER_SECOND: u64 = 1;

/// Rate limit: maximum burst size for auth endpoints.
pub const AUTH_RATE_LIMIT_BURST: u32 = 15;

/// Creates an `OpenAPI` router for public API endpoints that do not require
/// authentication.
///
/// Includes rate limiting:
/// - Authentication endpoints (`/auth/*`)
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid (e.g. zero burst size).
#[inline]
pub fn public_router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(AUTH_RATE_LIMIT_PER_SECOND)
            .burst_size(AUTH_RATE_LIMIT_BURST)
            .finish()
            .expect("auth rate-limit config is always valid: per_second > 0 and burst_size > 0"),
    );

    OpenApiRouter::new()
        .routes(routes!(auth::handlers::get_nonce))
        .routes(routes!(auth::handlers::login))
        .route_layer(GovernorLayer::new(rate_limit))
}

// Public data router ----------------------------------------------------------

/// Rate limit: requests allowed per second for public data endpoints.
pub const PUBLIC_DATA_RATE_LIMIT_PER_SECOND: u64 = 5;

/// Rate limit: maximum burst size for public data endpoints.
pub const PUBLIC_DATA_RATE_LIMIT_BURST: u32 = 30;

/// Creates a rate-limited `OpenAPI` router for public data endpoints (no auth).
///
/// - `GET /ico/progress` - ICO sale progress
/// - `GET /ico/balance/{address}` - ICO balance for an account
/// - `GET /transactions/token/big` - BIG token transactions
/// - `GET /transactions/account/{address}` - account transaction history
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid (e.g. zero burst size).
#[inline]
#[must_use]
pub fn public_data_router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(PUBLIC_DATA_RATE_LIMIT_PER_SECOND)
            .burst_size(PUBLIC_DATA_RATE_LIMIT_BURST)
            .finish()
            .expect(
                "public-data rate-limit config is always valid: per_second > 0 and burst_size > 0",
            ),
    );

    OpenApiRouter::new()
        .nest("/transactions", transactions_router())
        .nest("/ico", ico_router())
        .route_layer(GovernorLayer::new(rate_limit))
}

// Protected router ------------------------------------------------------------

/// Creates an `OpenAPI` router for protected endpoints that require JWT
/// authentication.
///
/// Authentication is enforced via the `AuthUser` extractor in handlers.
#[inline]
pub fn protected_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(tax::handlers::calculate_tax_liability))
        .routes(routes!(analytics::handlers::get_property_performance))
}

/// Creates an `OpenAPI` router for blockchain transaction endpoints
#[inline]
pub fn transactions_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(transactions::handlers::get_account_transactions))
        .routes(routes!(transactions::handlers::get_big_token_transactions))
}

/// Creates an `OpenAPI` router for ICO endpoints
#[inline]
pub fn ico_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(ico::handlers::get_ico_balance))
        .routes(routes!(ico::handlers::get_ico_progress))
}

// Full router -----------------------------------------------------------------

/// Creates the full application router combining public and protected routes.
#[inline]
pub fn create_router(state: Arc<AppState>) -> Router {
    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(health::handlers::health_check))
        .nest("/api/v1/auth", public_router())
        .nest("/api/v1", public_data_router())
        .nest("/api/v1", protected_router())
        .with_state(state)
        .split_for_parts();

    router.merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api))
}

// Application -----------------------------------------------------------------

/// Maximum request body size (1 MB).
const REQUEST_BODY_LIMIT: usize = 1024 * 1024;

/// Builds the full application router with production middleware (CORS, tracing, body limit).
///
/// # Errors
///
/// Returns `ServerError::EnvVar` if `CORS_ORIGIN` is not a valid HTTP header value.
#[inline]
pub fn create_app(state: Arc<AppState>) -> Result<Router, ServerError> {
    let cors = CorsLayer::new()
        .allow_origin(
            state
                .config
                .cors_origin
                .parse::<header::HeaderValue>()
                .map_err(|e| ServerError::EnvVar(format!("Invalid CORS_ORIGIN: {e}")))?,
        )
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(false);

    Ok(create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(RequestBodyLimitLayer::new(REQUEST_BODY_LIMIT)))
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
/// - `CORS_ORIGIN` header value is invalid
/// - Signal handlers cannot be installed
/// - Server binding fails
#[inline]
pub async fn main() -> Result<(), ServerError> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    dotenv::dotenv().ok();

    // Load environment variables
    let config = ServerConfig::from_env()?;
    let db_options =
        PgConnectOptions::from_str(config.database_url.expose_secret()).map_err(|e| {
            // Log error details server-side without exposing the connection string
            tracing::error!(error = %e, "Failed to parse DATABASE_URL");
            ServerError::EnvVar(
                "Invalid DATABASE_URL format - check server logs for details".to_owned(),
            )
        })?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect_with(db_options)
        .await?;

    // Run migrations
    if env::var("RUN_MIGRATIONS").unwrap_or_default() == "true" {
        sqlx::migrate!("../../supabase/migrations")
            .run(&pool)
            .await?;
    }
    tracing::info!("Database connected");

    // Initialize Redis store
    let redis_client = redis::Client::open(config.redis_url.clone()).map_err(|e| {
        tracing::error!(error = %e, "Failed to parse REDIS_URL");
        ServerError::EnvVar("Invalid Redis URL".to_owned())
    })?;

    // 3. Build application state
    let state = Arc::new(AppState {
        db: pool,
        redis: RedisStore::new(redis_client),
        config: config.clone(),
    });

    // 4. Build app with production middleware
    let app = create_app(state)?;
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!(address = %addr, "Server listening");
    let listener = TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    Ok(())
}

/// Awaits a shutdown signal (e.g., Ctrl+C) to gracefully shut down the server.
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler - OS may not support graceful shutdown");
    };

    #[cfg(unix)]
    let terminate = async {
        unix::signal(SignalKind::terminate())
            .expect("Failed to install SIGTERM handler - OS may not support graceful shutdown")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = core::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }

    tracing::info!("Shutting down gracefully...");
}
