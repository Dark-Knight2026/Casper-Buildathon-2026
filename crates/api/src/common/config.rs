//! Application configuration and state management.

use std::sync::Arc;

use config::{Config, Environment};
use rust_decimal::Decimal;
use secrecy::{ExposeSecret, SecretString};
use serde::Deserialize;

use crate::{
    ServerError,
    common::RedisStore,
    providers::{EmailSender, MediaStorage},
};

/// Total BIG token supply (human-readable).
pub const TOTAL_SUPPLY: f64 = 5_000_000_000.0;

/// Flat intermediate struct whose field names match lowercase env var names.
#[derive(Debug, Deserialize)]
struct RawEnvConfig {
    database_url: SecretString,
    redis_url: SecretString,
    supabase_jwt_secret: SecretString,
    #[serde(default = "default_port")]
    port: u16,
    #[serde(default = "default_cors_origin")]
    cors_origin: String,
    /// Base URL of the frontend app, used to build links embedded in
    /// transactional emails (e.g. the email-verification deep link).
    /// Independent of the mailer backend - even `LoggingEmailSender` logs
    /// a link, so this is required regardless of Postmark config.
    #[serde(default = "default_frontend_url")]
    frontend_url: String,
    /// Outer request-body ceiling in MiB. Mirrored into nginx at deploy time
    /// (see `deploy/nginx/https.conf.template`); both layers MUST stay in sync
    /// so the per-handler 413 contract responds before either edge clips the
    /// stream. Defaults to 8 MiB.
    #[serde(default = "default_request_body_limit_mb")]
    request_body_limit_mb: u32,
    /// `Secure` flag toggle for auth cookies. Production/staging deploys must
    /// set `COOKIE_SECURE=true` so HTTPS-only delivery is enforced.
    #[serde(default)]
    cookie_secure: bool,
    /// BIG token contract package hash (hex, no prefix). Shared with `indexer`.
    #[serde(default)]
    contract_big: Option<String>,
    /// Fallback ICO token price in USD (e.g. `"0.50"`).
    /// Used only when `ico_schedules` table is empty.
    #[serde(default)]
    ico_price_usd: Option<String>,
    /// Fallback ICO total allocation in minimal units.
    /// Used only when `ico_schedules` table is empty.
    #[serde(default)]
    ico_total_allocation: Option<String>,
    /// Total BIG token supply (human-readable, e.g. `5000000000`).
    /// Defaults to 5 billion if not set.
    #[serde(default)]
    total_supply: Option<f64>,
    /// S3 bucket name. When set, enables S3-backed `MediaStorage` and
    /// requires the rest of the `S3_*` block (region, endpoint, access
    /// key, secret key). When unset, bootstrap falls back to
    /// `StubMediaStorage` regardless of the other `S3_*` values.
    #[serde(default)]
    s3_bucket: Option<String>,
    #[serde(default)]
    s3_region: Option<String>,
    #[serde(default)]
    s3_endpoint: Option<String>,
    #[serde(default)]
    s3_access_key: Option<SecretString>,
    #[serde(default)]
    s3_secret_key: Option<SecretString>,
    /// Public URL prefix prepended to S3 keys to form fetchable URLs.
    /// Falls back to `{S3_ENDPOINT}/{S3_BUCKET}` when unset; that default
    /// is correct for `MinIO` and AWS path-style (the `with_path_style()`
    /// flag we set), but a virtual-hosted-style bucket
    /// (`{bucket}.s3.{region}.amazonaws.com`) MUST set this explicitly.
    #[serde(default)]
    s3_public_url_base: Option<String>,
    /// Postmark Server Token. When set, enables the Postmark-backed mailer
    /// and the retry-queue worker; requires `POSTMARK_FROM_EMAIL`. When
    /// unset, bootstrap falls back to `LoggingEmailSender` (no delivery).
    #[serde(default)]
    postmark_server_token: Option<SecretString>,
    /// Verified Postmark sender signature used as the `From` address.
    #[serde(default)]
    postmark_from_email: Option<String>,
    /// Per-user cap on email-change requests within the 24h rolling window.
    /// Exposed as env so staging or integration runs can raise it without
    /// recompiling. Pairs with the fixed 24h window enforced in `RedisStore`.
    #[serde(default = "default_email_change_max_attempts")]
    email_change_max_attempts: u64,
}

