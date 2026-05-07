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

All authenticated endpoints accept the access token via the `access_token`
cookie. The `Authorization: Bearer ...` header is no longer accepted.
Tokens are delivered via `Set-Cookie` only and never appear in JSON
response bodies. See `## 3. Security Requirements` for cookie attributes
and TTLs.

- **GET** `/api/v1/auth/nonce`
  - **Query:** `wallet_address` (Hex string)
  - **Response:** `{ "nonce": "...", "message": "Sign this..." }`
  - **Auth:** Public

- **POST** `/api/v1/auth/login`
  - **Input:** `{ "wallet_address": "...", "signature": "...", "role"?: "tenant"|"landlord"|"agent" }`
  - **Response (200):** `{ "user": UserInfo }` plus `Set-Cookie: access_token=...; refresh_token=...`
  - **Errors:** 400 (invalid wallet/signature/role), 401 (expired nonce or signature mismatch), 403 (account not active), 429 (per-wallet rate limit), 500
  - **Auth:** Public

- **POST** `/api/v1/auth/refresh`
  - **Input:** none (reads `refresh_token` cookie)
  - **Response (204):** empty body; `Set-Cookie` rotates both `access_token` and `refresh_token`
  - **Errors:** 401 (refresh cookie missing, expired, or revoked - including reuse-detection family revoke)
  - **Auth:** Refresh cookie required

- **POST** `/api/v1/auth/logout`
  - **Input:** none (reads both auth cookies)
  - **Response (204):** empty body; `Set-Cookie` clears both `access_token` and `refresh_token` (`Max-Age=0`)
  - **Behavior:** idempotent; blocklists the access JWT's `jti` until natural expiry, revokes the refresh-token family. Missing or undecodable cookies still produce 204.
  - **Auth:** Best-effort (no cookies still works)

#### Sessions

- **GET** `/api/v1/auth/sessions`
  - **Response (200):** `Vec<SessionResponse>` - one row per refresh-token where `revoked_at IS NULL AND expires_at > NOW()`. Each row carries `id`, `issued_at`, `expires_at`, and `is_current`.
  - **`is_current` semantics:** `true` when the row's stored `token_hash` byte-equals `sha256(request_refresh_cookie)`; `false` everywhere when no refresh cookie reaches the handler (different domain, manually-crafted call with only the access cookie, etc.). The hash is computed once per request, never logged, and not exposed in the response.
  - **Errors:** 401 (no/invalid access cookie), 500
  - **Auth:** Access cookie required (refresh cookie optional - only used to compute `is_current`)

- **DELETE** `/api/v1/auth/sessions/{id}`
  - **Path:** `id` - session UUID returned by `GET /sessions`
  - **Response (204):** empty body
  - **Behavior:** revokes ONLY the targeted refresh row. `users.jwt_invalidate_before` is intentionally NOT touched - killing one session must not log the entire user out, so other devices' access tokens keep working until their natural 15-minute expiry. The owner gate runs in the WHERE clause: a forged id from another user yields 404 (uniform with "id unknown", "already revoked", and "expired" so no enumeration oracle is exposed).
  - **Errors:** 401, 404 (unknown / already-revoked / expired / not owned), 500
  - **Auth:** Access cookie required

