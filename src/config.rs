use redis::Client as RedisClient;
use secrecy::SecretString;
use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: SecretString,
    pub redis_url: String,
    pub jwt_secret: SecretString,
    pub port: u16,
    pub cors_origin: String,
}

impl Config {
    /// Loads and validates configuration from environment variables.
    /// Returns error if required variables are missing or invalid.
    pub fn from_env() -> Result<Self, String> {
        let database_url = env::var("DATABASE_URL")
            .map(SecretString::from)
            .map_err(|_| "DATABASE_URL must be set")?;

        let redis_url = env::var("REDIS_URL").map_err(|_| "REDIS_URL must be set")?;
        if !redis_url.starts_with("redis://") && !redis_url.starts_with("rediss://") {
            return Err("REDIS_URL must start with redis:// or rediss://".to_owned());
        }

        let jwt_secret = env::var("SUPABASE_JWT_SECRET")
            .map(SecretString::from)
            .map_err(|_| "SUPABASE_JWT_SECRET must be set")?;

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_owned())
            .parse::<u16>()
            .map_err(|_| "PORT must be a valid number")?;
        if port == 0 {
            return Err("PORT cannot be 0".to_owned());
        }

        let cors_origin =
            env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".to_owned());
        if !cors_origin.starts_with("http://") && !cors_origin.starts_with("https://") {
            return Err("CORS_ORIGIN must start with http:// or https://".to_owned());
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

/// Global application state
#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub redis: RedisClient,
    pub config: Config,
}