const fn default_port() -> u16 {
    8080
}
fn default_cors_origin() -> String {
    "http://localhost:8080".to_owned()
}
fn default_frontend_url() -> String {
    "http://localhost:3000".to_owned()
}
const fn default_request_body_limit_mb() -> u32 {
    8
}
const fn default_email_change_max_attempts() -> u64 {
    3
}

/// Fallback ICO configuration from `ICO_PRICE_USD` and `ICO_TOTAL_ALLOCATION` env vars.
///
/// Used only when the `ico_schedules` table is empty (before the indexer
/// processes `ICOScheduleAdded` contract events).
#[derive(Debug, Clone)]
pub struct IcoFallback {
    /// Price per 1 BIG token in USD (e.g. `0.50` = $0.50).
    ///
    /// **Note:** this is NOT the same format as the DB `ico_schedules.price` column,
    /// which stores a U256 with 6 decimals (e.g. `"500000"` = $0.50).
    /// Parsed from `ICO_PRICE_USD` at startup to fail fast on misconfiguration.
    pub price_usd: Decimal,
    /// Total allocation in minimal units (U256 as string, decimals=18).
    pub total_allocation: String,
}

/// S3-compatible media-storage configuration loaded from `S3_*` env vars.
///
/// Present when `S3_BUCKET` is configured; bootstrap uses this block to
/// instantiate [`S3MediaStorage`](crate::providers::S3MediaStorage). When
/// absent, bootstrap falls back to
/// [`StubMediaStorage`](crate::providers::StubMediaStorage) and the rest
/// of the `S3_*` env vars (if any) are ignored.
#[derive(Debug, Clone)]
pub struct S3Config {
    /// Bucket name (e.g. `media-prod`).
    pub bucket: String,
    /// Region identifier (e.g. `us-east-1` for AWS, `auto` for R2,
    /// arbitrary for `MinIO` since path-style is forced).
    pub region: String,
    /// S3 endpoint URL (e.g. `https://s3.us-east-1.amazonaws.com`,
    /// `https://<account>.r2.cloudflarestorage.com`, `http://minio:9000`).
    pub endpoint: String,
    /// Access key, kept out of `Debug`/logs via `SecretString`.
    pub access_key: SecretString,
    /// Secret key, kept out of `Debug`/logs via `SecretString`.
    pub secret_key: SecretString,
    /// Public URL prefix prepended to object keys to form fetchable URLs.
    /// Defaults to `{endpoint}/{bucket}` (path-style); override via
    /// `S3_PUBLIC_URL_BASE` for CDN-fronted or virtual-hosted-style setups.
    pub public_url_base: String,
}

/// Postmark transactional-email configuration loaded from `POSTMARK_*` env vars.
///
/// Present when `POSTMARK_SERVER_TOKEN` is configured; bootstrap uses this
/// block to instantiate [`PostmarkSender`](crate::providers::PostmarkSender)
/// and to gate the retry-queue worker. When absent, bootstrap falls back to
/// [`LoggingEmailSender`](crate::providers::LoggingEmailSender) and the worker
/// is not spawned (a logger never fails, so the queue would never drain).
#[derive(Debug, Clone)]
pub struct PostmarkConfig {
    /// Postmark Server Token, kept out of `Debug`/logs via `SecretString`.
    pub server_token: SecretString,
    /// Verified Postmark sender signature used as the `From` address. An
    /// unverified address turns every send into a `Permanent` failure.
    pub from_email: String,
}

