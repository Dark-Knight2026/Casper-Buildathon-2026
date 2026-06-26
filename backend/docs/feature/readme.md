# Feature Specs

Cross-cutting feature documentation that applies across multiple endpoints or modules.

## Responsibility Table

| File                  | Responsibility                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| email_verification.md | Email-verification flow: levels, token model, re-issue, rate limit, retry worker, Postmark checklist |
| error_handling.md     | ApiError enum, conversions, usage pattern, reverse-proxy requirement                                 |
| force_revoke.md       | `users.jwt_invalidate_before` per-user cutoff feature spec                                           |
| media_storage.md      | S3-compatible media backend: env vars, AWS/R2/MinIO matrix, ACL, addressing                          |
| performance.md        | Performance goals (container size, SQLx compile-time verification)                                   |
| security.md           | Authentication cookie attributes, TTLs, force-revoke pointer                                         |
