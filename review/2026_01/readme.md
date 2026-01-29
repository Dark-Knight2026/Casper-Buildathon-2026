# Code Review: LeaseFi Backend

Date: 2025-11-07  
Reviewer: Ivan Kinder  
Environment: GCP  
DeploymentMethod: Cloud Build  
CompletionStatus: completed

---

## Table of Contents

1. [Overview](#overview)
2. [Deviations from Standards](#deviations-from-standards)
3. [Code Style Issues](#code-style-issues)
4. [Architectural Anti-patterns](#architectural-anti-patterns)
5. [Security Concerns](#security-concerns)
6. [Best Practice Violations](#best-practice-violations)
7. [Positive Aspects](#positive-aspects)
8. [Recommendations](#recommendations)
9. [Prioritized Action Plan](#prioritized-action-plan)

---

## Overview

| Parameter     | Value                                             |
|---------------|---------------------------------------------------|
| Language      | Rust 2021 edition                                 |
| Framework     | Axum 0.7                                          |
| Database      | PostgreSQL (SQLx) + Redis                         |
| Lines of Code | ~958 lines of Rust                                |
| Module Count  | 8 files                                           |
| Tests         | Present (unit tests in crypto.rs and business.rs) |

---

## Deviations from Standards

### 1. Missing Makefile

**Problem:** The project lacks a Makefile with commonly used commands.

**Impact:** Complicates onboarding for new developers, no standardized way to run typical operations (build, test, lint, migrate, deploy).

**Recommendation:** Add a Makefile following company project standards:

```Makefile
.PHONY:   \
 help     \
 env_down \
 env_up   \
 migrate  \
 restart  \
 ci       \
 fmt      \
 lint     \
 prepare  \
 test     \
 test_one \
 test_in  \
 test_not \
 debug    \

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## ' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-10s %s\n", $$1, $$2}'

env_up: ## Start docker-compose services
	@echo "[*] Starting Docker containers..."
	docker compose up -d

env_down: ## Stop docker-compose services
	@echo "[*] Stopping Docker containers..."
	docker compose down --volumes

migrate: ## Run database migrations
	@echo "[*] Running migrations..."
	. ./.env && cargo sqlx migrate run

restart: env_down env_up migrate ## Restart environment and run migrations

ci: fmt lint prepare test ## Full CI pipeline

lint: ## Run clippy in strict mode
	@echo "[*] Running clippy..."
	cargo clippy --workspace --all-targets -- -D warnings

fmt: ## Check formatting
	@echo "[*] Checking formatting..."
	cargo fmt --all -- --check

prepare: ## Generate SQLx offline query metadata for CI builds
	@echo "[*] Generating SQLx offline query metadata..."
	. ./.env && cargo sqlx prepare --workspace -- --all-features --tests

test: ## Run nextest (use ARGS="..." for extra arguments)
	@echo "[*] Running tests..."
	. ./.env && cargo nextest run --all-features --no-fail-fast --build-jobs 0 $(ARGS)

test_one: ## Run single test: `make test_one <test_name>`
	@$(MAKE) test ARGS="$(filter-out $@,$(MAKECMDGOALS))"

test_in: ## Run tests in module: `make test_in <module_name>`
	@$(MAKE) test ARGS="--test $(filter-out $@,$(MAKECMDGOALS))"

test_not: ## Exclude test: `make test_not <test_name>`
	@$(MAKE) test ARGS="-E 'not test($(filter-out $@,$(MAKECMDGOALS)))'"

debug: ## Run API in debug mode
	cargo r --bin api

# Prevent "No rule to make target" error for arguments
#   %: — catch-all target, matches any unknown target (e.g. arguments like "test_name")
#   @: — no-op command, does nothing silently
%:
	@:
```

---

### 2. Cargo.lock in .gitignore

**Problem:** The `.gitignore` file contains `Cargo.lock` (line 28).

**Impact:**

- Team members may get different dependency versions
- Cannot guarantee reproducible builds
- `CI/CD` may produce different results across runs

**Recommendation:** For binary projects (application crates), `Cargo.lock` **MUST** be in git. Remove the `Cargo.lock` line from `.gitignore`.

> See official documentation: https://doc.rust-lang.org/cargo/faq.html#why-have-cargolock-in-version-control

---

### 3. Missing CI/CD Configuration

**Problem:** No `.github/workflows/*.yml` files or equivalent for automation.

**Recommendation:** Add GitHub Actions for:

- `cargo fmt --check`
- `cargo clippy -- -D warnings`
- `cargo test`
- `cargo audit` (vulnerability scanning)

---

## Code Style Issues

### 1. Emoji Usage in Logs

```rust
// main.rs:69
tracing::info!("🚀 Server listening on {}", addr);

// handlers/auth.rs:172
tracing::error!("❌ Nonce NOT FOUND or EXPIRED for key: {}", redis_key);

// handlers/auth.rs:188
tracing::error!("🔒 Signature INVALID");

// handlers/auth.rs:192
tracing::info!("🔓 Signature VALID");
```

**Problem:** Emojis in logs:

- Display poorly in logging systems without Unicode support
- Complicate grep/log searching
- Unprofessional appearance in production

**Recommendation:** Replace with plain text:

```rust
tracing::info!(address = %addr, "Server listening");
tracing::error!(key = %redis_key, "Nonce not found or expired");
tracing::warn!("Invalid signature attempt");
tracing::info!("Signature verified successfully");
```

---

### 2. Magic Numbers Without Constants

**Location:** `handlers/auth.rs:155`

```rust
let len = payload.wallet_address.len();
if len != 66 & & len != 68 {
tracing::error ! ("Invalid wallet address length: {}. Expected 66 or 68.", len);
return Err(StatusCode::BAD_REQUEST);
}
```

**Problem:** Numbers `66` and `68` lack explanation and are not extracted to constants.

**Recommendation:**

```rust
/// Ed25519 public key length with algorithm prefix (01 + 64 hex chars)
const CASPER_ED25519_PUBLIC_KEY_LEN: usize = 66;
/// Secp256k1 public key length with algorithm prefix (02 + 66 hex chars)
const CASPER_SECP256K1_PUBLIC_KEY_LEN: usize = 68;

if ! matches!(len, CASPER_ED25519_PUBLIC_KEY_LEN | CASPER_SECP256K1_PUBLIC_KEY_LEN) {
// ...
}
```

---

### 3. Unwrap in Production Code

**Files with `.unwrap()`:**

| File                 | Line    | Code                                                   |
|----------------------|---------|--------------------------------------------------------|
| main.rs              | 71      | `listener.bind(addr).await.unwrap()`                   |
| main.rs              | 75      | `axum::serve(...).await.unwrap()`                      |
| main.rs              | 82      | `expect("failed to install Ctrl+C handler")`           |
| handlers/auth.rs     | 195     | `redis_conn.del(&redis_key).await.unwrap_or(())`       |
| handlers/auth.rs     | 222     | `UserRole::from_str(&user_record.role).unwrap_or(...)` |
| handlers/business.rs | 120-178 | Multiple `Decimal::from_i64(...).unwrap()`             |

**Problem:** `unwrap()` and `expect()` panic on error, causing server crashes.

**Recommendation for** `main.rs`: Acceptable in `main()` since there's no point continuing if startup fails.

**Recommendation for handlers:** Use the `?` operator or explicit error handling:

```rust
// Instead of:
let tax_rate = Decimal::from_f64(0.24).unwrap();

// Better:
let tax_rate = Decimal::from_f64(0.24).ok_or_else( | | StatusCode::INTERNAL_SERVER_ERROR) ?;
```

---

### 4. Non-idiomatic Import Grouping

**Location:** `handlers/auth.rs`

```rust
use axum::{
  extract::{Query, State},
  http::StatusCode,
  routing::{get, post},
  Json, Router,
};
use chrono::{Duration, Utc};
// ...
use std::str::FromStr;
use std::sync::Arc;
```

**Recommendation:** Group imports:

1. `std` library
2. External crates
3. Internal modules (`crate::`)

```rust
use std::str::FromStr;
use std::sync::Arc;

use axum::{...};
use chrono::{Duration, Utc};
// ...

use crate::crypto::verify_casper_signature;
use crate::models::{Claims, UserId, UserRole};
```

---

### 5. Missing `#[must_use]` Attributes

**Problem:** Functions returning important values lack `#[must_use]`.

**Recommendation:** Add to functions where ignoring the result is an error:

```rust
#[must_use]
pub fn verify_casper_signature(...) -> Result<bool, CryptoError>
```

---

### 6. Inconsistent Documentation

**Problem:**

- `crypto.rs` - well documented
- `handlers/auth.rs` - well documented
- `config.rs` - minimal documentation
- `auth.rs` (extractor) - no struct documentation

**Recommendation:** Add documentation to all public APIs:

```rust
/// JWT Authentication extractor for Axum handlers.
///
/// Extracts and validates JWT tokens from the `Authorization: Bearer <token>` header.
///
/// # Example
/// ```
/// async fn protected_handler(user: AuthUser) -> impl IntoResponse {
///     format!("Hello, user {}", user.0.sub)
/// }
/// ```
pub struct AuthUser(pub Claims);
```

---

## Architectural Anti-patterns

### 1. Business Logic in Handlers (Mock Code Without Separation)

**Location:** `handlers/business.rs:119-150`

```rust
pub async fn calculate_tax_liability(...) -> Result<Json<TaxReport>, StatusCode> {
  // MOCK Implementation
  let total_income = Decimal::from_i64(150000).unwrap();
  // ... all calculations directly in handler
}
```

**Problem:**

- Business logic mixed with HTTP layer
- Cannot test logic independently of HTTP
- Handler will become huge when mock is replaced with real logic

**Recommendation:** Extract a service layer:

```
src/
├── handlers/          # HTTP layer
├── services/          # Business logic
│   ├── mod.rs
│   ├── tax.rs
│   └── analytics.rs
└── repositories/      # Data access layer (optional)
```

---

### 2. Missing Repository Layer

**Problem:** SQL queries written directly in handlers:

```rust
// handlers/auth.rs:202-220
let user_record = sqlx::query!(
    r#"INSERT INTO users (...) VALUES (...) RETURNING id, role"#,
    // ...
).fetch_one( & state.db).await
```

**Impact:**

- Query duplication
- Hard to test (requires real database)
- Database schema changes require modifications in multiple places

**Recommendation:** Create a repository:

```rust
// src/repositories/user.rs
pub struct UserRepository<'a> {
  pool: &'a PgPool,
}

impl<'a> UserRepository<'a> {
  pub async fn find_or_create_by_wallet(&self, wallet: &str) -> Result<User, DbError> {
    // SQL here
  }
}
```

---

### 3. Config Not Fully Validated

**Location:** `config.rs`

**Problem:** No validation of configuration values:

- `port` can be 0
- `redis_url` and `database_url` are not checked for correct format

**Recommendation:** Add validation:

```rust
impl Config {
  pub fn from_env() -> Result<Self, ConfigError> {
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string()).parse::<u16>().map_err(|_| ConfigError::InvalidPort)?;

    if port == 0 {
      return Err(ConfigError::InvalidPort);
    }
    // ...
  }
}
```

---

### 4. Missing Rate Limiting Middleware

**Problem:** Endpoint `/api/v1/auth/nonce` is vulnerable to:

- DDoS attacks (nonce generation consumes Redis resources)
- Brute-force attacks

**Recommendation:** Add rate limiting via `tower-governor` or custom middleware.

---

## Security Concerns

### 1. Placeholder Email May Cause Collisions

**Location:** `handlers/auth.rs:198`

```rust
let placeholder_email = format!("wallet_{}@leasefi.local", &payload.wallet_address[..16]);
```

**Problem:** Only the first 16 characters of the wallet address are used, which may cause email collisions for different wallets with the same prefix.

**Recommendation:** Use the full address or a hash:

```rust
let placeholder_email = format!("wallet_{}@leasefi.local", payload.wallet_address);
// or
use sha2::{Sha256, Digest};
let hash = format!("{:x}", Sha256::digest(payload.wallet_address.as_bytes()));
let placeholder_email = format!("wallet_{}@leasefi.local", &hash[..32]);
```

---

### 2. Hardcoded Role for New Users

**Location:** `handlers/auth.rs:207`

```rust
VALUES ($ 1, 'tenant', $ 2, 'Wallet', 'User', NULL, 'active')
```

**Problem:** All new users receive the `tenant` role without choice.

**Recommendation:** Add a `requested_role` parameter to `LoginRequest` or a separate registration endpoint.

---

### 3. Missing Audit Logging

**Problem:** Critical operations (login, nonce generation) are not structurally logged for auditing.

**Recommendation:**

```rust
tracing::info!(
    event = "user_login",
    wallet_address = %payload.wallet_address,
    user_id = %user_record.id,
    "User logged in successfully"
);
```

---

### 4. JWT Missing Additional Claims

**Location:** `models.rs:27-35`

```rust
pub struct Claims {
  pub sub: UserId,
  pub role: UserRole,
  pub exp: usize,
}
```

**Problem:** Missing:

- `iat` (issued at)
- `jti` (JWT ID for revocation)
- `iss` (issuer)
- `aud` (audience)

**Recommendation:** Extend Claims:

```rust
pub struct Claims {
  pub sub: UserId,
  pub role: UserRole,
  pub exp: usize,
  pub iat: usize,
  pub jti: Uuid,
  #[serde(default = "default_issuer")]
  pub iss: String,
}
```

---

## Best Practice Violations

### 1. Missing dev-dependencies

**Location:** `Cargo.toml`

**Problem:** No `[dev-dependencies]` section.

**Recommendation:**

```toml
[dev-dependencies]
tokio-test = "0.4"
wiremock = "0.6"         # HTTP mocking
fake = "2"               # Test data generation
rstest = "0.18"          # Parametrized tests
assert_matches = "1.5"
```

---

### 2. Missing Integration Tests

**Problem:** Only unit tests exist in `crypto.rs` and `business.rs`. No tests for:

- HTTP endpoints
- Complete login flow
- Health check

**Recommendation:** Create a `tests/` directory with integration tests:

```
tests/
├── common/
│   └── mod.rs        # Test utilities
├── auth_test.rs      # Auth flow tests
└── health_test.rs    # Health check tests
```

---

### 3. Missing Debug Derive

**Location:** `handlers/health.rs:15-26`

```rust
#[derive(Serialize, PartialEq)]
enum ConnectionStatus {
```

**Recommendation:** Add `Debug` for debugging:

```rust
#[derive(Debug, Serialize, PartialEq)]
```

---

### 4. Suboptimal Error Structure

**Location:** `auth.rs:52-57`

```rust
pub enum AuthError {
  MissingCredentials,
  InvalidToken,
  ServerConfiguration,
}
```

**Problem:** `ServerConfiguration` is unused. Errors lack context.

**Recommendation:**

```rust
#[derive(Debug, Error)]
pub enum AuthError {
  #[error("Missing or malformed Authorization header")]
  MissingCredentials,

  #[error("Invalid or expired token: {reason}")]
  InvalidToken { reason: String },

  #[error("Server configuration error: {0}")]
  ServerConfiguration(String),
}
```

---

### 5. Missing CORS Configuration

**Problem:** CORS is not configured, although `tower-http` is included with the `cors` feature.

**Location:** `main.rs` - no `.layer(CorsLayer::...)`

**Recommendation:**

```rust
use tower_http::cors::{CorsLayer, Any};

let cors = CorsLayer::new().allow_origin(Any) // or specific origins for production
.allow_methods([Method::GET, Method::POST]).allow_headers(Any);

let app = Router::new()
// ... .layer(cors).layer(TraceLayer::new_for_http());
```

---

### 6. Missing Graceful Degradation for Redis

**Problem:** If Redis is unavailable, the server won't start at all.

**Recommendation:** For production, consider:

- Retry logic on connection
- Circuit breaker pattern
- Fallback to in-memory storage for non-critical operations

---

## Positive Aspects

### 1. Security

- **SecretString** to protect sensitive data from logging
- **One-time nonce** to prevent replay attacks
- **Nonce deletion after use**
- **Casper signature verification** implemented correctly

### 2. Architecture

- Clear separation into modules (auth, config, crypto, handlers, models)
- Proper use of Axum extractors
- AppState via Arc for efficient sharing
- Graceful shutdown implementation

### 3. Database

- SQLx with compile-time verification
- SQLX_OFFLINE for Docker builds
- Connection pooling configured

### 4. Deployment

- Multi-stage Docker build
- cargo-chef for Docker cache optimization
- docker-compose for local development

### 5. Code

- Good documentation in crypto.rs and handlers/auth.rs
- Use of thiserror for error types
- Proper serialization via serde

---

## Recommendations

### High Priority

| # | Recommendation                        | Rationale             |
|---|---------------------------------------|-----------------------|
| 1 | Remove `Cargo.lock` from `.gitignore` | Reproducible builds   |
| 2 | Add Makefile                          | Developer experience  |
| 3 | Add CI/CD configuration               | Quality automation    |
| 4 | Replace emojis in logs                | Production readiness  |
| 5 | Fix placeholder email                 | Security (collisions) |

### Medium Priority

| #  | Recommendation        | Rationale                    |
|----|-----------------------|------------------------------|
| 6  | Extract service layer | Testability, maintainability |
| 7  | Add rate limiting     | Security                     |
| 8  | Extend JWT claims     | Security best practices      |
| 9  | Add integration tests | Quality                      |
| 10 | Configure CORS        | Functionality                |

### Low Priority

| #  | Recommendation                     | Rationale        |
|----|------------------------------------|------------------|
| 11 | Extract magic numbers to constants | Code readability |
| 12 | Add #[must_use]                    | Compiler checks  |
| 13 | Organize imports                   | Code style       |
| 14 | Add Debug derives                  | Debugging        |
| 15 | Improve error types                | Error handling   |

---

## Prioritized Action Plan

### Phase 1: Critical Fixes (1-2 days)

1. Remove `Cargo.lock` from `.gitignore`, commit `Cargo.lock`
2. Create basic `Makefile`
3. Fix placeholder email (use full address)
4. Replace emojis in logs

### Phase 2: CI/CD and Security (3-5 days)

5. Add GitHub Actions workflow
6. Configure CORS
7. Add rate limiting
8. Extend JWT claims

### Phase 3: Refactoring (1-2 weeks)

9. Extract service layer
10. Create repositories
11. Add integration tests
12. Improve documentation

---

## Conclusion

**Overall Score: 7/10**

The project demonstrates a good understanding of Rust and security practices. Main issues relate to:

- Missing infrastructure files (Makefile, CI)
- Cargo.lock in .gitignore
- Mock implementations without a business logic layer

The code is ready for continued development after addressing critical remarks.
