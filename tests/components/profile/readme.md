# Profile Component Tests

Unit tests for profile feature components in `src/components/profile/`.

| File | Responsibility |
|------|----------------|
| RoleSwitchDialog.test.tsx | Tests the role-switch dialog — success toast + reauth-gate-wrapped service call, 429 rate-limit copy (no raw token), 409 active-leases CTA navigation, inline reauth-gate error (no toast), disabled/in-flight state |
