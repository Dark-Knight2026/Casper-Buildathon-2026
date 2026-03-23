//! Application configuration and state management.

use config::{Config, Environment};
use secrecy::{ExposeSecret, SecretString};
use serde::Deserialize;

use crate::{ServerError, common::RedisStore};

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
    /// Price per 1 BIG token in USD as a plain decimal string (e.g. `"0.50"` = $0.50).
    ///
    /// **Note:** this is NOT the same format as the DB `ico_schedules.price` column,
    /// which stores a U256 with 6 decimals (e.g. `"500000"` = $0.50).
    /// Stored as `String` to avoid `f64` precision loss when converting to `Decimal`.
    pub price_usd: String,
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
    /// BIG token contract package hash (hex, no prefix). `None` when not configured.
    pub contract_big: Option<String>,
    /// Fallback ICO config from env vars. Used when `ico_schedules` table is empty
    /// (e.g. before the indexer processes `ICOScheduleAdded` events).
    pub ico_fallback: Option<IcoFallback>,
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
            (Some(price_usd), Some(total_allocation)) => Some(IcoFallback {
                price_usd,
                total_allocation,
            }),
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
            contract_big: raw.contract_big.map(|s| s.to_ascii_lowercase()),
            ico_fallback,
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
        if secret_len < 32 {
            return Err(ServerError::EnvVar(format!(
                "SUPABASE_JWT_SECRET must be at least 32 bytes, got {secret_len}"
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
    /// Application configuration.
    pub config: ServerConfig,
}

impl core::fmt::Debug for AppState {
    #[inline]
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.debug_struct("AppState")
            .field("db", &"PgPool")
            .field("redis", &"RedisStore")
            .field("config", &self.config)
            .finish()
    }
}