/// Server application configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// `PostgreSQL` database connection URL.
    pub database_url: SecretString,
    /// `Redis` connection URL (wrapped in `SecretString` to prevent credential leaks in logs).
    pub redis_url: SecretString,
    /// Secret key for JWT token signing.
    pub jwt_secret: SecretString,
    /// HTTP server port.
    pub port: u16,
    /// Allowed CORS origin.
    pub cors_origin: String,
    /// Base URL of the frontend app, used to build links embedded in
    /// transactional emails. Defaults to `http://localhost:3000` for dev.
    pub frontend_url: String,
    /// Outer request-body ceiling in MiB, applied uniformly across the router
    /// via `DefaultBodyLimit` and `RequestBodyLimitLayer` in [`crate::server::create_app`].
    ///
    /// Mirrored into nginx (`client_max_body_size`) at deploy time from the same
    /// `REQUEST_BODY_LIMIT_MB` env var; the two layers MUST stay in sync. Per-handler
    /// caps (e.g. `MAX_AVATAR_BYTES`) cut further inside the request lifecycle and
    /// rely on ~3 MiB of multipart headroom above the largest of them, otherwise
    /// `multer` surfaces an oversize body as `IncompleteFieldData -> 400` instead
    /// of the documented `413`.
    pub request_body_limit_mb: u32,
    /// Whether auth cookies are issued with the `Secure` flag. Must be `true`
    /// in any HTTPS deployment, must be `false` for plain-HTTP local dev (the
    /// browser silently drops `Secure` cookies on `http://`, which would break
    /// login). Wired through to `Cookie::build(...).secure(...)` at issuance.
    pub cookie_secure: bool,
    /// BIG token contract package hash (hex, no prefix). `None` when not configured.
    pub contract_big: Option<String>,
    /// Fallback ICO config from env vars. Used when `ico_schedules` table is empty
    /// (e.g. before the indexer processes `ICOScheduleAdded` events).
    pub ico_fallback: Option<IcoFallback>,
    /// Total BIG token supply (human-readable). Defaults to 5 billion.
    pub total_supply: f64,
    /// S3-compatible media storage. `Some` enables the production media
    /// backend; `None` falls back to `StubMediaStorage`. Populated by
    /// `from_env` only when the full `S3_*` block is provided.
    pub s3: Option<S3Config>,
    /// Postmark mailer config. `Some` enables the Postmark-backed
    /// `EmailSender` and the retry-queue worker; `None` falls back to
    /// `LoggingEmailSender`. Populated by `from_env` only when
    /// `POSTMARK_SERVER_TOKEN` (and `POSTMARK_FROM_EMAIL`) are provided.
    pub postmark: Option<PostmarkConfig>,
    /// Per-user cap on email-change requests within the 24h rolling window.
    /// Defaults to 3; raise via `EMAIL_CHANGE_MAX_ATTEMPTS` for staging or
    /// integration runs. Rejected at startup if 0 (would lock every user out).
    pub email_change_max_attempts: u64,
}

