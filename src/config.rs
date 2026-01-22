use secrecy::SecretString;
use std::env;

#[derive(Clone)]
pub struct Config {
    pub database_url: SecretString,
    pub redis_url: String,
    pub jwt_secret: SecretString,
    pub port: u16,
}

impl Config {
    /// Loads configuration from environment variables.
    /// Panics if required variables are missing.
    pub fn from_env() -> Result<Self, String> {
        let database_url = env::var("DATABASE_URL")
            .map(SecretString::from)
            .map_err(|_| "DATABASE_URL must be set")?;

        let redis_url = env::var("REDIS_URL").map_err(|_| "REDIS_URL must be set")?;

        let jwt_secret = env::var("SUPABASE_JWT_SECRET")
            .map(SecretString::from)
            .map_err(|_| "SUPABASE_JWT_SECRET must be set")?;

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .map_err(|_| "PORT must be a valid number")?;

        Ok(Self {
            database_url,
            redis_url,
            jwt_secret,
            port,
        })
    }
}
