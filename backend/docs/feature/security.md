# Security Requirements

## Authentication

Cookie-based JWT delivery. Login uses Casper Wallet signature challenge-response (Ed25519 / Secp256k1) against a one-time nonce; on success the server emits two `Set-Cookie` headers and the JSON body carries only `UserInfo`. The `Authorization: Bearer ...` header is not accepted.

- `access_token` cookie: short-lived JWT (HS256, signed with `JWT_SECRET`). `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` in any HTTPS deployment (configurable via `cookie_secure`). **TTL: 15 min.**
- `refresh_token` cookie: opaque 32-byte secret (base64url-no-pad, SHA-256 hash persisted in DB). `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` per env. **TTL: 14 days (sliding).** Rotated on every `/auth/refresh`; reuse of a revoked token revokes the entire family (reuse-detection).
- Logout blocklists the access JWT's `jti` in Redis until natural expiry and revokes the refresh-token family.
- **Force-revoke** via `users.jwt_invalidate_before`: see [`force_revoke.md`](force_revoke.md) for triggers, comparison semantics, and deleted-user handling.
- Sign message format: `"Sign this message to login to LeaseFi. Nonce: <nonce>"`. Nonce TTL: 5 min (Redis), one-time use via `GETDEL`.
- Per-wallet rate limit on failed logins blunts nonce-DoS and signature brute-force probes.

## Database

- No direct SQL injection (checked via SQLx).
