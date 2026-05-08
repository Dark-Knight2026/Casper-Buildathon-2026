# Project Specification: LeaseFi Backend

## 1. Overview

Backend service for processing high-load real estate operations,
including tax calculations and property performance analytics.

## 2. Documentation Index

The API contract, feature specs, and architectural sections that used
to live in this file have been migrated to the `docs/` doc-entity tree.
This file now serves only as the project-level index.

### API endpoints

See [`docs/api/readme.md`](docs/api/readme.md) for the per-resource
responsibility table. Direct entry points:

- [`docs/api/analytics.md`](docs/api/analytics.md)
- [`docs/api/auth.md`](docs/api/auth.md)
- [`docs/api/auth_sessions.md`](docs/api/auth_sessions.md)
- [`docs/api/health.md`](docs/api/health.md)
- [`docs/api/ico.md`](docs/api/ico.md)
- [`docs/api/staking.md`](docs/api/staking.md)
- [`docs/api/tax.md`](docs/api/tax.md)
- [`docs/api/transactions.md`](docs/api/transactions.md)
- [`docs/api/users.md`](docs/api/users.md)
- [`docs/api/vesting.md`](docs/api/vesting.md)

### Feature specs

See [`docs/feature/readme.md`](docs/feature/readme.md). Direct entry
points:

- [`docs/feature/error_handling.md`](docs/feature/error_handling.md) - ApiError enum, conversions, reverse-proxy requirement
- [`docs/feature/force_revoke.md`](docs/feature/force_revoke.md) - per-user JWT cutoff (`users.jwt_invalidate_before`)
- [`docs/feature/performance.md`](docs/feature/performance.md) - performance goals
- [`docs/feature/security.md`](docs/feature/security.md) - cookie auth, TTLs, sign message, rate-limit posture
