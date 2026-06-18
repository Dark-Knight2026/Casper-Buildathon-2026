//! Server implementation and startup logic.

use core::{net::SocketAddr, str::FromStr, time::Duration};
use std::env;
use std::sync::Arc;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{
        Method,
        header::{CONTENT_TYPE, HeaderValue},
    },
};
use secrecy::ExposeSecret;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use tokio::{
    net::TcpListener,
    signal::{
        self,
        unix::{self, SignalKind},
    },
    sync::broadcast::{self, Sender},
};
use tower_http::{cors::CorsLayer, limit::RequestBodyLimitLayer, trace::TraceLayer};
use utoipa::OpenApi;
use utoipa_axum::{router::OpenApiRouter, routes};
#[cfg(debug_assertions)]
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    ApiDoc, AppState, BackgroundCheckProvider, ContentPinner, EmailSender, FairHousingScreen,
    FakeBackgroundCheckProvider, FakeKycProvider, FakeLeaseChainReader, FakePinner, KycProvider,
    LeaseChainReader, LeaseDocumentRenderer, LoggingEmailSender, MetadataStripper,
    NoopMetadataStripper, PostmarkSender, RedisStore, S3MediaStorage, ServerConfig, ServerError,
    SharedMediaStorage, SimpleLeaseDocumentRenderer, StubFairHousingScreen, StubMediaStorage,
    onchain, services, workers,
};

