# Auth Sessions API

Endpoints for listing the authenticated user's active refresh-token sessions and revoking them individually or in bulk. The `access_token` cookie is required by every endpoint here; the `refresh_token` cookie is optional and only consulted to compute `is_current` and to preserve the caller's row in `revoke-all { keep_current = true }`.

## GET `/api/v1/auth/sessions`

- **Response (200):** `Vec<SessionResponse>` - one row per refresh-token where `revoked_at IS NULL AND expires_at > NOW()`. Each row carries `id`, `issued_at`, `expires_at`, and `is_current`.
- **`is_current` semantics:** `true` when the row's stored `token_hash` byte-equals `sha256(request_refresh_cookie)`; `false` everywhere when no refresh cookie reaches the handler (different domain, manually-crafted call with only the access cookie, etc.). The hash is computed once per request, never logged, and not exposed in the response.
- **Errors:** 401 (no/invalid access cookie), 500
- **Auth:** Access cookie required (refresh cookie optional - only used to compute `is_current`)

## DELETE `/api/v1/auth/sessions/{id}`

- **Path:** `id` - session UUID returned by `GET /sessions`
- **Response (204):** empty body
- **Behavior:** revokes ONLY the targeted refresh row. `users.jwt_invalidate_before` is intentionally NOT touched - killing one session must not log the entire user out, so other devices' access tokens keep working until their natural 15-minute expiry. The owner gate runs in the WHERE clause: a forged id from another user yields 404 (uniform with "id unknown", "already revoked", and "expired" so no enumeration oracle is exposed).
- **Errors:** 401, 404 (unknown / already-revoked / expired / not owned), 500
- **Auth:** Access cookie required

## POST `/api/v1/auth/sessions/revoke-all`

- **Input:** `{ "keep_current"?: bool }` (default `true`; sending `{}` is the safe "log out other devices" path)
- **Response (200):** `{ "revoked": <u64> }` - count of refresh rows transitioned from active to revoked by this call (already-revoked rows are not counted)
- **Behavior:**
  - `keep_current = true` (default - "log out other devices"): preserves the row whose `token_hash` matches `sha256(request_refresh_cookie)` and revokes everything else. `users.jwt_invalidate_before` is NOT stamped, so the caller's access token survives. If the refresh cookie is missing, every row is revoked anyway (the user already opted into the destructive action), but the cutoff still stays untouched.
  - `keep_current = false` ("panic logout"): revokes every refresh row AND stamps `users.jwt_invalidate_before = NOW()`. The auth middleware then rejects every outstanding access token (including the caller's own) on its next use. Both auth cookies are cleared in the response so the browser drops them on receipt. See [`feature/force_revoke.md`](../feature/force_revoke.md) for the cutoff semantics.
- **Atomicity:** all side effects (refresh-token revocation, optional cutoff bump, audit-log INSERT) run in one DB transaction so an audit-log failure cannot leave the user with revoked sessions but no audit trail.
- **Errors:** 400 (empty/malformed body), 401, 500
- **Auth:** Access cookie required (no recent-auth gate - a legitimate user reacting to a "suspicious activity" alert must be able to nuke sessions without a re-login round-trip)
