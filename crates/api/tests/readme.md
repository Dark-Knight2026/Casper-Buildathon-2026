# API Integration Tests

## Responsibility Table

| File | Responsibility |
|------|---------------|
| auth.rs | Tests authentication endpoints: nonce generation, login validation, JWT protection |
| common.rs | Shared test utilities: server setup, Redis/PostgreSQL containers, JWT helpers |
| crypto.rs | Tests cryptographic signature verification (ed25519/Casper) |
| health.rs | Tests health check endpoint response structure |
| models.rs | Tests request model serialization and deserialization |
| security.rs | Tests security features: rate limiting (SC-005), CORS configuration (SC-007) |