impl ServerConfig {
    /// Loads and validates configuration from environment variables.
    ///
    /// # Errors
    ///
    /// Returns an error string if:
    /// - Required environment variables are missing
    /// - `REDIS_URL` doesn't start with `redis://` or `rediss://`
    /// - `PORT` is not a valid number or is zero
    /// - `CORS_ORIGIN` doesn't start with `http://` or `https://`
    #[inline]
    pub fn from_env() -> Result<Self, ServerError> {
        let raw: RawEnvConfig = Config::builder()
            .add_source(Environment::default().try_parsing(true).ignore_empty(true))
            .build()
            .and_then(Config::try_deserialize)
            .map_err(|e| ServerError::EnvVar(e.to_string()))?;

        let ico_fallback = match (raw.ico_price_usd, raw.ico_total_allocation) {
            (Some(price_str), Some(total_allocation)) => {
                let price_usd: Decimal = price_str.parse().map_err(|_| {
                    ServerError::EnvVar(format!(
                        "ICO_PRICE_USD must be a valid decimal, got \"{price_str}\""
                    ))
                })?;
                Some(IcoFallback {
                    price_usd,
                    total_allocation,
                })
            }
            (Some(_), None) => {
                tracing::warn!(
                    "ICO_PRICE_USD set but ICO_TOTAL_ALLOCATION missing - ICO fallback disabled"
                );
                None
            }
            (None, Some(_)) => {
                tracing::warn!(
                    "ICO_TOTAL_ALLOCATION set but ICO_PRICE_USD missing - ICO fallback disabled"
                );
                None
            }
            (None, None) => None,
        };

        let s3 = match raw.s3_bucket {
            Some(bucket) => {
                let region = raw.s3_region.ok_or_else(|| {
                    ServerError::EnvVar("S3_BUCKET set but S3_REGION missing".to_owned())
                })?;
                let endpoint = raw.s3_endpoint.ok_or_else(|| {
                    ServerError::EnvVar("S3_BUCKET set but S3_ENDPOINT missing".to_owned())
                })?;
                let access_key = raw.s3_access_key.ok_or_else(|| {
                    ServerError::EnvVar("S3_BUCKET set but S3_ACCESS_KEY missing".to_owned())
                })?;
                let secret_key = raw.s3_secret_key.ok_or_else(|| {
                    ServerError::EnvVar("S3_BUCKET set but S3_SECRET_KEY missing".to_owned())
                })?;
                let public_url_base = raw.s3_public_url_base.map_or_else(
                    || format!("{}/{bucket}", endpoint.trim_end_matches('/')),
                    |s| s.trim_end_matches('/').to_owned(),
                );
                Some(S3Config {
                    bucket,
                    region,
                    endpoint,
                    access_key,
                    secret_key,
                    public_url_base,
                })
            }
            None => None,
        };

        let postmark = match raw.postmark_server_token {
            Some(server_token) => {
                let from_email = raw.postmark_from_email.ok_or_else(|| {
                    ServerError::EnvVar(
                        "POSTMARK_SERVER_TOKEN set but POSTMARK_FROM_EMAIL missing".to_owned(),
                    )
                })?;
                Some(PostmarkConfig {
                    server_token,
                    from_email,
                })
            }
            None => None,
        };

        let config = Self {
            database_url: raw.database_url,
            redis_url: raw.redis_url,
            jwt_secret: raw.supabase_jwt_secret,
            port: raw.port,
            cors_origin: raw.cors_origin,
            frontend_url: raw.frontend_url,
            request_body_limit_mb: raw.request_body_limit_mb,
            cookie_secure: raw.cookie_secure,
            contract_big: raw.contract_big.map(|s| s.to_ascii_lowercase()),
            ico_fallback,
            total_supply: raw.total_supply.unwrap_or(TOTAL_SUPPLY),
            s3,
            postmark,
            email_change_max_attempts: raw.email_change_max_attempts,
        };

        config.validate()?;
        Ok(config)
    }

