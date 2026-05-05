//! Server implementation and startup logic.

use core::{net::SocketAddr, str::FromStr, time::Duration};
use std::env;
use std::sync::Arc;

use axum::{
    Router,
    http::{Method, header::{HeaderValue, CONTENT_TYPE}},
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
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, trace::TraceLayer};
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};
#[cfg(debug_assertions)]
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    ApiDoc, AppState, EmailSender, LoggingEmailSender, RedisStore, ServerConfig, ServerError,
    onchain, services,
};

/// Creates the full application router combining public and protected routes.
#[inline]
pub fn create_router(state: Arc<AppState>) -> Router {
    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(services::health::handlers::health_check))
        .nest("/api/v1/auth", services::public_router())
        .nest("/api/v1", services::protected_router(state.clone()))
        .nest("/api/v1", onchain::router())
        .with_state(state)
        .split_for_parts();

    #[cfg(debug_assertions)]
    let router = router.merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api));
    #[cfg(not(debug_assertions))]
    drop(api);

    router
}

/// Maximum request body size (1 MB).
const REQUEST_BODY_LIMIT: usize = 1024 * 1024;

/// Builds the full application router with production middleware (CORS, tracing, body limit).
///
/// # Errors
///
/// Returns `ServerError::EnvVar` when:
/// - `CORS_ORIGIN` is the wildcard `*` (incompatible with cookie auth: the
///   browser refuses `Access-Control-Allow-Origin: *` together with
///   `Access-Control-Allow-Credentials: true`, so the wildcard would
///   silently break the entire authenticated surface);
/// - `CORS_ORIGIN` is not a valid HTTP header value.
#[inline]
pub fn create_app(state: Arc<AppState>) -> Result<Router, ServerError> {
    let cors_origin = state.config.cors_origin.trim();
    if cors_origin == "*" {
        return Err(ServerError::EnvVar(
            "CORS_ORIGIN must be an explicit origin (wildcard `*` is rejected by browsers when allow_credentials=true)".to_owned(),
        ));
    }
    let cors = CorsLayer::new()
        .allow_origin(
            cors_origin
                .parse::<HeaderValue>()
                .map_err(|e| ServerError::EnvVar(format!("Invalid CORS_ORIGIN: {e}")))?,
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
        ])
        .allow_headers([CONTENT_TYPE])
        .allow_credentials(true);

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
    let redis_client = redis::Client::open(config.redis_url.expose_secret()).map_err(|e| {
        tracing::error!(error = %e, "Failed to parse REDIS_URL");
        ServerError::EnvVar("Invalid Redis URL".to_owned())
    })?;
    let redis_store = RedisStore::new(redis_client).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to connect to Redis");
        ServerError::EnvVar("Redis connection failed".to_owned())
    })?;

    // Bootstrap a no-delivery mailer. Real-provider impls (SMTP, SES) are
    // a follow-up: they will be selected here based on env config without
    // changes to handlers, since AppState holds the mailer behind the
    // `EmailSender` trait object.
    let mailer: Arc<dyn EmailSender> = Arc::new(LoggingEmailSender);

    // 3. Build application state
    let state = Arc::new(AppState {
        db: pool,
        redis: redis_store,
        mailer,
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