- **POST** `/api/v1/auth/sessions/revoke-all`
  - **Input:** `{ "keep_current"?: bool }` (default `true`; sending `{}` is the safe "log out other devices" path)
  - **Response (200):** `{ "revoked": <u64> }` - count of refresh rows transitioned from active to revoked by this call (already-revoked rows are not counted)
  - **Behavior:**
    - `keep_current = true` (default - "log out other devices"): preserves the row whose `token_hash` matches `sha256(request_refresh_cookie)` and revokes everything else. `users.jwt_invalidate_before` is NOT stamped, so the caller's access token survives. If the refresh cookie is missing, every row is revoked anyway (the user already opted into the destructive action), but the cutoff still stays untouched.
    - `keep_current = false` ("panic logout"): revokes every refresh row AND stamps `users.jwt_invalidate_before = NOW()`. The auth middleware then rejects every outstanding access token (including the caller's own) on its next use. Both auth cookies are cleared in the response so the browser drops them on receipt.
  - **Atomicity:** all side effects (refresh-token revocation, optional cutoff bump, audit-log INSERT) run in one DB transaction so an audit-log failure cannot leave the user with revoked sessions but no audit trail.
  - **Errors:** 400 (empty/malformed body), 401, 500
  - **Auth:** Access cookie required (no recent-auth gate - a legitimate user reacting to a "suspicious activity" alert must be able to nuke sessions without a re-login round-trip)

### Users

UserInfo shape returned by `/users/me` and embedded in `LoginResponse.user`:
```json
{
  "id": "uuid",
  "role": "tenant|landlord|agent|admin|unknown",
  "wallet_address": "01abc..." ,
  "status": "active|inactive|suspended|pending_verification",
  "email": "alice@example.com",
  "first_name": "Alice",
  "last_name": "Smith",
  "phone": "+12025550123",
  "avatar_url": "https://...",
  "bio": "...",
  "is_profile_complete": true,
  "active_leases_count": 3,
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-04-22T14:22:01Z"
}
```

- **GET** `/api/v1/users/me`
  - **Response:** `UserInfo`
  - **Errors:** 401 (no/invalid access cookie), 404 (user soft-deleted between JWT issue and call), 500
  - **Auth:** Access cookie required

- **PATCH** `/api/v1/users/me`
  - **Input:** `{ "first_name"?, "last_name"?, "phone"?, "bio"?, "avatar_url"? }` (any subset; missing fields keep stored value)
  - **Response:** updated `UserInfo`
  - **Side effect:** writing a new `phone` distinct from the stored one resets `phone_verified` to `false`
  - **Errors:** 400 (empty required fields, over-long values), 401, 404, 500
  - **Auth:** Access cookie required

- **POST** `/api/v1/users/me/email`
  - **Input:** `{ "new_email": "..." }`
  - **Response (202):** confirmation email queued; DB row not touched until confirm step
  - **Errors:** 400 (malformed email), 401, 409 (email already in use), 429 (>3 requests / rolling 24h), 500
  - **Auth:** Access cookie required

- **POST** `/api/v1/users/me/email/confirm`
  - **Input:** `{ "token": "<43 base64url-no-pad chars>" }`
  - **Response:** updated `UserInfo` with `email = new_email` and `email_verified = true`; `verification_level` upgrades from `none` to `email` on first successful confirm
  - **Errors:** 400 (malformed token shape), 401 (token missing/expired/wrong), 404, 409 (email taken in race), 500
  - **Auth:** Access cookie required

- **POST** `/api/v1/users/me/avatar`
  - **Input:** `multipart/form-data` with a single field `file` (PNG / JPEG / WebP, max 5 MB)
  - **Response (200):** `{ "avatar_url": "..." }`. The full profile is intentionally NOT echoed - clients that need the joined shape re-fetch `GET /me`.
  - **Behavior:**
    - **MIME whitelist + magic-byte sniff.** The field's `Content-Type` must be `image/png`, `image/jpeg`, or `image/webp`, AND the leading bytes must match the format the header claims. A payload with a valid MIME header but mismatched bytes (e.g. `Content-Type: image/png` carrying JPEG bytes, or `RIFF` header without the trailing `WEBP` tag) is rejected with 415. Blocks MIME-spoofing where a client uploads an executable under an image MIME header.
    - **Storage layout:** `avatars/{user_id}.{ext}`. Re-uploading with a different extension first sweeps every other extension in `{png, jpg, jpeg, webp}` BEFORE writing the new key, so a format change (PNG -> JPG) does not leave the previous blob orphaned. Sweep failures are logged but do not block the new upload (orphan is a billing concern, not a correctness one).
    - **Per-user rate limit:** at most 10 uploads per rolling 1h window.
  - **Note:** the current implementation returns a `data:image/svg+xml;base64,...` placeholder via `StubMediaStorage`; the production swap to `S3MediaStorage` lands in PR #2 (steps 9-10 of the user-profile plan). The endpoint contract above does NOT change between stub and S3 - the response shape is identical, only `avatar_url` becomes a CDN URL pointing at the bucket.
  - **Errors:** 400 (missing/malformed `file` field), 401, 413 (over 5 MB - covered both by the multipart stream limit and the in-handler size check), 415 (disallowed MIME or header/byte mismatch), 429, 500
  - **Auth:** Access cookie required

- **PATCH** `/api/v1/users/me/role`
  - **Input:** `{ "role": "tenant" | "landlord" | "agent" }`
  - **Response (200):** updated `UserInfo`. Both auth cookies are stamped expired (`Max-Age=0`) in the response so the browser drops them on receipt - clients MUST re-login to obtain a token reflecting the new role. The idempotent-noop branch (requested role equals current role) returns 200 WITHOUT clearing cookies, because no logout actually happened.
  - **Behavior:** five gates run in strict order; reordering any of them surfaces as a different status code:
    1. **Whitelist validation** (400). `admin` / `property_manager` and any unknown string are rejected before any DB or Redis I/O. Reuses the same gate as `LoginRequest.role`.
    2. **Recent-auth check** (403, code `reauthentication_required`). The token's `iat` must be within the last 5 minutes. A stolen long-lived access cookie cannot be repurposed for a privilege flip once the window has elapsed.
    3. **Idempotent shortcut.** If `old_role == new_role`, the transaction commits and the handler returns 200 WITHOUT consulting the rate limiter or stamping cookies expired. Bidirectional flows (`tenant -> landlord -> tenant` after the rate-limit window) and accidental retries cost nothing.
    4. **Rate limit** (429, code `rate_limited`). One change per rolling 24h window. Only consulted when the role actually differs.
    5. **Active-leases pre-check** (409, code `active_leases_blocking`). A user bound to an active lease as `landlord_id` or `primary_tenant_id` cannot change role - the contractual counterparty would silently flip type. Runs inside the transaction (after `SELECT ... FOR UPDATE` on the user row), so a lease created concurrently after the lock cannot slip through.
  - **Side effect:** on a successful change, in one DB transaction: `users.role` is rewritten, `users.jwt_invalidate_before = NOW()` is stamped (kills outstanding access tokens via the global cutoff - see `## 3. Security Requirements`), every active refresh-token row is revoked, and one `audit_logs` row records `old_role -> new_role` with `status = 'success'`. The Redis rate-limit bump runs AFTER `tx.commit()` succeeds.
  - **Errors:** 400, 401, 403 (recent-auth), 404, 409, 429, 500
  - **Auth:** Access cookie required

- **DELETE** `/api/v1/users/me`
  - **Input:** `{ "confirm": "delete-my-account" }` - magic constant matched verbatim. Trimming is NOT performed: `" delete-my-account "` returns 400 (almost certainly a UI bug worth surfacing).
  - **Response (204):** empty body; both auth cookies are stamped expired in the response.
  - **Behavior:** three gates run in strict order:
    1. **Confirmation string** (400). Missing field and wrong value yield the same 400 with the same wording (the field is `#[serde(default)]`, so a missing key deserializes to `""` and falls through to the equality check rather than producing the axum-default 422).
    2. **Recent-auth check** (403, code `reauthentication_required`). Same 5-minute `iat` window as `PATCH /me/role`. A stolen long-lived access cookie cannot be the only credential behind an account wipe.
    3. **Active-leases pre-check** (409, code `active_leases_blocking`). A user bound as `landlord_id` or `primary_tenant_id` on an active lease cannot self-delete - the contractual counterparty would be left pointing at a soft-deleted user with no clean way to renegotiate.
  - **Side effect:** soft-delete runs in one DB transaction:
    - `wallet_connections` rows for the user are deleted; the `trg_wallet_connections_sync_cache` AFTER trigger zeros out `users.wallet_address` automatically.
    - `users.deleted_at = NOW()`, `email = 'deleted-{uuid}@deleted.local'` (the placeholder satisfies the `users_email_unique` partial index, which excludes `deleted_at IS NOT NULL` rows so the original address is freed for reuse), and `jwt_invalidate_before = NOW()` are stamped together.
    - Every active refresh-token row is revoked.
    - One `audit_logs` row records `action = 'self_delete_user'`.
  - **Note on stale-cookie semantics:** subsequent calls under the soft-deleted user's stale access cookie return 404, not 401. By design: the middleware's `fetch_jwt_invalidate_before` filters on `deleted_at IS NULL` and reports "no cutoff" for soft-deleted users, so the JWT passes the middleware and is rejected one step later when the handler's `fetch_user_profile` (also `WHERE deleted_at IS NULL`) returns RowNotFound. Clients should treat 404 on `GET /me` after a self-delete the same way as 401 - the account is gone.
  - **Errors:** 400 (missing/wrong confirm), 401, 403 (recent-auth), 404 (already soft-deleted), 409 (active leases), 500
  - **Auth:** Access cookie required

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

> **`amount` semantics for `token_purchase` rows:** `amount` contains the
> payment cost in the purchase currency (CSPR or USDC), not the quantity of
> BIG tokens received. The BIG token amount is stored in `ico_purchases.amount`
> and can be found in the transaction `metadata` JSON.

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

### Vesting

- **GET** `/api/v1/vesting/schedules?account={accountHash}`
  - **Query:** `account` (64 hex chars, no prefix), `page` (default 1), `page_size` (default 25, max 100)
  - **Response:** `PaginatedResponse<VestingScheduleItem>`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** Vesting uses cliff + post-cliff linear formula. Before cliff end (`start + cliff_duration`), `unlockedAmount = 0`. After full vesting (`start + vesting_duration`), `unlockedAmount = total - claimed`. Between: post-cliff linear interpolation `unlockedAmount = total * ((now - cliff_end) / (vesting_duration - cliff_duration)) - claimed`, where `cliff_end = start + cliff_duration`. Linear growth begins at `cliff_end`, not at `start`.

```json
{
  "id": "0",
  "lockedAmount": 800.0,
  "purchaseTimestamp": 1700000000000,
  "unlockTimestamp": 1702592000000,
  "vestingEndTimestamp": 1793548800000,
  "unlockedAmount": 200.0
}
```

  - `vestingEndTimestamp` (epoch ms): end of the full vesting period, computed as `start_timestamp + vesting_duration`.

- **GET** `/api/v1/vesting/token-supply`
  - **Response:** `TokenSupplyResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** `totalSupply` is fixed at 5,000,000,000 BIG. `circulatingSupply` is the sum of all BIG balances in `token_holdings` excluding addresses registered as contracts in `contract_registry`.

```json
{
  "totalSupply": 5000000000.0,
  "circulatingSupply": 1234567.89
}
```

- **GET** `/api/v1/vesting/release-schedule`
  - **Response:** `ReleaseScheduleResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** Aggregates all vesting schedules into a monthly timeline. Each point shows cumulative tokens released across all schedules at that month offset from the earliest schedule start.

```json
{
  "data": [
    { "month": "0", "released": 0.0 },
    { "month": "6", "released": 500.0 },
    { "month": "12", "released": 1000.0 }
  ]
}
```

### Staking

- **GET** `/api/v1/staking/{accountHash}`
  - **Path:** `accountHash` - 64 hex chars, no prefix
  - **Response:** `StakingInfoResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** APY = `(rewards_deposited_last_30_days * 365 / 30) / total_staked * 100`. Returns 0 if `total_staked` is zero. `pendingRewards` is computed off-chain: `pending_rewards + (staked * (global_rpt - user_rpt)) / 1e18`. `stakedTokens` is the actual staking position balance - it is `0` when the user has no active stake. `vestingLockedTokens` is reported as a separate field (sum of `total_amount - claimed_amount` across all vesting schedules for the account) so clients can display vesting and staking balances independently.

```json
{
  "stakedTokens": 100000.0,
  "vestingLockedTokens": 25000.0,
  "currentApy": 12.5,
  "totalRewardsEarned": 5000.0,
  "pendingRewards": 1200.0
}
```

- **GET** `/api/v1/staking/{accountHash}/portfolio`
  - **Path:** `accountHash` - 64 hex chars, no prefix
  - **Response:** `PortfolioResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** `totalBig = bigInWallet + bigStaked + rewardsEarned`. USD value estimated from latest ICO schedule price (6 decimals). `bigStaked` is the actual staking position balance (`0` when no active stake). `vestingLockedTokens` is reported separately and is NOT included in `totalBig` - it represents tokens that are not yet released by vesting.

```json
{
  "bigInWallet": 50000.0,
  "bigStaked": 100000.0,
  "vestingLockedTokens": 25000.0,
  "rewardsEarned": 5000.0,
  "totalBig": 155000.0,
  "estimatedUsdValue": 77500.0,
  "change24hPercent": 0.0
}
```

- **GET** `/api/v1/staking/{accountHash}/earnings?period={period}`
  - **Path:** `accountHash` - 64 hex chars, no prefix
  - **Query:** `period` - one of `1m`, `3m`, `6m` (default), `1y`, `all`. Invalid values return 400.
  - **Response:** `EarningsResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** Groups `reward_claim` events by month within the period window.

```json
{
  "data": [
    { "month": "2026-01", "earnings": 1200.0 },
    { "month": "2026-02", "earnings": 800.0 }
  ]
}
```

- **GET** `/api/v1/staking/{accountHash}/rewards-history?period={days}`
  - **Path:** `accountHash` - 64 hex chars, no prefix
  - **Query:** `period` - number of days to look back (default 90, clamped 1-365)
  - **Response:** `RewardsHistoryResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** Daily cumulative `reward_claim` events. `txFees` is always 0 (contract does not distinguish fee component).

```json
{
  "data": [
    { "day": 1, "stakingPool": 500.0, "txFees": 0.0 },
    { "day": 2, "stakingPool": 750.0, "txFees": 0.0 }
  ]
}
```

- **GET** `/api/v1/staking/{accountHash}/unbonding`
  - **Path:** `accountHash` - 64 hex chars, no prefix
  - **Response:** `UnbondingResponse`
  - **Auth:** Public
  - **Rate limit:** 5 req/s, burst 30
  - **Business rules:** Returns the current unbonding state and a chronological history of unstake/withdraw events. `isWithdrawable` is `true` when `unbondingEndsAt > 0 && unbondingEndsAt <= now`. `timeRemainingMs` is the milliseconds until withdraw is possible (0 if already withdrawable or no active unbonding).

```json
{
  "unbondingAmount": 5000.0,
  "unbondingEndsAt": 1719849600000,
  "isWithdrawable": false,
  "timeRemainingMs": 604800000,
  "history": [
    {
      "eventType": "unstake",
      "amount": 5000.0,
      "timestamp": "2026-03-20T12:00:00Z",
      "transactionHash": "abc123..."
    }
  ]
}
```

## 3. Security Requirements
- **Authentication:** Cookie-based JWT delivery. Login uses Casper Wallet signature challenge-response (Ed25519 / Secp256k1) against a one-time nonce; on success the server emits two `Set-Cookie` headers and the JSON body carries only `UserInfo`. The `Authorization: Bearer ...` header is not accepted.
  - `access_token` cookie: short-lived JWT (HS256, signed with `JWT_SECRET`). `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` in any HTTPS deployment (configurable via `cookie_secure`). **TTL: 15 min.**
  - `refresh_token` cookie: opaque 32-byte secret (base64url-no-pad, SHA-256 hash persisted in DB). `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` per env. **TTL: 14 days (sliding).** Rotated on every `/auth/refresh`; reuse of a revoked token revokes the entire family (reuse-detection).
  - Logout blocklists the access JWT's `jti` in Redis until natural expiry and revokes the refresh-token family.
  - **Force-revoke (`users.jwt_invalidate_before`):** a per-user cutoff timestamp consulted by the auth middleware on every protected request. An access JWT is rejected when `claims.iat <= jwt_invalidate_before`. The cutoff is stamped to `NOW()` by:
    - `POST /api/v1/auth/sessions/revoke-all` with `keep_current = false` (panic logout).
    - `PATCH /api/v1/users/me/role` (privilege change must invalidate every old token).
    - `DELETE /api/v1/users/me` (account deletion - paired with `deleted_at` and the email placeholder).

    DB column resolution is microseconds; JWT `iat` is integer seconds, so a token issued in the same wall-clock second as the cutoff is also rejected (`iat <= cutoff`, not `<`). The middleware's lookup filters on `deleted_at IS NULL`: for a soft-deleted user the SELECT returns "no cutoff" and the rejection is delegated to the handler's profile load, which yields 404. This is intentional (clients treat post-delete 404 the same way as 401), but operators inspecting access logs should know not to expect 401 for the deleted-user case.
  - Sign message format: `"Sign this message to login to LeaseFi. Nonce: <nonce>"`. Nonce TTL: 5 min (Redis), one-time use via `GETDEL`.
  - Per-wallet rate limit on failed logins blunts nonce-DoS and signature brute-force probes.
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

The API rate limiter uses the default `PeerIpKeyExtractor` which keys on
the TCP peer address. Behind a reverse proxy all requests share the proxy's
peer IP, collapsing all clients into a single rate-limit bucket. If
per-client limiting is needed behind a proxy, switch to
`SmartIpKeyExtractor` and ensure the proxy overwrites `X-Forwarded-For`
with the real client IP.

## 5. Performance Goals

- Docker container size < 150MB.
- SQLx compile-time verification enabled.