/// Creates the full application router combining public and protected routes.
#[inline]
pub fn create_router(state: Arc<AppState>) -> Router {
    let (router, api) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(services::health::handlers::health_check))
        .nest("/api/v1/auth", services::public_router())
        .nest("/api/v1", services::protected_router(state.clone()))
        .nest("/api/v1", services::marketplace_router())
        .nest("/api/v1", onchain::router())
        .with_state(state)
        .split_for_parts();

    #[cfg(debug_assertions)]
    let router = router.merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", api));
    #[cfg(not(debug_assertions))]
    drop(api);

    router
}

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

    // Outer body cap (sized in MiB via `REQUEST_BODY_LIMIT_MB`, mirrored into
    // nginx at deploy time so both edges share the same ceiling). Applied to
    // BOTH `DefaultBodyLimit` and `RequestBodyLimitLayer`: axum's 2 MiB default
    // would otherwise clip multipart streams above 2 MiB before the eager
    // Content-Length check fires, surfacing as a `MultipartError -> 400`
    // instead of the documented 413 from per-handler caps (e.g. `MAX_AVATAR_BYTES`).
    let body_limit_bytes = (state.config.request_body_limit_mb as usize) * 1024 * 1024;

    Ok(create_router(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(DefaultBodyLimit::max(body_limit_bytes))
        .layer(RequestBodyLimitLayer::new(body_limit_bytes)))
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
#[allow(clippy::too_many_lines)]
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
    let redis_store = RedisStore::new(redis_client, config.email_change_max_attempts)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to connect to Redis");
            ServerError::EnvVar("Redis connection failed".to_owned())
        })?;

    // Select the mailer based on env config: `POSTMARK_SERVER_TOKEN` set ->
    // Postmark backend, unset -> `LoggingEmailSender` with a warning log.
    // AppState holds the mailer behind the `EmailSender` trait object, so
    // handlers do not branch on the concrete backend. The retry-queue worker
    // below is gated on the same condition (a logger never fails, so its
    // queue would never drain).
    let mailer: Arc<dyn EmailSender> = if let Some(postmark) = &config.postmark {
        Arc::new(PostmarkSender::new(
            &postmark.server_token,
            &postmark.from_email,
        ))
    } else {
        tracing::warn!(
            event = "mailer_logging_stub",
            "POSTMARK_SERVER_TOKEN unset - using LoggingEmailSender (no real delivery). Production MUST configure POSTMARK_SERVER_TOKEN + POSTMARK_FROM_EMAIL."
        );
        Arc::new(LoggingEmailSender)
    };

    // Select media storage based on env config: `S3_BUCKET` set -> S3
    // backend, unset -> `StubMediaStorage` with a warning log. AppState
    // holds the storage behind the `MediaStorage` trait object, so
    // handlers do not branch on the concrete backend.
    let media_storage: SharedMediaStorage = if let Some(s3_conf) = &config.s3 {
        Arc::new(S3MediaStorage::new(
            &s3_conf.bucket,
            s3_conf.region.clone(),
            s3_conf.endpoint.clone(),
            s3_conf.access_key.expose_secret(),
            s3_conf.secret_key.expose_secret(),
            s3_conf.public_url_base.clone(),
        )?)
    } else {
        tracing::warn!(
            event = "media_storage_stub",
            "S3_BUCKET unset - using StubMediaStorage. Production MUST configure S3_BUCKET + S3_REGION + S3_ENDPOINT + S3_ACCESS_KEY + S3_SECRET_KEY."
        );
        Arc::new(StubMediaStorage::new())
    };

    // No real KYC provider exists yet, so the listing authority gate runs
    // against a fake that auto-verifies every identity. A real provider
    // (Persona/TransUnion) will be selected here by config, mirroring the
    // mailer/media-storage bootstrap above.
    let kyc: Arc<dyn KycProvider> = {
        tracing::warn!(
            event = "kyc_provider_stub",
            "No real KYC provider configured - using FakeKycProvider (auto-verifies every identity). Production MUST wire a real provider before the authority gate can be trusted."
        );
        Arc::new(FakeKycProvider::new())
    };

    // The Fair Housing screen has no real backend yet, so listing free-text is
    // screened by a stub technical blocklist. The official CO/GC ruleset will
    // be selected here by config when delivered.
    let fair_housing: Arc<dyn FairHousingScreen> = {
        tracing::warn!(
            event = "fair_housing_screen_stub",
            "No real Fair Housing ruleset configured - using StubFairHousingScreen (coarse substring blocklist, not a compliance control). Production MUST wire the official CO/GC ruleset before the gate can be trusted."
        );
        Arc::new(StubFairHousingScreen::new())
    };

    // No real IPFS provider exists yet, so listing media is pinned by a fake
    // that returns a deterministic synthetic CID without storing the bytes. A
    // real node/provider will be selected here by config when delivered.
    let content_pinner: Arc<dyn ContentPinner> = {
        tracing::warn!(
            event = "content_pinner_stub",
            "No real IPFS provider configured - using FakePinner (synthetic CID, content is NOT retrievable). Production MUST wire a real IPFS node/provider."
        );
        Arc::new(FakePinner::new())
    };

    // No real EXIF/GPS stripper is wired yet, so uploaded media keeps its
    // metadata. A real byte-level stripper will be selected here by config.
    let metadata_stripper: Arc<dyn MetadataStripper> = {
        tracing::warn!(
            event = "metadata_stripper_noop",
            "No real metadata stripper configured - using NoopMetadataStripper (EXIF/GPS is NOT stripped from uploads). Production MUST wire a real stripper before media upload can be trusted."
        );
        Arc::new(NoopMetadataStripper::new())
    };

    // No real CSPR RPC reader exists yet, so `/commit` reconciliation trusts the
    // landlord's submitted params via a fake that reports every deposit/invoice
    // as paid. A real Lease/Escrow RPC reader will be selected here by config.
    let lease_chain_reader: Arc<dyn LeaseChainReader> = {
        tracing::warn!(
            event = "lease_chain_reader_stub",
            "No real LeaseChainReader configured - using FakeLeaseChainReader (treats every commit as consistent, no on-chain check). Production MUST wire a real CSPR RPC reader before lease activation can be trusted."
        );
        Arc::new(FakeLeaseChainReader::new())
    };

    // No real document renderer is wired yet, so lease documents are rendered as
    // deterministic plain text. A real templated-PDF renderer will be selected
    // here by config when delivered.
    let lease_document_renderer: Arc<dyn LeaseDocumentRenderer> = {
        tracing::warn!(
            event = "lease_document_renderer_stub",
            "No real lease document renderer configured - using SimpleLeaseDocumentRenderer (plain text, not a legal PDF). Production MUST wire a real renderer before lease documents can be trusted."
        );
        Arc::new(SimpleLeaseDocumentRenderer::new())
    };

    // No real background-check bureau is wired yet, so applicant screening runs
    // against a fake that auto-clears every check. A real bureau
    // (TransUnion/Checkr) will be selected here by config when delivered.
    let background_check: Arc<dyn BackgroundCheckProvider> = {
        tracing::warn!(
            event = "background_check_stub",
            "No real background-check provider configured - using FakeBackgroundCheckProvider (auto-clears every check). Production MUST wire a real bureau before screening can be trusted."
        );
        Arc::new(FakeBackgroundCheckProvider::new())
    };

    // 3. Build application state
    let state = Arc::new(AppState {
        db: pool,
        redis: redis_store,
        mailer,
        media_storage,
        kyc,
        fair_housing,
        content_pinner,
        metadata_stripper,
        lease_chain_reader,
        lease_document_renderer,
        background_check,
        config: config.clone(),
    });

    // Shutdown broadcast fans out to background workers; real subscribers are
    // added at spawn time via `shutdown_tx.subscribe()`. Created before the
    // worker spawn so the worker can subscribe before HTTP serving begins.
    //
    // Capacity 1 is deliberate: the channel only ever carries a single value -
    // the one-shot shutdown edge sent once from `notify_workers`. A buffer of 1
    // holds that single message per subscriber, so no slow subscriber can ever
    // overflow it; a larger capacity would be dead space for a signal that is
    // sent exactly once.
    let (shutdown_tx, _) = broadcast::channel::<()>(1);

    // Spawn background workers. `spawn_all` always runs the listing auto-expiry
    // worker and internally gates the email retry worker on
    // `mailer.uses_retry_queue()` - under a stub mailer no send ever fails, so
    // its queue would never receive a row. Clones are cheap - `db` is an
    // Arc-backed pool and `mailer` is already a trait object behind `Arc`.
    let worker_handles = workers::spawn_all(state.db.clone(), state.mailer.clone(), &shutdown_tx);

    // 4. Build app with production middleware
    let app = create_app(state)?;
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!(address = %addr, "Server listening");
    let listener = TcpListener::bind(addr).await?;

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(wait_and_notify_shutdown(shutdown_tx))
    .await?;

    // `serve` has returned, which means `wait_and_notify_shutdown` already
    // fired the broadcast - every worker's `select!` has observed the signal.
    // Await each so its in-flight tick drains before the process exits.
    for handle in worker_handles {
        if let Err(err) = handle.await {
            tracing::warn!(?err, "background worker panicked during shutdown");
        }
    }

    Ok(())
}

