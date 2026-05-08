# Force-Revoke Cutoff

`users.jwt_invalidate_before` is a per-user cutoff timestamp consulted by the auth middleware on every protected request. An access JWT is rejected when `claims.iat <= jwt_invalidate_before`, even though the token's `exp` is still in the future and its `jti` is not on the logout blocklist.

## Triggers

The cutoff is stamped to `NOW()` by:

- `POST /api/v1/auth/sessions/revoke-all` with `keep_current = false` (panic logout). See [`api/auth_sessions.md`](../api/auth_sessions.md).
- `PATCH /api/v1/users/me/role` (privilege change must invalidate every old token). See [`api/users.md`](../api/users.md).
- `DELETE /api/v1/users/me` (account deletion - paired with `deleted_at` and the email placeholder). See [`api/users.md`](../api/users.md).

## Comparison semantics

DB column resolution is microseconds; JWT `iat` is integer seconds, so a token issued in the same wall-clock second as the cutoff is also rejected (`iat <= cutoff`, not `<`).

## Deleted-user handling

The middleware's lookup does NOT filter on `deleted_at`: a soft-deleted user's row carries a non-NULL cutoff (stamped by `soft_delete_user`) that must reach the middleware. Filtering deleted rows would mask the cutoff and let the JWT through on `AuthUser` endpoints that never load the profile (`tax`, `analytics`); rejection by the middleware is uniform across all protected endpoints.

## Implementation pointers

- Query: `auth/db.rs::fetch_jwt_invalidate_before`
- Middleware enforcement: `auth/middleware.rs::AuthUser::from_request_parts`
- Per-request DB cost discussion: module doc-comment of `auth/middleware.rs` (covers caching trade-offs)
