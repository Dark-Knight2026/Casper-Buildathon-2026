//! Application configuration and state management.

use std::env;

use secrecy::SecretString;

use crate::{ServerError, common::RedisStore};

/// Application configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Config {
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
}

impl Config {
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
        let database_url = env::var("DATABASE_URL")
            .map(SecretString::from)
            .map_err(|_| ServerError::EnvVar("DATABASE_URL must be set".to_owned()))?;

        let redis_url = env::var("REDIS_URL")
            .map_err(|_| ServerError::EnvVar("REDIS_URL must be set".to_owned()))?;
        if !redis_url.starts_with("redis://") && !redis_url.starts_with("rediss://") {
            return Err(ServerError::EnvVar(
                "REDIS_URL must start with redis:// or rediss://".to_owned(),
            ));
        }

        let jwt_secret = env::var("SUPABASE_JWT_SECRET")
            .map(SecretString::from)
            .map_err(|_| ServerError::EnvVar("SUPABASE_JWT_SECRET must be set".to_owned()))?;

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_owned())
            .parse::<u16>()
            .map_err(|_| ServerError::EnvVar("PORT must be a valid number".to_owned()))?;
        if port == 0 {
            return Err(ServerError::EnvVar("PORT cannot be 0".to_owned()));
        }

        let cors_origin =
            env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:8080".to_owned());
        if !cors_origin.starts_with("http://") && !cors_origin.starts_with("https://") {
            return Err(ServerError::EnvVar(
                "CORS_ORIGIN must start with http:// or https://".to_owned(),
            ));
        }

        Ok(Self {
            database_url,
            redis_url,
            jwt_secret,
            port,
            cors_origin,
        })
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
    pub config: Config,
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
