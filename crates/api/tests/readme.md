# API Integration Tests

## Responsibility Table

| File                      | Responsibility                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| analytics.rs              | Tests analytics module: request deserialization, endpoint response structure                                    |
| audit_verify_email.rs     | Tests verify_email audit row: one row on genuine confirm, zero on idempotent re-confirm, full request context   |
| auth.rs                   | Tests authentication: nonce, login, E2E flow, cryptographic signature verification                              |
| auth_invalidate_before.rs | Tests jwt_invalidate_before middleware cutoff: NULL/past allow, future/deleted-user block                       |
| auth_middleware_cache.rs  | Tests AuthUser extensions cache: from_request_parts short-circuits DB lookup on a cached entry                  |
| auth_revoke_all.rs        | Tests POST /auth/sessions/revoke-all: keep_current default and panic-logout flows                               |
| auth_sessions.rs          | Tests GET /auth/sessions list and DELETE /auth/sessions/{id}: is_current flag, owner gate                       |
| common.rs                 | Shared test utilities: server setup, Redis/PostgreSQL containers, JWT helpers                                   |
| config.rs                 | Tests Config::from_env() validation: required vars, schemes, port, defaults                                     |
| email_provider.rs         | Tests Postmark error -> EmailError classification: construction errors are Permanent, never retried             |
| email_retry.rs            | Tests email retry-queue db layer: insert, claim, mark sent/failed, terminal-row cleanup over seeded rows        |
| email_verification.rs     | Tests POST /auth/verify/email/{send,resend,confirm}: token round-trip, rate limits, rotation, AlreadyVerified   |
| email_worker.rs           | Tests email retry-queue worker loop: process_retries ticks via mock mailer, graceful shutdown exit              |
| health.rs                 | Tests health check endpoint response structure                                                                  |
| ico.rs                    | Tests ICO endpoints: balance lookup, progress reporting, address validation                                     |
| models.rs                 | Unit tests for transaction models: TxType, HashType, ft_action_type_id                                          |
| server.rs                 | Tests server configuration: rate limiting (SC-005), CORS (SC-007)                                               |
| server_shutdown.rs        | Tests server::notify_workers shutdown fan-out: every subscriber gets the edge, empty path is not an error       |
| staking.rs                | Tests staking endpoints: info, portfolio, earnings, rewards history, address validation                         |
| storage_path_style.rs     | Tests S3MediaStorage constructor: path-style for MinIO, virtual-hosted for AWS (no network)                     |
| tax.rs                    | Tests tax module: request deserialization, endpoint response structure                                          |
| transactions.rs           | Tests transaction history: response structure, pagination, address validation, BIG token filtering              |
| users.rs                  | Tests GET/PATCH /users/me profile: shape, partial updates, email-change confirmation                            |
| users_avatar.rs           | Tests POST /users/me/avatar: MIME whitelist, magic-byte sniff, rate limit, oversize                             |
| users_avatar_s3.rs        | Tests POST /me/avatar against MinIO: PNG/WebP upload, anti-orphan re-upload, transport leak, delete idempotency |
| users_delete.rs           | Tests DELETE /users/me: confirmation, recent-auth, active-leases gates, side effects                            |
| users_role.rs             | Tests PATCH /users/me/role: whitelist, recent-auth, rate limit, lease pre-check, audit log                      |
| verification_gating.rs    | Tests VerifiedUser<V> extractor: per-level JWT claim gating via from_request_parts, legacy no-level variant     |
| vesting.rs                | Tests vesting endpoints: schedules pagination, token supply, release schedule, address validation               |

## MinIO port hazard

The dev compose (`docker-compose.yml` + `docker-compose.dev.yml`) publishes MinIO on host port **9000** (S3 API) and **9001** (console). The test compose (`docker-compose.test.yml`) publishes its own MinIO container on host port **9100**, container-internal still 9000. Decoupled by 100 to avoid clashes when `make env-up` and `make test` overlap; if you change either, keep the gap. Running tests against dev MinIO accidentally is silent: bytes land in the dev bucket, dev objects leak into test assertions, and `make env-down` then wipes data a developer expected to keep.
