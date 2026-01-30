# Code Review: LeaseFi Backend

Date: 2026-01-29  
Reviewer: Ivan Kinder  
Environment: TBD  
DeploymentMethod: TBD (Dockerfile ready)  
CompletionStatus: completed

---

## Table of Contents

1. [Review Methodology](#review-methodology)
2. [Specification Compliance](#specification-compliance)
3. [Rulebook Compliance](#rulebook-compliance)
4. [Knowledge Preservation](#knowledge-preservation)
5. [Overview](#overview)
6. [Deviations from Standards (ST)](#deviations-from-standards-st)
7. [Code Style Issues (CS)](#code-style-issues-cs)
8. [Architectural Anti-patterns (AP)](#architectural-anti-patterns-ap)
9. [Security Concerns (SC)](#security-concerns-sc)
10. [Best Practice Violations (BP)](#best-practice-violations-bp)
11. [Recommendations](#recommendations)
12. [Prioritized Action Plan](#prioritized-action-plan)

---

## Review Methodology

### Review Scope

| Parameter      | Value                                                        |
|----------------|--------------------------------------------------------------|
| Commit         | `1fa76e9` (Merge PR #2)                                      |
| Branch         | `master`                                                     |
| Files reviewed | All `.rs` files in `src/`, `Cargo.toml`, configuration files |

### How Findings Were Gathered

This review was conducted through:

1. **Manual code inspection** - line-by-line review of all source files
2. **Static analysis** - `cargo clippy` with `-D warnings` flag
3. **Dependency audit** - `cargo tree` and `Cargo.toml` analysis
4. **Pattern matching** - `grep`/`rg` searches for common antipatterns (`unwrap`, `expect`, hardcoded values)
5. **Security checklist** - OWASP Top 10 and Rust-specific security patterns

### Verification Commands Used

```bash
# Check for anyhow usage
grep -r "use.*anyhow" src/
grep -r "anyhow" src/

# Inventory unwrap/expect
grep -rn "\.unwrap\(" src/
grep -rn "\.expect\(" src/

# Check dependencies
cargo tree -i anyhow
cargo clippy --all-targets -- -D warnings

# Verify sqlx deprecation warning (ST-004)
cargo check 2>&1 | grep "will be rejected"

# Count source files (Overview)
find src -name "*.rs" | wc -l

# Count lines of code
tokei src/ --type Rust 2>/dev/null || wc -l src/**/*.rs

# Verify test structure
find . -path ./target -prune -o -name "*_test.rs" -print
ls tests/ 2>/dev/null || echo "No tests/ directory"

# Check for README files
ls -la src/readme.md review/readme.md 2>/dev/null
```

### Confidence Levels

| Category           | Confidence | Notes                                          |
|--------------------|------------|------------------------------------------------|
| ST (Standards)     | High       | Verified against file system and Cargo.toml    |
| CS (Code Style)    | High       | Direct code inspection with line numbers       |
| AP (Architecture)  | Medium     | Subjective assessment based on project size    |
| SC (Security)      | Medium     | Some findings are theoretical (timing attacks) |
| BP (Best Practice) | High       | Based on Rust ecosystem conventions            |

### Verification Disclaimer

> **Note:** Readers should independently verify findings before implementing fixes. Line numbers may shift as code evolves. Use `grep` commands above to locate current positions.

---

## Specification Compliance

Verification of implementation against `SPEC.md` requirements:

| Requirement                                   | Status         | Notes                                            |
|-----------------------------------------------|----------------|--------------------------------------------------|
| **API Contract**                              |                |                                                  |
| GET `/health`                                 | ✅ Implemented  | Returns status, redis, database fields           |
| POST `/api/v1/tax/calculate-liability`        | ✅ Implemented  | Mock implementation (Phase 1)                    |
| POST `/api/v1/analytics/property-performance` | ✅ Implemented  | Mock implementation (Phase 1)                    |
| GET `/api/v1/auth/nonce`                      | ✅ Implemented  | Returns nonce and message                        |
| POST `/api/v1/auth/login`                     | ✅ Implemented  | Returns JWT token and user                       |
| **Security Requirements**                     |                |                                                  |
| JWT Bearer Token                              | ✅ Implemented  | `auth.rs` extractor validates tokens             |
| Signature verification                        | ⚠️ Partial     | Uses Ed25519/Secp256k1, not HS256 as spec states |
| SQL injection prevention                      | ✅ Implemented  | SQLx compile-time checked queries                |
| **Performance Goals**                         |                |                                                  |
| Docker < 150MB                                | ❓ Not verified | Dockerfile exists, size not measured             |
| SQLx compile-time verification                | ✅ Enabled      | `sqlx-data.json` present                         |

**Spec Discrepancy Found:** SPEC.md states "Signature verification using HS256" but implementation uses Casper wallet signatures (Ed25519/Secp256k1). Recommend updating SPEC.md to reflect actual implementation.

---

## Rulebook Compliance

This review was checked against applicable organizational standards:

| Rulebook                                | Compliance  | Notes                                                    |
|-----------------------------------------|-------------|----------------------------------------------------------|
| `organizational_principles.rulebook.md` | ⚠️ Partial  | Missing `src/readme.md` with module Responsibility Table |
| `code_design.rulebook.md`               | ✅ Compliant | Error types use `thiserror`, structured appropriately    |
| `pr_review.rulebook.md`                 | ✅ Compliant | Review follows finding format guidelines                 |

**Note:** Full rulebook discovery (`clm .rulebooks.list`) should be performed in CI environment to verify complete compliance.

---

## Knowledge Preservation

Analysis of bug fix documentation per organizational standards:

| Requirement              | Status    | Notes                                                  |
|--------------------------|-----------|--------------------------------------------------------|
| Bug fix MRE tests        | N/A       | No bug fixes in reviewed code (initial implementation) |
| Source code bug comments | N/A       | No `Fix(issue-NNN)` comments found (no bugs fixed yet) |
| Known Pitfalls sections  | ❌ Missing | Module docs lack Known Pitfalls sections               |

**Recommendation:** When bug fixes are implemented, ensure:

1. Failing MRE test created first
2. Test file documents: Root Cause, Why Not Caught, Fix Applied, Prevention, Pitfall
3. Source code includes: `Fix(issue-NNN)`, Root cause comment, Pitfall warning

---

## Overview

| Parameter     | Value                                             |
|---------------|---------------------------------------------------|
| Language      | Rust 2021 edition                                 |
| Framework     | Axum 0.7                                          |
| Database      | PostgreSQL (SQLx) + Redis                         |
| Lines of Code | ~958 lines of Rust                                |
| Module Count  | 9 files                                           |
| Tests         | Present (unit tests in crypto.rs and business.rs) |

---

## Deviations from Standards (ST)

### Deviation ST-001: Missing Makefile

**Observation:** The project lacks a Makefile with commonly used commands.

**Evidence:** No `Makefile` present in the repository root.

**Action Item:** Add a Makefile following company project standards:

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
	@docker compose up -d

env_down: ## Stop docker-compose services
	@echo "[*] Stopping Docker containers..."
	@docker compose down --volumes

migrate: ## Run database migrations (requires bash/zsh)
	@echo "[*] Running migrations..."
	@test -f .env || (echo "Error: .env file not found" && exit 1)
	@set -a && . ./.env && set +a && cargo sqlx migrate run

restart: env_down env_up migrate ## Restart environment and run migrations

ci: fmt lint prepare test ## Full CI pipeline

lint: ## Run clippy in strict mode
	@echo "[*] Running clippy..."
	@cargo clippy --workspace --all-targets -- -D warnings

fmt: ## Check formatting
	@echo "[*] Checking formatting..."
	@cargo fmt --all -- --check

prepare: ## Generate SQLx offline query metadata for CI builds (requires bash/zsh)
	@echo "[*] Generating SQLx offline query metadata..."
	@test -f .env || (echo "Error: .env file not found" && exit 1)
	@set -a && . ./.env && set +a && cargo sqlx prepare --workspace -- --all-features --tests

test: ## Run nextest (use ARGS="..." for extra arguments, requires bash/zsh)
	@echo "[*] Running tests..."
	@test -f .env || (echo "Error: .env file not found" && exit 1)
	@set -a && . ./.env && set +a && cargo nextest run --all-features --no-fail-fast --build-jobs 0 $(ARGS)

test_one: ## Run single test: `make test_one <test_name>`
	@$(MAKE) test ARGS="$(filter-out $@,$(MAKECMDGOALS))"

test_in: ## Run tests in module: `make test_in <module_name>`
	@$(MAKE) test ARGS="--test $(filter-out $@,$(MAKECMDGOALS))"

test_not: ## Exclude test: `make test_not <test_name>`
	@$(MAKE) test ARGS="-E 'not test($(filter-out $@,$(MAKECMDGOALS)))'"

debug: ## Run API in debug mode
	@cargo r --bin api

# Prevent "No rule to make target" error for arguments
#   %: — catch-all target, matches any unknown target (e.g. arguments like "test_name")
#   @: — no-op command, does nothing silently
%:
	@:
```

---

### Deviation ST-002: Cargo.lock in .gitignore

**Observation:** The `.gitignore` file excludes `Cargo.lock` from version control.

Impact:

- Team members may get different dependency versions
- Cannot guarantee reproducible builds
- `CI/CD` may produce different results across runs

**Evidence:** `.gitignore:28` contains `Cargo.lock`.

**Action Item:** Remove `Cargo.lock` from `.gitignore`. For binary projects (application crates), `Cargo.lock` **MUST** be committed to ensure reproducible builds.

> See: https://doc.rust-lang.org/cargo/faq.html#why-have-cargolock-in-version-control

---

### Deviation ST-003: Missing CI/CD Configuration

**Observation:** No automated CI/CD pipeline configuration exists.

**Evidence:** No `.github/workflows/*.yml` files or equivalent.

**Action Item:** Add GitHub Actions workflow with:

- `cargo fmt --check`
- `cargo clippy -- -D warnings`
- `cargo test`
- `cargo audit` (vulnerability scanning)

---

### Deviation ST-004: Outdated Dependencies and Edition

**Observation:** Project uses Rust 2021 edition and has outdated/imprecise dependency versions.

**Evidence:** `Cargo.toml`

```toml
[package]
edition = "2021"

[dependencies]
axum = "0.7"
jsonwebtoken = "9"
thiserror = "1"
tower-http = { version = "0.5", features = ["cors", "trace"] }
```

Compiler warning:

```
warning: the following packages contain code that will be rejected by a future version of Rust: sqlx-postgres v0.7.4
```

**Problems:**

- Rust 2024 edition is available with new features and improvements
- `sqlx-postgres v0.7.4` contains deprecated code patterns
- Dependency versions without patch number (e.g., `"0.7"` instead of `"0.7.x"`) may lead to unexpected breakages

**Action Item:**

1. Update to Rust 2024 edition: `edition = "2024"`
2. Update `sqlx` to latest version that fixes the warning
3. Consider pinning exact versions or using `~` for minor version flexibility:

```toml
axum = "0.7.9"
# or
axum = "~0.7"  # allows 0.7.x but not 0.8
```

---

### Deviation ST-005: Missing `codestyle.md`

**Observation:** Repository lacks a `codestyle.md` file documenting project-specific coding standards.

**Evidence:** No `codestyle.md` in repository root.

**Problem details:**

Per company onboarding rulebook, each repository should have a `codestyle.md` that defines:

- Task markers (e.g., `xxx:`, `qqq:`, `aaa:`) for tracking tasks/questions in code
- Project-specific formatting rules
- Vocabulary and naming conventions
- Guidelines ensuring consistency across the codebase

**Action Item:** Create `codestyle.md` in repository root following company template. Include:

```markdown
# Code Style

## Task Markers

- `xxx:` — TODO item, work in progress
- `qqq:` — Question, needs clarification
- `aaa:` — Resolved question/decision

## Rust Conventions

- Follow standard `rustfmt` formatting
- Group imports: std, external crates, crate::
- Use `thiserror` for internal errors
- ... (project-specific rules)
```

---

### Deviation ST-006: Missing Error Handling Architecture in SPEC.md

**Observation:** Project lacks documented error handling standards in SPEC.md.

**Evidence:** `SPEC.md` has no section defining error handling patterns.

**Problem details:**

Error handling architecture should be documented in SPEC.md as a canonical reference, not embedded in code review documents. This ensures:

- Single source of truth for error patterns
- Consistent implementation across handlers
- Easier onboarding for new developers

**Action Item:** Add "5. Error Handling Architecture" section to SPEC.md with the following content:

```rust
// SPEC.md Section 5: Error Handling Architecture
// Use a unified ApiError enum with IntoResponse implementation (idiomatic Axum pattern)

use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::json;

#[derive(Debug)]
pub enum ApiError {
  BadRequest(String),
  Unauthorized,
  NotFound,
  Conflict(String),
  Internal,
}

impl IntoResponse for ApiError {
  fn into_response(self) -> Response {
    let (status, message) = match self {
      Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
      Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
      Self::NotFound => (StatusCode::NOT_FOUND, "Not found".into()),
      Self::Conflict(msg) => (StatusCode::CONFLICT, msg),
      Self::Internal => {
        (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into())
      }
    };
    (status, Json(json!({ "error": message }))).into_response()
  }
}

impl From<sqlx::Error> for ApiError {
  fn from(err: sqlx::Error) -> Self {
    tracing::error!("Database error: {}", err);
    Self::Internal
  }
}

impl From<redis::RedisError> for ApiError {
  fn from(err: redis::RedisError) -> Self {
    tracing::error!("Redis error: {}", err);
    Self::Internal
  }
}
```

> **Note:** A single unified `ApiError` is preferred over a two-tier system for a codebase of this size.

---

## Code Style Issues (CS)

### Deviation CS-001: Emoji Usage in Logs

**Observation:** Log messages contain emojis which display poorly in many logging systems and complicate log searching.

**Evidence:**

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

**Action Item:** Replace with structured logging:

```rust
tracing::info!(address = %addr, "Server listening");
tracing::error!(key = %redis_key, "Nonce not found or expired");
tracing::warn!("Invalid signature attempt");
tracing::info!("Signature verified successfully");
```

---

### Deviation CS-002: Magic Numbers Without Constants

**Observation:** Wallet address length validation uses unexplained magic numbers.

**Evidence:** `handlers/auth.rs:155`

```rust
let len = payload.wallet_address.len(); if len != 66 & & len != 68 {
tracing::error ! ("Invalid wallet address length: {}. Expected 66 or 68.", len);
return Err(StatusCode::BAD_REQUEST);
}
```

**Action Item:** Extract to named constants:

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

### Deviation CS-003: Unwrap/Expect in Production Code

**Observation:** Multiple uses of `unwrap()` and `expect()` in code can cause server panics.

**Complete Inventory:**

Total: 10 `expect()` + 19 `unwrap()` = 29 occurrences

#### ⚠️ CRITICAL - Requires Immediate Fix

| Location               | Code                         | Risk                                          |
|------------------------|------------------------------|-----------------------------------------------|
| `handlers/auth.rs:226` | `.expect("valid timestamp")` | Can panic on timestamp overflow (theoretical) |

#### ⚡ MOCK DATA - Will Be Replaced

| Location                       | Code                                      | Note                           |
|--------------------------------|-------------------------------------------|--------------------------------|
| `handlers/business.rs:120`     | `Decimal::from_i64(150000).unwrap()`      | Mock implementation            |
| `handlers/business.rs:121`     | `Decimal::from_i64(45000).unwrap()`       | Mock implementation            |
| `handlers/business.rs:124`     | `Decimal::from_i64(12000).unwrap()`       | Mock implementation            |
| `handlers/business.rs:128`     | `Decimal::from_f64(0.24).unwrap()`        | Mock implementation            |
| `handlers/business.rs:138-179` | Multiple `Decimal::from_*(...).unwrap()`  | Mock implementation (10 total) |
| `handlers/business.rs:199`     | `serde_json::from_value(...).expect(...)` | Mock implementation            |
| `handlers/business.rs:215`     | `serde_json::from_value(...).expect(...)` | Mock implementation            |
| `handlers/business.rs:218`     | `NaiveDate::from_ymd_opt(...).unwrap()`   | Mock implementation            |

#### ✅ ACCEPTABLE - Startup Failures

| Location     | Code                                         | Rationale                             |
|--------------|----------------------------------------------|---------------------------------------|
| `main.rs:27` | `expect("Failed to load configuration")`     | No point continuing without config    |
| `main.rs:30` | `expect("Invalid DATABASE_URL")`             | No point continuing without valid URL |
| `main.rs:37` | `expect("Failed to connect to Postgres")`    | No point continuing without DB        |
| `main.rs:44` | `expect("Failed to run migrations")`         | No point continuing with bad schema   |
| `main.rs:50` | `expect("Invalid Redis URL")`                | No point continuing without Redis     |
| `main.rs:71` | `TcpListener::bind(addr).await.unwrap()`     | No point continuing without listener  |
| `main.rs:75` | `axum::serve(...).await.unwrap()`            | No point continuing if serve fails    |
| `main.rs:82` | `expect("failed to install Ctrl+C handler")` | Signal handlers are critical          |
| `main.rs:88` | `expect("failed to install signal handler")` | Signal handlers are critical          |

#### ✅ ACCEPTABLE - Test Code

| Location        | Code                                            | Rationale      |
|-----------------|-------------------------------------------------|----------------|
| `crypto.rs:67`  | `SecretKey::ed25519_from_bytes(bytes).unwrap()` | Test code      |
| `crypto.rs:91`  | `result.unwrap()`                               | Test assertion |
| `crypto.rs:109` | `result.unwrap()`                               | Test assertion |
| `crypto.rs:117` | `SecretKey::ed25519_from_bytes(...).unwrap()`   | Test code      |

#### ✅ SAFE - Has Fallback

| Location               | Code                                                   | Rationale                |
|------------------------|--------------------------------------------------------|--------------------------|
| `handlers/auth.rs:195` | `redis_conn.del(...).await.unwrap_or(())`              | Safe fallback to unit    |
| `handlers/auth.rs:222` | `UserRole::from_str(...).unwrap_or(UserRole::Unknown)` | Safe fallback to Unknown |

**Action Items:**

* **CRITICAL**: Fix `handlers/auth.rs:226`:

```rust
// Instead of:
let expiration = Utc::now().checked_add_signed(Duration::hours(24)).expect("valid timestamp").timestamp();

// Better:
let expiration = Utc::now().checked_add_signed(Duration::hours(24)).ok_or_else(| | {
tracing::error ! ("Timestamp overflow calculating expiration"); StatusCode::INTERNAL_SERVER_ERROR
}) ?.timestamp();
```

* **MOCK DATA**: Will be replaced when real business logic is implemented. Track with issue/ticket.

* **STARTUP**: Keep as-is — fail-fast on critical initialization is appropriate.

---

### Deviation CS-004: Non-idiomatic Import Grouping

**Observation:** Imports are not grouped according to Rust conventions. Also, `std::` is used where `core::` would suffice (for `no_std` compatibility).

**Evidence:** `handlers/auth.rs`

```rust
use axum::{...};
use chrono::{Duration, Utc};
// ...
use std::str::FromStr;
use std::sync::Arc;
```

**Action Item:** Group imports in order:

1. `core`/`std` library (prefer `core::` when possible)
2. External crates
3. Internal modules (`crate::`)

```rust
use core::str::FromStr;
use std::sync::Arc;

use axum::{...};
use chrono::{Duration, Utc};

use crate::{
  crypto::verify_casper_signature,
  models::{Claims, UserId, UserRole},
};
```

---

### Deviation CS-005: Missing `#[must_use]` Attributes

**Observation:** Functions returning important values lack `#[must_use]` attribute.

**Evidence:** `crypto.rs` — `verify_casper_signature` returns `Result<bool, CryptoError>`.

**Action Item:** Add `#[must_use]` to functions where ignoring the result is an error:

```rust
#[must_use]
pub fn verify_casper_signature(...) -> Result<bool, CryptoError>
```

---

### Deviation CS-006: Inconsistent Documentation

**Observation:** Documentation coverage is inconsistent across modules. Most files lack module-level `//!` documentation comments.

**Evidence:**

- `crypto.rs` — well documented
- `handlers/auth.rs` — well documented
- `config.rs` — minimal documentation
- `auth.rs` (extractor) — no struct documentation
- Most files missing `//!` module description at the top

**Action Item:**

* Add `//!` module documentation at the top of each file:

```rust
//! Authentication middleware for JWT token extraction and validation.
//!
//! This module provides the `AuthUser` extractor for Axum handlers.

use...
```

* Add documentation to all public APIs:

```rust
/// JWT Authentication extractor for Axum handlers.
///
/// Extracts and validates JWT tokens from the `Authorization: Bearer <token>` header.
pub struct AuthUser(pub Claims);
```

---

## Architectural Anti-patterns (AP)

### Deviation AP-001: Business Logic in Handlers *(DEFERRED)*

> **Deferral rationale:** Current codebase is ~958 lines. Extracting a service layer adds complexity without proportional benefit at this scale. Revisit when codebase exceeds ~2000 lines or when multiple handlers share business logic.

**Observation:** Business logic is mixed with HTTP layer, making it untestable in isolation.

**Evidence:** `handlers/business.rs:119-150`

```rust
pub async fn calculate_tax_liability(...) -> Result<Json<TaxReport>, StatusCode> {
  // MOCK Implementation
  let total_income = Decimal::from_i64(150000).unwrap();
  // ... all calculations directly in handler
}
```

**Future Action:** Extract a service layer when complexity warrants:

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

### Deviation AP-002: Missing Database Layer *(DEFERRED)*

> **Deferral rationale:** With only 2-3 SQL queries in the codebase, a separate db layer adds indirection without benefit. Revisit when query count exceeds 10 or when queries are duplicated across handlers.

**Observation:** SQL queries are written directly in handlers, causing duplication and testing difficulties.

**Evidence:** `handlers/auth.rs:202-220`

```rust
let user_record = sqlx::query!(
    r#"INSERT INTO users (...) VALUES (...) RETURNING id, role"#,
    // ...
).fetch_one( & state.db).await
```

**Future Action:** Move SQL queries to a dedicated `db` module when query count grows:

```
src/
├── db/                # Database layer
│   ├── mod.rs
│   └── user.rs        # User-related queries
├── handlers/          # HTTP layer
├── services/          # Business logic
└── ...
```

```rust
// src/db/user.rs
pub async fn find_or_create_by_wallet(
  pool: &PgPool,
  wallet: &str,
) -> Result<User, DbError> {
  sqlx::query_as!(...).fetch_one(pool).await
}
```

---

### Deviation AP-003: Config Not Fully Validated

**Observation:** Configuration values are not validated for correctness.

**Evidence:** `config.rs` — `port` can be 0, URLs are not validated.

**Action Item:** Add validation:

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

### Deviation AP-004: Missing Rate Limiting Middleware

**Observation:** Authentication endpoints lack rate limiting, making them vulnerable to abuse.

**Evidence:** `/api/v1/auth/nonce` has no rate limiting.

**Action Item:** Add rate limiting via `tower-governor` or custom middleware.

---

### Deviation AP-005: Missing Workspace Structure *(DEFERRED)*

> **Deferral rationale:** Single-crate structure is appropriate for a ~958 line codebase with one binary. Workspace overhead (multiple Cargo.toml files, cross-crate dependency management) not justified until a second crate (e.g., indexer) is actually needed.

**Observation:** Project is a single crate without workspace organization, limiting scalability for future modules.

**Evidence:** Root `Cargo.toml` defines a single package, not a workspace.

**Problem details:**

- No separation between different concerns (backend API, potential indexers, shared types)
- Future modules (e.g., vesting/leasing indexer) would require separate repos or awkward structure
- Dependencies cannot be shared/unified across multiple crates

**Future Action:** Restructure as a Cargo workspace when adding second crate:

```
leasefi/
├── Cargo.toml              # Workspace root
├── crates/
│   ├── api/                # Current backend service
│   │   ├── Cargo.toml
│   │   └── src/
│   ├── indexer/            # Future: vesting/leasing indexer
│   │   ├── Cargo.toml
│   │   └── src/
│   └── common/             # Shared types, utilities
│       ├── Cargo.toml
│       └── src/
└── ...
```

Root `Cargo.toml`:

```toml
[workspace]
resolver = "2"
members = ["crates/*"]

[workspace.dependencies]
axum = "0.7.9"
sqlx = { version = "0.8", features = ["runtime-tokio-rustls", "postgres"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
# ... shared deps
```

---

## Security Concerns (SC)

### Deviation SC-001: Placeholder Email May Cause Collisions

**Observation:** Generated placeholder emails use only first 16 characters of wallet address, risking collisions.

**Evidence:** `handlers/auth.rs:198`

```rust
let placeholder_email = format!("wallet_{}@leasefi.local", &payload.wallet_address[..16]);
```

**Action Item:** Use a truncated hash of the wallet address (RFC 5321 limits local part to 64 chars):

```rust
use sha2::{Sha256, Digest};

let hash = Sha256::digest(payload.wallet_address.as_bytes()); let hash_hex = format!("{:x}", hash);
// Truncate to 57 chars: 64 (limit) - 7 ("wallet_" prefix) = 57
let placeholder_email = format!("wallet_{}@leasefi.local", &hash_hex[..57]);
// Result: wallet_a1b2c3d4e5f6...@leasefi.local (64 chars total in local part)
```

---

### Deviation SC-002: Hardcoded Role for New Users

**Observation:** All new users are assigned `tenant` role regardless of their intended use case.

**Evidence:** `handlers/auth.rs:207`

```rust
VALUES ($ 1, 'tenant', $ 2, 'Wallet', 'User', NULL, 'active')
```

**Problem details:**

LeaseFi has multiple user roles (`tenant`, `landlord`, `agent`, `admin`), but registration always assigns `tenant`:

- Landlords cannot register with correct role — property owners who want to list rentals start as tenants
- Agents cannot self-register with agent role
- Role change requires manual admin intervention or separate process not present in code

**Note:** This may be intentional if the business logic requires landlord/agent verification before role assignment. Clarify with the team.

**Action Item:** Either:

1. Add `requested_role` parameter to `LoginRequest` with validation (e.g., only allow `tenant`/`landlord`, not `admin`)
2. Create separate registration flows for different user types
3. Document that role upgrade is a separate admin-controlled process

---

### Deviation SC-003: Missing Audit Logging

**Observation:** Critical operations are not logged with structured audit data.

**Evidence:** Login and nonce generation lack structured audit fields.

**Action Item:** Add structured audit logging:

```rust
tracing::info!(
    event = "user_login",
    wallet_address = %payload.wallet_address,
    user_id = %user_record.id,
    "User logged in successfully"
);
```

---

### Deviation SC-004: Potential Timing Attack in Signature Verification

**Observation:** Signature verification may be vulnerable to timing side-channel attacks if the underlying comparison is not constant-time.

**Evidence:** `handlers/auth.rs:177-185` and `crypto.rs`

```rust
let is_valid = verify_casper_signature( & payload.wallet_address,
payload.signature.expose_secret(),
& stored_nonce,
)
```

**Risk:** Timing attacks can potentially leak information about valid signatures through response time differences.

**Action Item:** Verify that the Casper SDK's signature verification uses constant-time comparison. If using custom comparison, use `subtle::ConstantTimeEq`:

```rust
use subtle::ConstantTimeEq;

// Constant-time comparison
if computed_sig.ct_eq( & provided_sig).into() {
// Valid
}
```

---

### Deviation SC-005: No Rate Limiting on Authentication Endpoints

**Observation:** Authentication endpoints lack rate limiting, making them vulnerable to brute force attacks.

**Evidence:** `handlers/auth.rs` - routes `/nonce` and `/login` have no rate limiting middleware.

**Attack Vector:**

- Attacker can flood `/nonce` endpoint to exhaust Redis storage
- Attacker can attempt brute force signature attacks on `/login`

**Action Item:** Add rate limiting using `tower-governor`:

```rust
use tower_governor::{GovernorLayer, GovernorConfigBuilder};

let governor_conf = GovernorConfigBuilder::default ().per_second(2)        // 2 requests per second
.burst_size(5)        // Allow burst of 5
.finish().unwrap();

let app = Router::new().nest("/api/v1/auth", handlers::auth::router()).layer(GovernorLayer { config: governor_conf });
```

---

### Deviation SC-006: JWT Expiry Uses Signed Arithmetic

**Observation:** JWT expiration calculation uses signed duration arithmetic which could theoretically overflow.

**Evidence:** `handlers/auth.rs:224-227`

```rust
let expiration = Utc::now().checked_add_signed(Duration::hours(24)).expect("valid timestamp").timestamp();
```

**Risk:** While extremely unlikely in practice (would require system clock set far in the future), this is a code smell. The `expect()` will panic on overflow.

**Action Item:** Handle the error gracefully (see CS-003 fix).

---

### Deviation SC-007: Potential Credential Exposure in Error Logs

**Observation:** Error messages may expose sensitive information like connection strings.

**Evidence:** `main.rs:29-30`

```rust
let db_options = PgConnectOptions::from_str(config.database_url.expose_secret()).expect("Invalid DATABASE_URL");
```

**Risk:** If `expect()` triggers, the panic message might include the DATABASE_URL which could contain credentials.

**Action Item:** Use custom error messages that don't expose secrets:

```rust
let db_options = PgConnectOptions::from_str(config.database_url.expose_secret()).map_err( | e| {
tracing::error ! ("Failed to parse DATABASE_URL: {}", e);
// Don't include the actual URL in the error
}).expect("Invalid DATABASE_URL format");
```

---

### Deviation SC-008: Missing CORS Configuration

**Observation:** CORS is not configured despite `tower-http` cors feature being enabled.

**Evidence:** `main.rs` - no `CorsLayer` applied to router. `Cargo.toml` includes `tower-http = { features = ["cors", ...] }`.

**Risk:**

- Without CORS, frontend apps on different origins cannot access the API
- If CORS is added later without proper configuration, it could allow credential theft

**Action Item:** Configure CORS explicitly with restrictive defaults:

```rust
use tower_http::cors::{CorsLayer, AllowOrigin};

let cors = CorsLayer::new().allow_origin(AllowOrigin::exact(
"https://leasefi.app".parse().unwrap()
)).allow_methods([Method::GET, Method::POST]).allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]).allow_credentials(false);  // Only set to true if absolutely needed

let app = Router::new()
// ... routes
.layer(cors);
```

**Warning:** Never use `allow_credentials(true)` with `allow_origin(Any)` - this is a security vulnerability.

---

### Deviation SC-009: No Request Size Limits

**Observation:** No limits on request body size, making the API vulnerable to DoS attacks via large payloads.

**Evidence:** `main.rs` - no `RequestBodyLimitLayer` configured.

**Attack Vector:** Attacker can send extremely large JSON payloads to exhaust server memory.

**Action Item:** Add request size limits:

```rust
use tower_http::limit::RequestBodyLimitLayer;

let app = Router::new()
// ... routes
.layer(RequestBodyLimitLayer::new(1024 * 1024)); // 1MB limit
```

---

### Deviation SC-010: Password Hashing Not Used (Design Note)

**Observation:** The system uses wallet-based authentication (cryptographic signatures) instead of passwords, so bcrypt/argon2 are not applicable.

**Note:** This is actually a **positive security decision** - cryptographic signatures are stronger than password-based auth. No action needed.

However, if password auth is added in the future:

- Use `argon2` (preferred) or `bcrypt` with cost factor ≥ 12
- Never store plaintext passwords

---

## Best Practice Violations (BP)

### Deviation BP-001: Missing dev-dependencies

**Observation:** No test utilities or mocking libraries configured.

**Evidence:** `Cargo.toml` has no `[dev-dependencies]` section.

**Action Item:** Add dev dependencies:

```toml
[dev-dependencies]
tokio-test = "0.4"
wiremock = "0.6"         # HTTP mocking
fake = "4"               # Test data generation
rstest = "0.24"          # Parametrized tests
assert_matches = "1.5"
```

---

### Deviation BP-002: Missing Integration Tests

**Observation:** Project has unit tests but lacks integration tests for HTTP endpoints.

**Evidence:** `crypto.rs` and `business.rs` contain `#[cfg(test)] mod tests { ... }` blocks (idiomatic Rust pattern for unit tests ✓), but no `tests/` directory exists for integration tests.

```rust
// crypto.rs:56 — unit tests (idiomatic, keep as-is)
#[cfg(test)]
mod tests {
  use super::*;
  // ...
}
```

**Problem details:**

- Unit tests exist inline (correct Rust convention)
- No integration tests for API endpoints
- Cannot verify end-to-end behavior (auth flow, health checks)

**Action Item:**

Create `tests/` directory for integration tests only:

```
tests/
├── common/
│   └── mod.rs           # Test utilities (test app setup, fixtures)
├── auth_test.rs         # Auth flow integration tests
└── health_test.rs       # Health check integration tests
```

> **Note:** Inline `#[cfg(test)] mod tests` blocks are idiomatic Rust for unit tests and should remain in source files.

**Test Documentation Quality (additional recommendations):**

| Aspect            | Current State | Recommendation                             |
|-------------------|---------------|--------------------------------------------|
| Test doc comments | ❌ Missing     | Add `///` comments describing test purpose |
| Test naming       | ✅ Descriptive | `test_verify_valid_signature` is clear     |
| `tests/readme.md` | ❌ Missing     | Create with test Responsibility Table      |
| Fixtures          | ❌ Hardcoded   | Extract test data to `common/fixtures.rs`  |

---

### Deviation BP-003: Missing Debug Derive

**Observation:** Enum lacks `Debug` derive, complicating debugging.

**Evidence:** `handlers/health.rs:15-26`

```rust
#[derive(Serialize, PartialEq)]
enum ConnectionStatus {
```

**Action Item:** Add `Debug`:

```rust
#[derive(Debug, Serialize, PartialEq)]
```

---

### Deviation BP-004: Suboptimal Error Structure

**Observation:** Error enum has unused variants and lacks context.

**Evidence:** `auth.rs:52-57`

```rust
pub enum AuthError {
  MissingCredentials,
  InvalidToken,
  ServerConfiguration,  // unused
}
```

**Action Item:** Improve error structure:

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

### Deviation BP-005: Missing Graceful Degradation for Redis

**Observation:** Server fails to start if Redis is unavailable.

**Evidence:** `main.rs` — Redis connection failure is fatal.

**Action Item:** Consider:

- Retry logic on connection
- Circuit breaker pattern
- Fallback to in-memory storage for non-critical operations

---

### Deviation BP-007: Unused `anyhow` Dependency

**Observation:** `anyhow` crate is declared in `Cargo.toml` but is **never imported or used** anywhere in the source code. This is a dead dependency that should be removed.

**Evidence:** `Cargo.toml:20`

```toml
anyhow = "1.0"
thiserror = "1"
```

**Verification:**

```bash
$ grep -r "use.*anyhow" src/
# Result: NO MATCHES

$ grep -r "anyhow" src/
# Result: NO MATCHES
```

**Problem details:**

- Dead dependency increases compile times
- Unused crates may introduce unnecessary security surface
- `thiserror` is already present and correctly used for typed errors

**Action Item:**

1. Remove `anyhow` from `Cargo.toml` dependencies
2. Implement `ApiError` enum as documented in **ST-006** (see SPEC.md Error Handling Architecture)

> **Note:** If organizational standards require `error_tools` crate for error handling, use that framework instead of custom `ApiError`. Verify applicable standards before implementation.

---

## Recommendations

### Critical (Security)

| ID     | Recommendation                  | Rationale                          |
|--------|---------------------------------|------------------------------------|
| SC-005 | Add rate limiting               | Brute force protection             |
| SC-008 | Configure CORS properly         | Prevent credential theft           |
| SC-009 | Add request size limits         | DoS protection                     |
| CS-003 | Fix `expect()` in `auth.rs:226` | Prevent potential panic in handler |

### High Priority

| ID     | Recommendation                        | Rationale                   |
|--------|---------------------------------------|-----------------------------|
| ST-002 | Remove `Cargo.lock` from `.gitignore` | Reproducible builds         |
| ST-001 | Add Makefile                          | Developer experience        |
| ST-003 | Add CI/CD configuration               | Quality automation          |
| ST-004 | Update dependencies and edition       | Compiler warnings, security |
| ST-005 | Add `codestyle.md`                    | Company standards           |
| ST-006 | Add error handling to SPEC.md         | Canonical architecture docs |
| CS-001 | Replace emojis in logs                | Production readiness        |
| SC-001 | Fix placeholder email                 | Security (collisions)       |
| SC-004 | Verify constant-time signature check  | Timing attack prevention    |
| SC-007 | Sanitize error messages               | Credential exposure         |

### Medium Priority

| ID     | Recommendation            | Rationale               |
|--------|---------------------------|-------------------------|
| BP-002 | Add integration tests     | Quality                 |
| BP-007 | Remove anyhow, fix errors | Security, API stability |
| SC-003 | Add structured audit logs | Security monitoring     |

### Deferred (Future Considerations)

| ID     | Recommendation           | Deferral Rationale                                      |
|--------|--------------------------|---------------------------------------------------------|
| AP-001 | Extract service layer    | Codebase too small (~958 lines); revisit at ~2000 lines |
| AP-002 | Create db module         | Only 2-3 queries; revisit when query count exceeds 10   |
| AP-005 | Restructure as workspace | Single crate sufficient; revisit when adding 2nd crate  |

### Low Priority

| ID     | Recommendation                     | Rationale        |
|--------|------------------------------------|------------------|
| CS-002 | Extract magic numbers to constants | Code readability |
| CS-005 | Add #[must_use]                    | Compiler checks  |
| CS-004 | Organize imports                   | Code style       |
| BP-003 | Add Debug derives                  | Debugging        |
| BP-004 | Improve error types                | Error handling   |

---

## Prioritized Action Plan

### Phase 1: Critical Security Fixes

* Fix `expect()` in `handlers/auth.rs:226` (CS-003)
* Add rate limiting on auth endpoints (SC-005)
* Add request size limits (SC-009)
* Configure CORS with restrictive defaults (SC-008)

### Phase 2: Standards and CI

* Remove `Cargo.lock` from `.gitignore`, commit `Cargo.lock` (ST-002)
* Create basic `Makefile` (ST-001)
* Add `codestyle.md` (ST-005)
* Add error handling architecture to SPEC.md (ST-006)
* Update dependencies and Rust edition (ST-004)
* Add GitHub Actions workflow (ST-003)
* Replace emojis in logs (CS-001)

### Phase 3: Security Hardening

* Fix placeholder email collision (SC-001)
* Verify constant-time signature verification (SC-004)
* Sanitize error messages to prevent credential exposure (SC-007)
* Add structured audit logging (SC-003)
* Refactor error handling — remove `anyhow` (BP-007)

### Phase 4: Quality Improvements

* Add integration tests (BP-002)
* Improve documentation (CS-006)

### Future Considerations (Deferred)

The following architectural refactorings are deferred until the codebase grows to justify their complexity:

* Extract service layer (AP-001) — revisit when codebase exceeds ~2000 lines
* Create db module (AP-002) — revisit when query count exceeds 10
* Restructure as Cargo workspace (AP-005) — revisit when adding second crate (e.g., indexer)
