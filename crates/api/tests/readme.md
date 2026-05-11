# API Integration Tests

## Responsibility Table

| File                      | Responsibility                                                                                      |
|---------------------------|-----------------------------------------------------------------------------------------------------|
| analytics.rs              | Tests analytics module: request deserialization, endpoint response structure                        |
| auth.rs                   | Tests authentication: nonce, login, E2E flow, cryptographic signature verification                  |
| auth_invalidate_before.rs | Tests jwt_invalidate_before middleware cutoff: NULL/past allow, future/deleted-user block           |
| auth_middleware_cache.rs  | Tests AuthUser extensions cache: from_request_parts short-circuits DB lookup on a cached entry      |
| auth_revoke_all.rs        | Tests POST /auth/sessions/revoke-all: keep_current default and panic-logout flows                   |
| auth_sessions.rs          | Tests GET /auth/sessions list and DELETE /auth/sessions/{id}: is_current flag, owner gate           |
| common.rs                 | Shared test utilities: server setup, Redis/PostgreSQL containers, JWT helpers                       |
| config.rs                 | Tests Config::from_env() validation: required vars, schemes, port, defaults                         |
| health.rs                 | Tests health check endpoint response structure                                                      |
| ico.rs                    | Tests ICO endpoints: balance lookup, progress reporting, address validation                         |
| models.rs                 | Unit tests for transaction models: TxType, HashType, ft_action_type_id                              |
| server.rs                 | Tests server configuration: rate limiting (SC-005), CORS (SC-007)                                   |
| tax.rs                    | Tests tax module: request deserialization, endpoint response structure                              |
| transactions.rs           | Tests transaction history: response structure, pagination, address validation, BIG token filtering  |
| users.rs                  | Tests GET/PATCH /users/me profile: shape, partial updates, email-change confirmation                |
| users_avatar.rs           | Tests POST /users/me/avatar: MIME whitelist, magic-byte sniff, rate limit, oversize                 |
| users_delete.rs           | Tests DELETE /users/me: confirmation, recent-auth, active-leases gates, side effects                |
| users_role.rs             | Tests PATCH /users/me/role: whitelist, recent-auth, rate limit, lease pre-check, audit log          |
