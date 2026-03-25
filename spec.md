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
- **Authentication:** JWT Bearer Token — issued locally via HS256 using `SUPABASE_JWT_SECRET`. Login uses Casper Wallet signature challenge-response (Ed25519 / Secp256k1). No Supabase Auth service call at validation time. Sign message format: `"Sign this message to login to LeaseFi. Nonce: <nonce>"`. JWT expiry: 24 h. Nonce TTL: 5 min (Redis).
- **Database:** No direct SQL injection (checked via SQLx).

## 4. Error Handling Architecture

### Overview

The application uses a two-tier error handling system:

1. **`ServerError`** - Application-level errors (startup, configuration, infrastructure)
2. **`ApiError`** - HTTP response errors (client-facing, implements `IntoResponse`)

### ApiError Enum

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
    /// Database error — logged server-side, returns generic 500 to client.
    Database(sqlx::Error),
    /// Queue/Redis error — logged server-side, returns generic 500 to client.
    Queue(String),
    /// Generic internal error (500).
    Internal(String),
}
```

### Error Conversions

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

### Usage Pattern

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

### Security Considerations

- Internal errors MUST NOT expose database details or stack traces to clients
- Log full error details server-side with `tracing::error!`
- Return generic messages to clients (e.g., "Internal error" instead of SQL error text)

## 5. Performance Goals

- Docker container size < 150MB.
- SQLx compile-time verification enabled.