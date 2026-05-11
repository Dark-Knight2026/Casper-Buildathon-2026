# Tenant page tests

Smoke tests for the top-level tenant routes. Component- and hook-level
coverage lives under `tests/components/tenant/` and `tests/data/`; the
suites here only verify that the page shell mounts cleanly with its real
hook dependencies in place.

| File | Responsibility |
|------|----------------|
| TenantScore.test.tsx | Tests the /tenant/score page — heading mounts and the methodology card renders, against the pinned "excellent" scenario seed |
| TenantRecommended.test.tsx | Tests the /tenant/recommended page — heading mounts for the demo tenant (happy-path branch where an active lease exists) |
