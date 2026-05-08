# Feature Specs

Cross-cutting feature documentation that applies across multiple endpoints or modules.

## Responsibility Table

| File              | Responsibility                                                       |
|-------------------|----------------------------------------------------------------------|
| error_handling.md | ApiError enum, conversions, usage pattern, reverse-proxy requirement |
| force_revoke.md   | `users.jwt_invalidate_before` per-user cutoff feature spec           |
| performance.md    | Performance goals (container size, SQLx compile-time verification)   |
| security.md       | Authentication cookie attributes, TTLs, force-revoke pointer         |