/// Composes signal-wait + worker-broadcast into the single future that
/// `axum::serve.with_graceful_shutdown` consumes.
///
/// Order matters: HTTP server starts draining the moment this future resolves,
/// so the broadcast is sent *before* the await completes - otherwise workers
/// would only learn about shutdown after `axum::serve` has already returned,
/// defeating the point of graceful coordination.
async fn wait_and_notify_shutdown(tx: Sender<()>) {
    shutdown_signal().await;
    notify_workers(&tx);
}

/// Awaits a shutdown signal (e.g., Ctrl+C) to gracefully shut down the server.
async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(err) = signal::ctrl_c().await {
            tracing::warn!(
                error = %err,
                "Ctrl+C handler unavailable - graceful shutdown via Ctrl+C disabled",
            );
            core::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match unix::signal(SignalKind::terminate()) {
            Ok(mut sig) => {
                sig.recv().await;
            }
            Err(err) => {
                tracing::warn!(
                    error = %err,
                    "SIGTERM handler unavailable - graceful shutdown via SIGTERM disabled",
                );
                core::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = core::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }

    tracing::info!("Shutting down gracefully...");
}

/// Fan-out of the shutdown edge to every active background subscriber.
///
/// `Err(SendError)` means no subscribers - not a failure, just a deployment
/// without background workers.
#[inline]
pub fn notify_workers(tx: &Sender<()>) {
    match tx.send(()) {
        Ok(subscribers) => {
            tracing::debug!(subscribers, "shutdown broadcast delivered");
        }
        Err(_) => {
            tracing::debug!("shutdown broadcast had no subscribers");
        }
    }
}
