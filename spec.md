# Project Specification: LeaseFi Backend

## 1. Overview
Backend service for processing high-load real estate operations, including tax calculations and property performance analytics.

## 2. API Contract

### Health Check
- **GET** `/health`
- **Response:** `200 OK` `{ "status": "ok", "redis": "connected", "database": "connected" }`

### Tax Center
- **POST** `/api/v1/tax/calculate-liability`
- **Input:** JSON with `fiscal_year`, `property_ids`
- **Output:** Calculated tax report (Income, Deductions, Estimated Tax)
- **Status:** *Mock Implementation (Phase 1)*

### Analytics
- **POST** `/api/v1/analytics/property-performance`
- **Input:** Date range, Property IDs
- **Output:** ROI, Occupancy Rate, Net Income
- **Status:** *Mock Implementation (Phase 1)*

### Authentication
- **GET** `/api/v1/auth/nonce`
  - **Query:** `wallet_address` (Hex string)
  - **Response:** `{ "nonce": "...", "message": "Sign this..." }`
  
- **POST** `/api/v1/auth/login`
  - **Input:** `{ "wallet_address": "...", "signature": "..." }`
  - **Response:** `{ "token": "jwt...", "user": { ... } }`

## 3. Security Requirements
- **Authentication:** JWT Bearer Token (Supabase).
- **Validation:** Signature verification using HS256.
- **Database:** No direct SQL injection (checked via SQLx).

## 4. Error Handling Architecture

### Overview

The application uses a two-tier error handling system:

1. **`ServerError`** - Application-level errors (startup, configuration, infrastructure)
2. **`ApiError`** - HTTP response errors (client-facing, implements `IntoResponse`)

### ApiError Enum

Unified error type for all API handlers with automatic HTTP response conversion:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Resource not found")]
    NotFound,

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal server error")]
    Internal,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            Self::NotFound => (StatusCode::NOT_FOUND, "Not found".into()),
            Self::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            Self::Internal => (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".into()),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}
```

### Error Conversions

Automatic conversions from infrastructure errors:

```rust
impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        tracing::error!(error = %err, "Database error");
        Self::Internal
    }
}

impl From<redis::RedisError> for ApiError {
    fn from(err: redis::RedisError) -> Self {
        tracing::error!(error = %err, "Redis error");
        Self::Internal
    }
}
```

### Usage Pattern

```rust
async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, ApiError> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await?  // Auto-converts sqlx::Error -> ApiError::Internal
        .ok_or(ApiError::NotFound)?;

    Ok(Json(user))
}
```

### Security Considerations

- Internal errors MUST NOT expose database details or stack traces to clients
- Log full error details server-side with `tracing::error!`
- Return generic messages to clients (e.g., "Internal error" instead of SQL error text)

## 5. Performance Goals

- Docker container size < 150MB.
- SQLx compile-time verification enabled.