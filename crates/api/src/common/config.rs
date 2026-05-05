//! Application configuration and state management.

use std::sync::Arc;

use config::{Config, Environment};
use rust_decimal::Decimal;
use secrecy::{ExposeSecret, SecretString};
use serde::Deserialize;

use crate::{
    ServerError,
    common::{EmailSender, MediaStorage, RedisStore},
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
    /// Base URL the dev/test stub media storage prefixes onto non-image
    /// keys. Image keys (`avatars/...`) get a `data:image/svg+xml`
    /// placeholder regardless of this value. Production deployments will
    /// replace `StubMediaStorage` with an S3-backed implementation that
    /// ignores this field entirely.
    #[serde(default)]
    media_stub_base_url: Option<String>,
}

const fn default_port() -> u16 {
    8080
}
fn default_cors_origin() -> String {
    "http://localhost:8080".to_owned()
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
    /// Base URL prepended to non-image keys by [`StubMediaStorage`]. `None`
    /// falls back to the stub's built-in default. Has no effect on image
    /// keys (which always render as a `data:` placeholder) or on
    /// production S3-backed implementations.
    pub media_stub_base_url: Option<String>,
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

        let config = Self {
            database_url: raw.database_url,
            redis_url: raw.redis_url,
            jwt_secret: raw.supabase_jwt_secret,
            port: raw.port,
            cors_origin: raw.cors_origin,
            cookie_secure: raw.cookie_secure,
            contract_big: raw.contract_big.map(|s| s.to_ascii_lowercase()),
            ico_fallback,
            total_supply: raw.total_supply.unwrap_or(TOTAL_SUPPLY),
            media_stub_base_url: raw.media_stub_base_url,
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
