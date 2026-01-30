# Code Review: LeaseFi Smart Contracts

Date: 2026-01-29  
Reviewer: Ivan Kinder  
Framework: Odra 2.4.0  
Target Network: Casper Network  
CompletionStatus: completed

---

## Table of Contents

1. [Review Methodology](#review-methodology)
2. [Overview](#overview)
3. [Deviations from Standards (ST)](#deviations-from-standards-st)
4. [Code Style Issues (CS)](#code-style-issues-cs)
5. [Architectural Anti-patterns (AP)](#architectural-anti-patterns-ap)
6. [Security Concerns (SC)](#security-concerns-sc)
7. [Best Practice Violations (BP)](#best-practice-violations-bp)
8. [Recommendations](#recommendations)
9. [Prioritized Action Plan](#prioritized-action-plan)

---

## Review Methodology

### How Findings Were Gathered

This review was conducted through:

1. **Manual code inspection** - line-by-line review of all source files
2. **Static analysis** - `cargo clippy` analysis
3. **Dependency audit** - `Cargo.toml` analysis
4. **Pattern matching** - searches for common antipatterns (`unwrap`, hardcoded values, arithmetic operations)
5. **Security checklist** - Smart contract security patterns specific to Casper/Odra

### Verification Commands Used

```bash
# Check for unwrap usage in production code
grep -rn "\.unwrap()" src/ --include="*.rs" | grep -v "#\[cfg(test)\]" | grep -v "mod tests"

# Check for arithmetic operations without overflow protection
grep -rn "\* \|+ \|- \|/ " src/ --include="*.rs"

# Check dependencies
cat Cargo.toml

# Run tests
cargo nextest run

# Build contracts
cargo run --bin leasefi_contracts_build_contract
```

### Confidence Levels

| Category           | Confidence | Notes                                        |
|--------------------|------------|----------------------------------------------|
| ST (Standards)     | High       | Verified against file system and Cargo.toml  |
| CS (Code Style)    | High       | Direct code inspection with line numbers     |
| AP (Architecture)  | Medium     | Based on Odra/Casper best practices          |
| SC (Security)      | High       | Smart contract specific security patterns    |
| BP (Best Practice) | High       | Based on Rust and Odra ecosystem conventions |

### Verification Disclaimer

> **Note:** Readers should independently verify findings before implementing fixes. Line numbers may shift as code evolves.

---

## Overview

| Parameter      | Value                 |
|----------------|-----------------------|
| Language       | Rust 2021 edition     |
| Framework      | Odra 2.4.0            |
| Target         | Casper Network (WASM) |
| Lines of Code  | 3,680 lines of Rust   |
| Contract Count | 7 contracts           |
| Test Count     | 88 tests              |
| Toolchain      | nightly-2025-01-01    |

---

## Deviations from Standards (ST)

### Deviation ST-001: Cargo.lock in .gitignore

**Observation:** The `.gitignore` file excludes `Cargo.lock` from version control.

**Impact:**

- Team members may get different dependency versions
- Cannot guarantee reproducible builds
- CI/CD may produce different results across runs

**Evidence:** `.gitignore:9` contains `Cargo.lock`.

**Action Item:** Remove `Cargo.lock` from `.gitignore`. For binary projects and smart contracts, `Cargo.lock` **MUST** be committed to ensure reproducible builds and deterministic WASM output.

> See: https://doc.rust-lang.org/cargo/faq.html#why-have-cargolock-in-version-control

---

### Deviation ST-002: Missing Makefile

**Observation:** The project lacks a Makefile with commonly used commands.

**Evidence:** No `Makefile` present in the repository root.

**Action Item:** Add a Makefile following company project standards:

```Makefile
.PHONY:   \
  help    \
  build   \
  test    \
  schema  \
  clean   \
  lint    \
  fmt     \
  ci      \
  deploy

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_.-]+:.*?## ' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-12s %s\n", $$1, $$2}'

build: ## Build all contracts
	@echo "[*] Building contracts..."
	@cargo run --bin leasefi_contracts_build_contract

test: ## Run all tests
	@echo "[*] Running tests..."
	@cargo nextest run

schema: ## Generate contract schemas (ABI)
	@echo "[*] Generating schemas..."
	@cargo run --bin leasefi_contracts_build_schema

clean: ## Clean build artifacts
	@echo "[*] Cleaning..."
	@cargo clean
	@rm -rf wasm/

lint: ## Run clippy in strict mode
	@echo "[*] Running clippy..."
	@cargo clippy --all-targets -- -D warnings

fmt: ## Check formatting
	@echo "[*] Checking formatting..."
	@cargo fmt --all -- --check

ci: fmt lint test ## Full CI pipeline

deploy: ## Deploy to testnet (requires ODRA_CASPER_LIVENET_ENV)
	@echo "[*] Deploying contracts..."
	@test -n "$(ODRA_CASPER_LIVENET_ENV)" || (echo "Error: ODRA_CASPER_LIVENET_ENV not set" && exit 1)
	@cargo run --bin leasefi_contracts_cli deploy
```

---

### Deviation ST-003: Missing CI/CD Configuration

**Observation:** No automated CI/CD pipeline configuration exists.

**Evidence:** No `.github/workflows/*.yml` files or equivalent.

**Action Item:** Add GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ master, main ]
  pull_request:
    branches: [ master, main ]

env:
  CARGO_TERM_COLOR: always

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: nightly-2025-01-01
          targets: wasm32-unknown-unknown
          components: rustfmt, clippy

      - name: Check formatting
        run: cargo fmt --all -- --check

      - name: Run clippy
        run: cargo clippy --all-targets -- -D warnings

      - name: Run tests
        run: cargo nextest run

      - name: Build contracts
        run: cargo run --bin leasefi_contracts_build_contract
```

---

### Deviation ST-004: Missing `codestyle.md`

**Observation:** Repository lacks a `codestyle.md` file documenting project-specific coding standards.

**Evidence:** No `codestyle.md` in repository root.

**Problem details:**

Per company onboarding rulebook, each repository should have a `codestyle.md` that defines:

- Task markers (e.g., `xxx:`, `qqq:`, `aaa:`) for tracking tasks/questions in code
- Project-specific formatting rules
- Vocabulary and naming conventions
- Guidelines ensuring consistency across the codebase

**Action Item:** Create `codestyle.md` in repository root following company template:

```markdown
# Code Style

## Task Markers

- `xxx:` — TODO item, work in progress
- `qqq:` — Question, needs clarification
- `aaa:` — Resolved question/decision

## Rust/Odra Conventions

- Follow standard `rustfmt` formatting
- Group imports: odra/casper_types, external crates, crate::
- Use `#[odra::odra_error]` for custom errors with unique error codes
- Error codes: 60xxx (Lease), 61xxx (Escrow), 62xxx (NFT), 63xxx (Staking), 64xxx (Treasury)
- Use `unwrap_or_revert_with` instead of `unwrap()` in contract code
- Emit events for all state-changing operations
```

---

### Deviation ST-005: Missing Toolchain Documentation

**Observation:** The project uses a specific nightly toolchain pinned via `rust-toolchain` file, but lacks documentation explaining the choice.

**Evidence:** `rust-toolchain` contains `nightly-2025-01-01`.

**Problem details:**

While the toolchain is properly pinned, there's no documentation explaining:

- Why nightly is required
- What specific features are being used
- Upgrade strategy for future nightly versions

**Action Item:** Add comment to `rust-toolchain` or document in README.md:

```
# rust-toolchain
# Nightly required for: Odra framework WASM compilation
# Last verified: 2025-01-01
# Upgrade procedure: Test with cargo run --bin leasefi_contracts_build_contract && cargo nextest run before updating
nightly-2025-01-01
```

---

### Deviation ST-006: Missing Prerequisites in README.md

**Observation:** README.md lacks a Prerequisites section documenting required tools and setup steps.

**Evidence:** `README.md` — no "Prerequisites" or "Requirements" section exists.

**Problem details:**

- No "Prerequisites" or "Requirements" section exists
- WASM target `wasm32-unknown-unknown` is required but not documented
- `cargo-nextest` for running tests is not documented

**Action Item:** Add Prerequisites section to README.md before Build section:

> **Prerequisites:**
> 1. Rust nightly toolchain (see `rust-toolchain` file)
> 2. WASM compilation target
> 3. cargo-nextest for running tests

```bash
rustup target add wasm32-unknown-unknown
cargo install cargo-nextest --locked
```

---

### Deviation ST-007: Consider Updating to Rust Edition 2024

**Observation:** Project uses `edition = "2021"` while Rust 2024 edition is now available.

**Evidence:** `Cargo.toml:4`

```toml
edition = "2021"
```

**Context:**

- Rust 2024 edition was released in stable Rust 1.85.0 (January 2025)
- Using nightly toolchain with edition 2021 is valid — these are independent settings
- Edition defines language syntax/semantics, toolchain defines compiler features

**Severity:** Low (informational)

**Action Item:** Consider upgrading to edition 2024 after verifying Odra framework compatibility:

```toml
edition = "2024"
```

**Note:** Test thoroughly with `cargo run --bin leasefi_contracts_build_contract && cargo nextest run` before committing.

---

## Code Style Issues (CS)

### Deviation CS-001: Mutable Getters in CurrencyAmount

**Observation:** `CurrencyAmount` struct exposes mutable references through getter methods, which is an antipattern.

**Evidence:** `src/common.rs:15-21`

```rust
pub fn currency(&mut self) -> &mut Option<Address> {
  &mut self.currency
}

pub fn amount(&mut self) -> &mut U256 {
  &mut self.amount
}
```

**Problem details:**

- Getters returning `&mut` break encapsulation
- Callers can modify internal state unexpectedly
- Makes reasoning about state changes difficult
- Violates principle of least surprise

**Action Item:** Implement proper getter/setter pattern:

```rust
impl CurrencyAmount {
  pub fn new(currency: Option<Address>, amount: U256) -> Self {
    Self { currency, amount }
  }

  // Immutable getters
  pub fn currency(&self) -> Option<Address> {
    self.currency
  }

  pub fn amount(&self) -> U256 {
    self.amount
  }

  // Builder pattern for modifications (if needed)
  pub fn with_amount(mut self, amount: U256) -> Self {
    self.amount = amount;
    self
  }

  pub fn with_currency(mut self, currency: Option<Address>) -> Self {
    self.currency = currency;
    self
  }
}
```

**Note:** This change will require updates to callers in tests:

- `lease.rs:572` - `*params.monthly_rent.amount() = U256::zero();`
- `escrow.rs:634,686` - `*params.amount_due.currency() = Some(...);`

---

### Deviation CS-002: Missing Module-Level Documentation

**Observation:** Most files lack module-level `//!` documentation comments.

**Evidence:**

- `lease.rs` — no module documentation
- `escrow.rs` — no module documentation
- `treasury.rs` — no module documentation
- `staking.rs` — no module documentation
- `nft.rs` — no module documentation
- `roles.rs` — no module documentation
- `tailor_coin.rs` — no module documentation

**Action Item:** Add `//!` module documentation at the top of each contract file:

```rust
//! # Lease Contract
//!
//! Manages property lease agreements on the Casper Network.
//!
//! ## Features
//! - Create lease agreements between landlords and tenants
//! - Automatic invoice generation via Escrow contract
//! - Lease prolongation and finalization
//! - Security deposit management
//!
//! ## Dependencies
//! - [`Roles`] - for landlord role verification
//! - [`Escrow`] - for invoice creation and payment management

use odra::...
```

---

### Deviation CS-003: Magic Numbers in Deployment Script

**Observation:** Gas values in deployment script are hardcoded without explanation.

**Evidence:** `bin/cli.rs:42-91`

```rust
350_000_000_000,  // TailorCoin
450_000_000_000,  // NFT
310_000_000_000,  // Roles
400_000_000_000,  // Treasury
400_000_000_000,  // Escrow
400_000_000_000,  // Lease
```

**Action Item:** Extract to named constants with documentation:

```rust
/// Gas limits for contract deployment (in motes)
/// These values were determined through testing on Casper testnet
mod gas_limits {
  /// TailorCoin (CEP-18): Simple token contract
  pub const TAILOR_COIN: u64 = 350_000_000_000;
  /// NFT (CEP-95): More complex with minter/burner logic
  pub const NFT: u64 = 450_000_000_000;
  /// Roles: Access control with multiple role types
  pub const ROLES: u64 = 310_000_000_000;
  /// Treasury/Escrow/Lease: Standard complex contracts
  pub const STANDARD: u64 = 400_000_000_000;
}
```

---

## Architectural Anti-patterns (AP)

### Deviation AP-001: Missing Integration Tests

**Observation:** The project has comprehensive inline unit tests but lacks integration tests for cross-contract interactions.

**Evidence:** Each contract file contains `#[cfg(test)] mod tests { ... }`:

- `lease.rs:377-1059`
- `escrow.rs:295-797`
- `treasury.rs:131-426`
- `nft.rs:220-625`
- `roles.rs:87-246`
- `tailor_coin.rs:33-196`
- `staking.rs:68-140`

**Context:**

Inline unit tests are the **standard convention for Odra framework**:
- `odra_test::env()` testing framework is designed for inline tests
- All official Odra examples (CEP-18, CEP-95, Governance) use inline tests
- Moving tests would break the Odra testing model

**Problem details:**

- No integration tests exist for cross-contract interactions
- Lease ↔ Escrow ↔ Treasury flow is not tested end-to-end

**Action Item:**

Keep inline unit tests (Odra convention) and add integration tests in `tests/` directory:

```
tests/
├── common/
│   └── mod.rs                   # Test utilities, setup helpers
└── integration/
    ├── lease_escrow_test.rs     # Lease + Escrow interaction
    └── treasury_staking_test.rs # Treasury + Staking interaction
```

---

### Deviation AP-002: Hardcoded Owner Address in Deployment Script

**Observation:** The deployment script contains a hardcoded account hash for ownership transfer.

**Evidence:** `bin/cli.rs:26-31`

```rust
let new_owner = Address::Account(
AccountHash::from_formatted_str(
"account-hash-4314047331390718c1aba071219b386d100f5a668633aa93c1cca3dc4b154e24",
).unwrap(),
);
```

**Problem details:**

- Hardcoded addresses make the script inflexible
- Risk of deploying to wrong owner on different environments
- Should be configurable via environment variable or CLI argument

**Action Item:** Make owner address configurable:

```rust
fn get_new_owner() -> Address {
  let owner_str = std::env::var("LEASEFI_NEW_OWNER").expect("LEASEFI_NEW_OWNER environment variable must be set");

  Address::Account(
    AccountHash::from_formatted_str(&owner_str).expect("Invalid account hash format in LEASEFI_NEW_OWNER")
  )
}
```

Update deployment documentation:

```bash
export LEASEFI_NEW_OWNER="account-hash-4314..."
ODRA_CASPER_LIVENET_ENV=env/casper-testnet.env cargo run --bin leasefi_contracts_cli deploy
```

---

### Deviation AP-003: Missing Contract Upgrade Strategy

**Observation:** Contracts are deployed as upgradeable but there's no documentation or tooling for upgrade process.

**Evidence:** `bin/cli.rs` uses `InstallConfig::upgradable::<T>()` for all contracts.

**Problem details:**

- No documented upgrade procedure
- No migration scripts for state changes
- No versioning strategy for contract ABIs

**Action Item:**

1. Document upgrade procedure in README.md
2. Add version constant to each contract
3. Consider adding upgrade scripts to CLI

```rust
// In each contract
pub const CONTRACT_VERSION: &str = "1.0.0";

#[odra::module]
impl Lease {
  /// Returns the contract version
  pub fn version(&self) -> String {
    CONTRACT_VERSION.to_string()
  }
}
```

---

## Security Concerns (SC)

### Deviation SC-001: Missing Finalization Check in prolong_lease_agreement

**Observation:** The `prolong_lease_agreement` function doesn't check if the lease is already finalized.

**Evidence:** `src/lease.rs:143-191`

```rust
pub fn prolong_lease_agreement(
  &mut self,
  lease_agreement_id: &U256,
  new_end: u64,
  invoice_validity_duration: u64,
) {
  let mut lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

  if lease_agreement.landlord != self.env().caller() {
    self.env().revert(Error::InvalidLandlord);
  }

  if self.env().get_block_time() < lease_agreement.end {
    self.env().revert(Error::LeaseAgreementHasNotFinishedYet);
  }

  self.assert_all_invoices_paid(&lease_agreement_id);
  // Missing: check if lease_agreement.is_finished == true
  // ...
}
```

**Risk:** A finalized lease agreement could potentially be prolonged, which may cause double-spending of security deposits.

**Severity:** Critical

**Action Item:** Add finalization check:

```rust
pub fn prolong_lease_agreement(...) {
  let mut lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

  if lease_agreement.is_finished {
    self.env().revert(Error::LeaseAgreementAlreadyFinalized);
  }

  // ... rest of the function
}
```

Add new error variant:

```rust
pub enum Error {
  // ...
  LeaseAgreementAlreadyFinalized = 60_009,
}
```

---

### Deviation SC-002: No Invoice Count Limit

**Observation:** There's no limit on the number of invoices that can be created for a lease agreement.

**Evidence:** `src/lease.rs:70-83` - Invoice creation loop

```rust
let mut invoices_ids = vec![self.escrow.create_security_deposit_invoice(...)];

for i in 0..(lease_duration / ONE_MONTH_IN_SECONDS) {
invoices_ids.push( self.escrow.create_lease_invoice(...));
}
```

**Risk:** A malicious landlord with the role could create a lease with an extremely long duration, generating thousands of invoices and potentially causing:

- High gas costs
- Contract state bloat
- Potential DoS on invoice queries

**Severity:** Low (requires landlord role, self-inflicted cost)

**Action Item:** Add a reasonable maximum lease duration:

```rust
/// Maximum lease duration: 10 years (120 months)
const MAX_LEASE_DURATION_MONTHS: u64 = 120;

pub fn create_lease_agreement(&mut self, params: CreateLeaseAgreementParams) -> U256 {
  // ... existing validations ...

  let months_count = lease_duration / ONE_MONTH_IN_SECONDS;
  if months_count > MAX_LEASE_DURATION_MONTHS {
    self.env().revert(Error::LeaseDurationTooLong);
  }

  // ... rest of function
}
```

---

## Best Practice Violations (BP)

### Deviation BP-001: Using unwrap() in Deployment Script

**Observation:** The deployment script uses `unwrap()` which can panic without useful error messages.

**Evidence:** `bin/cli.rs:28-30`

```rust
AccountHash::from_formatted_str(
"account-hash-4314047331390718c1aba071219b386d100f5a668633aa93c1cca3dc4b154e24",
).unwrap(),
```

And `bin/cli.rs:38`:

```rust
U256::from_dec_str("5000000000000000000000000000000").unwrap(),
```

**Action Item:** Use `expect()` with descriptive messages or proper error handling:

```rust
AccountHash::from_formatted_str( & owner_str).expect("Invalid account hash format for new owner")

U256::from_dec_str("5000000000000000000000000000000").expect("Invalid initial supply value")
```

---

### Deviation BP-002: Missing #[must_use] Attributes

**Observation:** Functions returning important values lack `#[must_use]` attribute.

**Evidence:** Multiple functions across contracts:

- `lease.rs:44` - `create_lease_agreement` returns `U256`
- `escrow.rs:62` - `create_lease_invoice` returns `U256`
- `nft.rs:114` - `get_tokens_count` returns `U256`

**Action Item:** Add `#[must_use]` to functions where ignoring the result is likely an error:

```rust
#[must_use]
pub fn create_lease_agreement(&mut self, params: CreateLeaseAgreementParams) -> U256 {
```

---

### Deviation BP-003: Commented Out Code in Deployment Script

**Observation:** There's commented out code in the deployment script.

**Evidence:** `bin/cli.rs:94`

```rust
// treasury.set_staking(staking.address());
```

**Action Item:** Either remove the commented code or add a comment explaining why it's temporarily disabled:

```rust
// NOTE: Staking integration disabled until Staking contract implementation is complete
// treasury.set_staking(staking.address());
```

Or better, use a feature flag or conditional:

```rust
#[cfg(feature = "staking")]
treasury.set_staking(staking.address());
```

---

### Deviation BP-004: Missing Events Documentation

**Observation:** Events are defined but lack documentation explaining when they're emitted.

**Evidence:** `src/lease.rs:310-330`

```rust
#[odra::event]
pub struct LeaseAgreementCreated {
  pub lease_agreement_id: U256,
  pub created_at: u64,
}
```

**Action Item:** Add documentation to all events:

```rust
/// Emitted when a new lease agreement is created
///
/// # Fields
/// - `lease_agreement_id`: Unique identifier for the created agreement
/// - `created_at`: Block timestamp when the agreement was created
#[odra::event]
pub struct LeaseAgreementCreated {
  pub lease_agreement_id: U256,
  pub created_at: u64,
}
```

---

## Recommendations

### Critical (Security)

| ID     | Recommendation                            | Rationale                           |
|--------|-------------------------------------------|-------------------------------------|
| SC-001 | Add finalization check in `prolong_lease` | Prevent prolonging finalized leases |

### High Priority

| ID     | Recommendation                        | Rationale              |
|--------|---------------------------------------|------------------------|
| ST-001 | Remove `Cargo.lock` from `.gitignore` | Reproducible builds    |
| ST-002 | Add Makefile                          | Developer experience   |
| ST-003 | Add CI/CD configuration               | Quality automation     |
| ST-006 | Add Prerequisites to README.md        | Onboarding new devs    |
| AP-002 | Make owner address configurable       | Deployment flexibility |
| CS-001 | Fix CurrencyAmount mutable getters    | Encapsulation, safety  |

### Medium Priority

| ID     | Recommendation                   | Rationale           |
|--------|----------------------------------|---------------------|
| ST-004 | Add `codestyle.md`               | Company standards   |
| SC-002 | Add max lease duration limit     | Prevent state bloat |
| AP-001 | Add integration tests             | Cross-contract testing |
| AP-003 | Document upgrade strategy        | Operational clarity |

### Low Priority

| ID     | Recommendation                    | Rationale            |
|--------|-----------------------------------|----------------------|
| ST-005 | Document nightly toolchain choice | Maintenance clarity  |
| CS-002 | Add module-level documentation    | Code readability     |
| CS-003 | Extract gas limits to constants   | Code clarity         |
| BP-002 | Add `#[must_use]` attributes      | Compiler checks      |
| BP-004 | Document all events               | API documentation    |
| ST-007 | Consider updating to edition 2024 | Modern Rust features |

---

## Prioritized Action Plan

### Phase 0: Critical Security (Immediate)

* Add finalization check in `prolong_lease_agreement` (SC-001) — prevents prolonging finalized leases, potential double-spending of security deposits

### Phase 1: Standards and CI

* Remove `Cargo.lock` from `.gitignore`, commit `Cargo.lock` (ST-001)
* Create basic `Makefile` (ST-002)
* Add GitHub Actions workflow (ST-003)
* Add `codestyle.md` (ST-004)
* Add Prerequisites section to README.md (ST-006)

### Phase 2: Remaining Security Fixes

* Add maximum lease duration limit (SC-002)

### Phase 3: Code Quality

* Fix `CurrencyAmount` mutable getters pattern (CS-001)
* Make deployment owner address configurable (AP-002)
* Extract gas limits to named constants (CS-003)
* Add module-level documentation (CS-002)

### Phase 4: Architecture Refactoring

* Add integration tests for cross-contract interactions (AP-001)
* Document contract upgrade strategy (AP-003)
* Add contract versioning (AP-003)
* Add `#[must_use]` attributes (BP-002)
* Document all events (BP-004)
