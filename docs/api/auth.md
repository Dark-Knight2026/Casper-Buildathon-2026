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
