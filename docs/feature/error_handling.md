# Error Handling Architecture

## Overview

The application uses a two-tier error handling system:

1. **`ServerError`** - Application-level errors (startup, configuration, infrastructure)
2. **`ApiError`** - HTTP response errors (client-facing, implements `IntoResponse`)

## ApiError enum

Unified error type for all API handlers with automatic HTTP response conversion:

```rust
#[derive(Debug)]
pub enum ApiError {
    /// Wraps authentication-related errors (missing credentials, invalid token).
    Auth(AuthError),
    /// Client provided invalid data (400).
    BadRequest(String),
    /// Authentication required or failed (401).
    Unauthorized(String),
    /// Insufficient permissions (403).
    Forbidden(String),
    /// Resource not found (404).
    NotFound(String),
    /// Resource already exists (409).
    Conflict(String),
    /// Database error - logged server-side, returns generic 500 to client.
    Database(sqlx::Error),
    /// Queue/Redis error - logged server-side, returns generic 500 to client.
    Queue(String),
    /// Generic internal error (500).
    Internal(String),
}
```

## Error conversions

Automatic conversions from infrastructure errors:

```rust
impl From<AuthError> for ApiError { ... }

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => ApiError::NotFound("Resource not found".to_owned()),
            sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() => {
                ApiError::Conflict("A resource with this value already exists".to_owned())
            }
            _ => ApiError::Database(err),
        }
    }
}
```

## Usage pattern

```rust
async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, ApiError> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await?  // Auto-converts sqlx::Error -> ApiError via From
        .ok_or(ApiError::NotFound("User not found".to_owned()))?;

    Ok(Json(user))
}
```

## Security considerations

- Internal errors MUST NOT expose database details or stack traces to clients
- Log full error details server-side with `tracing::error!`
- Return generic messages to clients (e.g., "Internal error" instead of SQL error text)

## Deployment: reverse proxy requirement

The API rate limiter uses the default `PeerIpKeyExtractor` which keys on the TCP peer address. Behind a reverse proxy all requests share the proxy's peer IP, collapsing all clients into a single rate-limit bucket. If per-client limiting is needed behind a proxy, switch to `SmartIpKeyExtractor` and ensure the proxy overwrites `X-Forwarded-For` with the real client IP.
