//! Application configuration and state management.

use config::{Config, Environment};
use secrecy::SecretString;
use serde::Deserialize;

use crate::{ServerError, common::RedisStore};

/// Flat intermediate struct whose field names match lowercase env var names.
#[derive(Debug, Deserialize)]
struct RawEnvConfig {
    database_url: SecretString,
    redis_url: String,
    supabase_jwt_secret: SecretString,
    #[serde(default = "default_port")]
    port: u16,
    #[serde(default = "default_cors_origin")]
    cors_origin: String,
    /// BIG token contract package hash (hex, no prefix). Shared with `indexer`.
    #[serde(default)]
    contract_big: Option<String>,
    /// ICO token price in USD (e.g. `0.50` for Private Sale).
    #[serde(default)]
    ico_price_usd: Option<f64>,
    /// ICO total allocation in minimal units (e.g. `"500000000000000000000000000"`).
    #[serde(default)]
    ico_total_allocation: Option<String>,
}

const fn default_port() -> u16 {
    8080
}
fn default_cors_origin() -> String {
    "http://localhost:8080".to_owned()
}

/// ICO round configuration loaded from `ICO_PRICE_USD` and `ICO_TOTAL_ALLOCATION` env vars.
///
/// Both variables must be set for ICO endpoints to work. If either is missing,
/// [`ServerConfig::ico`] will be `None` and ICO endpoints will return an error.
#[derive(Debug, Clone)]
pub struct IcoConfig {
    /// Price per 1 BIG token in USD (e.g. `0.50` for Private Sale, `1.00` for Public Sale).
    pub price_usd: f64,
    /// Total allocation in minimal units (U256 as string, e.g. `"500000000000000000000000000"`
    /// = 500M BIG with decimals=18). Kept as string because the value exceeds `u128`.
    pub total_allocation: String,
}

/// Server application configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// `PostgreSQL` database connection URL.
    pub database_url: SecretString,
    /// `Redis` connection URL.
    pub redis_url: String,
    /// Secret key for JWT token signing.
    pub jwt_secret: SecretString,
    /// HTTP server port.
    pub port: u16,
    /// Allowed CORS origin.
    pub cors_origin: String,
    /// BIG token contract package hash (hex, no prefix). `None` when not configured.
    pub contract_big: Option<String>,
    /// ICO round configuration. `None` when env vars are not set.
    pub ico: Option<IcoConfig>,
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

        let ico = match (raw.ico_price_usd, raw.ico_total_allocation) {
            (Some(price_usd), Some(total_allocation)) => Some(IcoConfig {
                price_usd,
                total_allocation,
            }),
            _ => None,
        };

        let config = Self {
            database_url: raw.database_url,
            redis_url: raw.redis_url,
            jwt_secret: raw.supabase_jwt_secret,
            port: raw.port,
            cors_origin: raw.cors_origin,
            contract_big: raw.contract_big,
            ico,
        };

        config.validate()?;
        Ok(config)
    }

    /// Validates business rules that serde cannot express.
    fn validate(&self) -> Result<(), ServerError> {
        if !self.redis_url.starts_with("redis://") && !self.redis_url.starts_with("rediss://") {
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
