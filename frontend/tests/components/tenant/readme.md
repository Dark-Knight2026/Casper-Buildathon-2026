# Tenant Component Tests

Unit tests for tenant-facing feature components in `src/components/tenant/`.

| File | Responsibility |
|------|----------------|
| RecommendedProperties.test.tsx | Tests recommendation list — window gating by lease end, implicit preferences from current home, explicit preferences override, match-category badges |
| TenantPreferencesDialog.test.tsx | Tests preferences modal — form state, validation, save/cancel callbacks, toast feedback |
| TenantScoreCard.test.tsx | Tests tenant score card — scored vs unscored states, band copy, compact and full variants |
