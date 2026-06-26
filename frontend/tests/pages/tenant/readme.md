# Tenant page tests

Tests for top-level tenant routes in `src/pages/tenant/`. Component- and
hook-level coverage lives under `tests/components/tenant/`, `tests/hooks/`,
and `tests/data/`; the smoke suites here only verify that the page shell
mounts cleanly with its real hook dependencies in place.

| File | Responsibility |
|------|----------------|
| TenantProfile.test.tsx | Avatar MIME + 5 MB validation, optimistic blob preview + revoke, ApiError → user copy mapping (413 / 415 / 429), Save disabled when firstName/lastName empty, save payload omits blank phone, broken avatar → initials fallback |
| TenantScore.test.tsx | Tests the /tenant/score page — heading mounts and the methodology card renders, against the pinned "excellent" scenario seed |
| TenantRecommended.test.tsx | Tests the /tenant/recommended page — heading mounts for the demo tenant (happy-path branch where an active lease exists) |
