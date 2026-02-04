# API Integration Tests

## Responsibility Table

| File         | Responsibility                                                                     |
|--------------|------------------------------------------------------------------------------------|
| analytics.rs | Tests analytics module: request deserialization, endpoint response structure        |
| auth.rs      | Tests authentication: nonce, login, E2E flow, cryptographic signature verification |
| common.rs    | Shared test utilities: server setup, Redis/PostgreSQL containers, JWT helpers      |
| config.rs    | Tests Config::from_env() validation: required vars, schemes, port, defaults       |
| health.rs    | Tests health check endpoint response structure                                     |
| server.rs    | Tests server configuration: rate limiting (SC-005), CORS (SC-007)                  |
| tax.rs       | Tests tax module: request deserialization, endpoint response structure              |
