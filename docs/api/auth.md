# Authentication API

All authenticated endpoints accept the access token via the `access_token` cookie. The `Authorization: Bearer ...` header is no longer accepted. Tokens are delivered via `Set-Cookie` only and never appear in JSON response bodies.
See [`feature/security.md`](../feature/security.md) for cookie attributes and TTLs and [`feature/force_revoke.md`](../feature/force_revoke.md) for the per-user cutoff that interacts with the access cookie.

Session-management endpoints live in [`auth_sessions.md`](auth_sessions.md).

## GET `/api/v1/auth/nonce`

- **Query:** `wallet_address` (Hex string)
- **Response:** `{ "nonce": "...", "message": "Sign this..." }`
- **Auth:** Public

## POST `/api/v1/auth/login`

- **Input:** `{ "wallet_address": "...", "signature": "...", "role"?: "tenant"|"landlord"|"agent" }`
- **Response (200):** `{ "user": UserInfo }` plus `Set-Cookie: access_token=...; refresh_token=...`. See [`users.md`](users.md) for the `UserInfo` shape.
- **Errors:** 400 (invalid wallet/signature/role), 401 (expired nonce or signature mismatch), 403 (account not active), 429 (per-wallet rate limit), 500
- **Auth:** Public

## POST `/api/v1/auth/refresh`

- **Input:** none (reads `refresh_token` cookie)
- **Response (204):** empty body; `Set-Cookie` rotates both `access_token` and `refresh_token`
- **Errors:** 401 (refresh cookie missing, expired, or revoked - including reuse-detection family revoke)
- **Auth:** Refresh cookie required

## POST `/api/v1/auth/logout`

- **Input:** none (reads both auth cookies)
- **Response (204):** empty body; `Set-Cookie` clears both `access_token` and `refresh_token` (`Max-Age=0`)
- **Behavior:** idempotent; blocklists the access JWT's `jti` until natural expiry, revokes the refresh-token family. Missing or undecodable cookies still produce 204.
- **Auth:** Best-effort (no cookies still works)

## POST `/api/v1/auth/verify/email/send`

- **Input:** none (email is read from the user record, never the body)
- **Response (200):** `{ "status": "sent" }`. In dev (no Postmark token) the body also carries `dev_verification_token` - see the escape-hatch note in [`../feature/email_verification.md`](../feature/email_verification.md).
- **Errors:** 400 (`email_not_set`), 401 (unauthorized), 429 (`rate_limited` - 1/min, 5/hour shared with resend), 500 (`email_send_failed`)
- **Auth:** Access cookie required

## POST `/api/v1/auth/verify/email/resend`

- Identical to `send` - same logic, same rate-limit slot. Separate route only so the UI can present "resend" distinctly.

## POST `/api/v1/auth/verify/email/confirm`

- **Input:** `{ "token": "<43-char base64url token from the email link>" }`
- **Response (200):** `{ UserInfo }`. On a genuine transition, `Set-Cookie` rotates both `access_token` (carrying the bumped `verification_level`) and `refresh_token`. The client must adopt the returned `UserInfo` (or re-fetch `/users/me`).
- **Errors:** 400 (`bad_token_format`), 401/404 (`invalid_or_expired_token`), 500
- **Auth:** Access cookie required

The full flow (levels, token model, retry queue, rate limiting) is specified in [`../feature/email_verification.md`](../feature/email_verification.md).

## Deployment note: `Authorization` header removed from CORS

`server.rs` declares `.allow_headers([CONTENT_TYPE])` - `Authorization` is intentionally absent from the CORS-preflight whitelist. Browsers will strip any cross-origin request that still carries `Authorization: Bearer ...` during preflight, which surfaces as an opaque 401/blocked-by-CORS on the client side and is hard to attribute to the CORS layer from logs alone.

### Who is affected

- Cross-origin browser clients that have not yet migrated from `Authorization: Bearer ...` to the `access_token` cookie. The cookie transport has been the supported path since the user-profile rollout; clients pinned to older SDK versions or hand-rolled fetch wrappers may still send Bearer.
- Server-to-server callers and same-origin browser clients are NOT affected by this change: CORS preflight does not apply to them. The middleware itself, however, rejects Bearer everywhere (see `services/auth/middleware.rs`).

### Migration checklist

1. Audit deployed clients for `Authorization: Bearer` usage against the `/api/v1/...` surface. Any same-origin client that already survived the cookie-only middleware cutover is migrated by definition.
2. Confirm each cross-origin client sends `credentials: 'include'` on `fetch` (or `XMLHttpRequest.withCredentials = true`) so the `access_token` cookie travels with the request - without this the cookie is dropped silently by the browser regardless of CORS.
3. Set a cutover date with the deployment owner. If any deployment is still in transit, the owner can temporarily widen the CORS list to `[CONTENT_TYPE, AUTHORIZATION]` for a stated transition window. The middleware still rejects Bearer end-to-end, but the broader CORS whitelist suppresses the preflight-time block so legacy clients see a clean 401 (their actual unauth state) instead of a CORS error.
