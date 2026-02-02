use crate::auth;

/// Represents errors that can occur at the application level (e.g., startup).
/// These are not intended to be converted into API responses but are for logging
/// and terminating the application gracefully.
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    /// An I/O error occurred (e.g., binding to a socket).
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    /// A database connection or query error occurred during startup.
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    /// A database migration error.
    #[error("Migration failed: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    /// An authentication-related error occurred, typically during setup.
    #[error("Authentication setup error: {0}")]
    Auth(#[from] auth::AuthError),
    /// A required environment variable was missing or invalid.
    #[error("Environment variable error: {0}")]
    EnvVar(String),
    /// Queue/Redis related error.
    #[error("Queue error: {0}")]
    Queue(String),
}

impl From<std::env::VarError> for ServerError {
    #[inline]
    fn from(err: std::env::VarError) -> Self {
        Self::EnvVar(err.to_string())
    }
}