    /// Validates business rules that serde cannot express.
    fn validate(&self) -> Result<(), ServerError> {
        let redis = self.redis_url.expose_secret();
        if !redis.starts_with("redis://") && !redis.starts_with("rediss://") {
            return Err(ServerError::EnvVar(
                "REDIS_URL must start with redis:// or rediss://".to_owned(),
            ));
        }
        if self.port == 0 {
            return Err(ServerError::EnvVar("PORT cannot be 0".to_owned()));
        }
        if self.request_body_limit_mb < 8 {
            return Err(ServerError::EnvVar(
                "REQUEST_BODY_LIMIT_MB must be at least 8 MiB: 5 MiB MAX_AVATAR_BYTES \
                 + 3 MiB multipart headroom (see server.rs), otherwise oversize \
                 multipart bodies are cut mid-parse and surface as 400 instead of 413"
                    .to_owned(),
            ));
        }
        if self.request_body_limit_mb > 100 {
            return Err(ServerError::EnvVar(
                "REQUEST_BODY_LIMIT_MB must not exceed 100 MiB: the field is a u32 \
                 mirrored into nginx and both axum body-limit layers, so a typo like \
                 10000 silently configures a multi-GiB cap. The only multipart upload \
                 is the 5 MiB avatar, so 100 MiB is ample headroom; a larger value is a \
                 memory-exhaustion foot-gun, not a real requirement"
                    .to_owned(),
            ));
        }
        if !self.cors_origin.starts_with("http://") && !self.cors_origin.starts_with("https://") {
            return Err(ServerError::EnvVar(
                "CORS_ORIGIN must start with http:// or https://".to_owned(),
            ));
        }
        let secret_len = self.jwt_secret.expose_secret().len();
        if secret_len < 64 {
            return Err(ServerError::EnvVar(format!(
                "SUPABASE_JWT_SECRET must be at least 64 bytes for HS256 security, got {secret_len}"
            )));
        }
        if self.email_change_max_attempts == 0 {
            return Err(ServerError::EnvVar(
                "EMAIL_CHANGE_MAX_ATTEMPTS cannot be 0 (would lock every user out)".to_owned(),
            ));
        }
        if let Some(s3) = &self.s3 {
            // Reject any value that lacks an explicit scheme - bare hosts
            // (`s3.amazonaws.com`) and bare paths bubble up as opaque SDK
            // errors at first PUT, long after the process is past startup.
            // Catching them in `validate()` turns a runtime mystery into a
            // fail-fast EnvVar error the operator sees in the boot log.
            //
            // `rust-s3` itself accepts unscoped strings and treats them as
            // path components, so this guard is the only line of defence.
            let endpoint = &s3.endpoint;
            if !endpoint.starts_with("http://") && !endpoint.starts_with("https://") {
                return Err(ServerError::EnvVar(format!(
                    "S3_ENDPOINT must start with http:// or https://, got \"{endpoint}\""
                )));
            }
            // `http://` is fine for loopback (compose dev, integration tests)
            // but transmits credentials and avatar bytes in plaintext over
            // any other route. A `warn!` here keeps the misconfiguration
            // observable without breaking known-good local setups.
            if endpoint.starts_with("http://")
                && !endpoint.contains("localhost")
                && !endpoint.contains("127.0.0.1")
                && !endpoint.contains("minio")
            {
                tracing::warn!(
                    endpoint = %endpoint,
                    "S3_ENDPOINT uses http:// on a non-loopback host; credentials and uploads transit in plaintext",
                );
            }
        }
        Ok(())
    }
}

/// Global application state shared across request handlers.
#[derive(Clone)]
pub struct AppState {
    /// `PostgreSQL` connection pool.
    pub db: sqlx::PgPool,
    /// `Redis` client wrapper for caching and session storage.
    pub redis: RedisStore,
    /// Outbound email sender. Boxed-trait so the bootstrap can swap
    /// `LoggingEmailSender` (dev/test) for an SMTP/transactional-API
    /// implementation in production without touching call sites.
    pub mailer: Arc<dyn EmailSender>,
    /// Media-blob storage (avatars, property images, lease PDFs). Boxed-trait
    /// so the bootstrap can swap `StubMediaStorage` (dev/test) for an
    /// S3-compatible implementation in production without touching call sites.
    pub media_storage: Arc<dyn MediaStorage>,
    /// Application configuration.
    pub config: ServerConfig,
}

impl core::fmt::Debug for AppState {
    #[inline]
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.debug_struct("AppState")
            .field("db", &"PgPool")
            .field("redis", &"RedisStore")
            .field("mailer", &"EmailSender")
            .field("media_storage", &"MediaStorage")
            .field("config", &self.config)
            .finish()
    }
}
