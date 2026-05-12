# Tenant page tests

Tests for top-level tenant routes in `src/pages/tenant/`.

| File | Responsibility |
|------|----------------|
| TenantProfile.test.tsx | Avatar MIME + 5 MB validation, optimistic blob preview + revoke, ApiError → user copy mapping (413 / 415 / 429), Save disabled when firstName/lastName empty, save payload omits blank phone, broken avatar → initials fallback |
