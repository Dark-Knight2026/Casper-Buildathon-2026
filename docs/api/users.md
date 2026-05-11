# Users API

Endpoints under `/api/v1/users/me` for reading and managing the authenticated user's profile, email, avatar, role, and account.

## UserInfo schema

Returned by `/users/me` and embedded in `LoginResponse.user`:

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

## GET `/api/v1/users/me`

- **Response:** `UserInfo`
- **Errors:** 401 (no/invalid access cookie), 404 (user soft-deleted between JWT issue and call), 500
- **Auth:** Access cookie required

## PATCH `/api/v1/users/me`

- **Input:** `{ "first_name"?, "last_name"?, "phone"?, "bio"? }` (any subset; missing fields keep stored value). The avatar is owned by [`POST /api/v1/users/me/avatar`](#post-apiv1usersmeavatar) and is NOT accepted here - any client-supplied `avatar_url` is silently dropped by serde, so this endpoint cannot be used to update it.
- **Response:** updated `UserInfo`
- **Side effect:** writing a new `phone` distinct from the stored one resets `phone_verified` to `false`
- **Errors:** 400 (empty required fields, over-long values), 401, 404, 500
- **Auth:** Access cookie required

## POST `/api/v1/users/me/email`

- **Input:** `{ "new_email": "..." }`
- **Response (202):** confirmation email queued; DB row not touched until confirm step
- **Errors:** 400 (malformed email), 401, 409 (email already in use), 429 (>3 requests / rolling 24h), 500
- **Auth:** Access cookie required

## POST `/api/v1/users/me/email/confirm`

- **Input:** `{ "token": "<43 base64url-no-pad chars>" }`
- **Response:** updated `UserInfo` with `email = new_email` and `email_verified = true`; `verification_level` upgrades from `none` to `email` on first successful confirm
- **Errors:** 400 (malformed token shape), 401 (token missing/expired/wrong), 404, 409 (email taken in race), 500
- **Auth:** Access cookie required

## POST `/api/v1/users/me/avatar`

- **Input:** `multipart/form-data` with a single field `file` (PNG / JPEG / WebP, max 5 MB)
- **Response (200):** `{ "avatar_url": "..." }`. The full profile is intentionally NOT echoed - clients that need the joined shape re-fetch `GET /me`.
- **Behavior:**
  - **MIME whitelist + magic-byte sniff.** The field's `Content-Type` (with any RFC 2045 parameters stripped, e.g. `image/jpeg; charset=binary` is normalized to `image/jpeg`) must be `image/png`, `image/jpeg`, or `image/webp`, AND the leading bytes must match the format the header claims. A payload with a valid MIME header but mismatched bytes (e.g. `Content-Type: image/png` carrying JPEG bytes, or `RIFF` header without the trailing `WEBP` tag) is rejected with 415. Blocks MIME-spoofing where a client uploads an executable under an image MIME header.
  - **Storage layout:** `avatars/{user_id}.{ext}`. Re-uploading with a different extension first sweeps every other extension in `{png, jpg, jpeg, webp}` BEFORE writing the new key, so a format change (PNG -> JPG) does not leave the previous blob orphaned. Sweep failures are logged but do not block the new upload (orphan is a billing concern, not a correctness one).
  - **Per-user rate limit:** at most 10 uploads per rolling 1h window.
- **Note:** the current implementation returns a `data:image/svg+xml;base64,...` placeholder via `StubMediaStorage`; the production swap to `S3MediaStorage` lands in PR #2 (steps 9-10 of the user-profile plan). The endpoint contract above does NOT change between stub and S3 - the response shape is identical, only `avatar_url` becomes a CDN URL pointing at the bucket.
- **Errors:** 400 (missing/malformed `file` field), 401, 413 (over 5 MB - covered both by the multipart stream limit and the in-handler size check), 415 (disallowed MIME or header/byte mismatch), 429, 500
- **Auth:** Access cookie required

## PATCH `/api/v1/users/me/role`

- **Input:** `{ "role": "tenant" | "landlord" | "agent" }`
- **Response (200):** updated `UserInfo`. Both auth cookies are stamped expired (`Max-Age=0`) in the response so the browser drops them on receipt - clients MUST re-login to obtain a token reflecting the new role. The idempotent-noop branch (requested role equals current role) returns 200 WITHOUT clearing cookies, because no logout actually happened.
- **Behavior:** five gates run in strict order; reordering any of them surfaces as a different status code:
  1. **Whitelist validation** (400). `admin` / `property_manager` and any unknown string are rejected before any DB or Redis I/O. Reuses the same gate as `LoginRequest.role`.
  2. **Recent-auth check** (403, code `reauthentication_required`). The token's `iat` must be within the last 5 minutes. A stolen long-lived access cookie cannot be repurposed for a privilege flip once the window has elapsed.
  3. **Idempotent shortcut.** If `old_role == new_role`, the transaction commits and the handler returns 200 WITHOUT consulting the rate limiter or stamping cookies expired. Bidirectional flows (`tenant -> landlord -> tenant` after the rate-limit window) and accidental retries cost nothing.
  4. **Rate limit** (429, code `rate_limited`). One change per rolling 24h window. Only consulted when the role actually differs.
  5. **Active-leases pre-check** (409, code `active_leases_blocking`). A user bound to an active lease as `landlord_id` or `primary_tenant_id` cannot change role - the contractual counterparty would silently flip type. Runs inside the transaction (after `SELECT ... FOR UPDATE` on the user row), so a lease created concurrently after the lock cannot slip through.
- **Side effect:** on a successful change, in one DB transaction: `users.role` is rewritten, `users.jwt_invalidate_before = NOW()` is stamped (kills outstanding access tokens via the global cutoff - see [`feature/force_revoke.md`](../feature/force_revoke.md)), every active refresh-token row is revoked, and one `audit_logs` row records `old_role -> new_role` with `status = 'success'`. The Redis rate-limit bump runs AFTER `tx.commit()` succeeds.
- **Errors:** 400, 401, 403 (recent-auth), 404, 409, 429, 500
- **Auth:** Access cookie required

## DELETE `/api/v1/users/me`

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
- **Note on stale-cookie semantics:** subsequent calls under the soft-deleted user's stale access cookie return 401 `invalid_token`. `soft_delete_user` stamps `users.jwt_invalidate_before = NOW()`, the middleware's `fetch_jwt_invalidate_before` reads the cutoff regardless of `deleted_at`, and `claims.iat <= cutoff` rejects the JWT. The rejection is uniform across every `AuthUser`-protected endpoint (including `tax`, `analytics`, and other handlers that do not load the user profile). See [`feature/force_revoke.md`](../feature/force_revoke.md).
- **Errors:** 400 (missing/wrong confirm), 401, 403 (recent-auth), 404 (already soft-deleted), 409 (active leases), 500
- **Auth:** Access cookie required
