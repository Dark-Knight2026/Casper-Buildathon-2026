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

### Transaction History

- **GET** `/api/v1/transactions/account/{address}`
  - **Path:** `address` - Casper account hash (64 hex chars, no prefix)
  - **Query:** `page` (default 1), `page_size` (default 25, max 100), `type` (optional filter: `token_purchase`, `token_transfer`, `token_mint`, `token_allowance`), `from_type` (optional filter: `0` = Account, `1` = Contract)
  - **Response:** `PaginatedResponse<TransactionResponse>` `{ "itemCount": 42, "pageCount": 2, "data": [...] }`
  - **Auth:** Public (no JWT required)
  - **Rate limit:** 5 req/s, burst 30

- **GET** `/api/v1/transactions/token/big`
  - **Query:** `page` (default 1), `page_size` (default 25, max 100)
  - **Response:** `PaginatedResponse<TransactionResponse>`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30

#### TransactionResponse Schema
```json
{
  "deploy_hash": "abc123...",
  "block_height": 12345,  // null if unconfirmed
  "timestamp": "2025-06-15T10:30:00Z",
  "amount": "1000000000000000000",
  "currency": "CSPR",
  "contract_package_hash": "def456...",
  "from_hash": "aaa...",
  "from_type": 0,
  "to_hash": "bbb...",
  "to_type": 0,
  "ft_action_type_id": 2,
  "transform_idx": 0
}
```

### ICO

- **GET** `/api/v1/ico/balance/{address}`
  - **Path:** `address` - Casper account hash (64 hex chars, no prefix)
  - **Response:** `IcoBalanceResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30

```json
{
  "tokensPurchased": "500000000000000000000",
  "totalSpentUsd": 250.0,
  "tokenPrice": 0.50,
  "tokenSymbol": "BIG",
  "currentValue": 250.0,
  "isActive": true
}
```

- **GET** `/api/v1/ico/progress`
  - **Response:** `IcoProgressResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30

```json
{
  "tokensSold": "100000000000000000000000",
  "totalAllocation": "1000000000000000000000000",
  "tokensRemaining": "900000000000000000000000",
  "amountRaised": 50000.0,
  "hardCapUsd": 500000.0,
  "priceUsd": 0.50,
  "percentSold": 10.0,
  "isActive": true
}
```

#### PaginatedResponse Schema
```json
{
  "itemCount": 100,
  "pageCount": 4,
  "data": [ "...items..." ]
}
```

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

### Deployment: Reverse Proxy Requirement

The API rate limiter uses `SmartIpKeyExtractor` which trusts the
`X-Forwarded-For` header unconditionally. **This API MUST be deployed
behind a trusted reverse proxy** (e.g. Nginx, Cloudflare, ALB) that
overwrites `X-Forwarded-For` with the real client IP.

Direct exposure to the internet without a trusted proxy allows clients to
spoof `X-Forwarded-For` and bypass all per-IP rate limits.

## 5. Performance Goals

- Docker container size < 150MB.
- SQLx compile-time verification enabled.