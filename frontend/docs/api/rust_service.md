# LeaseFi Backend (Rust) API — pointer

> **This file is an index, not the spec.** The earlier version listed only 3
> endpoints (health/tax/analytics) and described a Supabase-JWT auth model that
> no longer exists. To avoid drifting again, the full contract is not duplicated
> here — use the authoritative sources below.

## Authoritative sources

1. **Backend OpenAPI / Swagger** — generated from the Rust code, always current.
   - Spec JSON: `http://0.0.0.0:8080/api-docs/openapi.json`
   - Swagger UI: `http://0.0.0.0:8080/swagger-ui/`
   - Repo: `2025_anthony_leasefi_backend` (run with `make run`).
2. **Frontend API contracts** — [`spec.md`](../../spec.md) §4 (API & Data Layer)
   documents the endpoints the frontend actually consumes, with request/response
   shapes and error codes, in human-readable form.

## Auth model (changed — read this)

All authenticated endpoints use **cookie auth**: the HttpOnly `access_token`
cookie set at `POST /api/v1/auth/login`, refreshed at `POST /api/v1/auth/refresh`.
There is **no** `Authorization: Bearer <Supabase JWT>` header — that was the
pre-backend Supabase model and is gone.

## Frontend clients

| Client | File | Base URL env | Auth | Used for |
| ------ | ---- | ------------ | ---- | -------- |
| `backendClient` | [`src/lib/api-client.ts`](../../src/lib/api-client.ts) | `VITE_BACKEND_URL` | HttpOnly cookies (`credentials: 'include'`) | **Current** — auth, profile, email, sessions, ICO, staking, vesting, etc. |
| `rustApi` | [`src/lib/rust-api.ts`](../../src/lib/rust-api.ts) | `VITE_RUST_SERVICE_URL` (default `http://localhost:8080/api/v1`) | `Authorization: Bearer` (legacy) | **Legacy** — only `tax/calculate-liability` and `analytics/property-performance`, via `TaxDashboard.tsx` / `AdvancedAnalyticsDashboard.tsx` |

New work should go through `backendClient`. The `rustApi` Bearer path is legacy
and should be migrated onto `backendClient` (cookie auth) when those two
dashboards are rewired.

## Endpoint groups (see Swagger for the live list)

`/api/v1` prefix. Tags as of the current spec: **Auth** (login/logout/refresh/
nonce/sessions, email verification), **Users** (`/users/me`, email change, avatar,
role), **ICO**, **Staking**, **Vesting**, **Transactions**, **Tax**, **Analytics**,
plus `/health`. Email-specific endpoints are detailed in [`spec.md`](../../spec.md)
§4 (both the `/users/me/email*` change pair and the `/auth/verify/email/*` trio).
