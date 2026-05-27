# Auth Page Tests

Unit tests for the `/auth/*` routes in `src/pages/auth/`.

| File | Responsibility |
|------|----------------|
| Login.test.tsx | Tests the /auth/login page — disconnected state (ProviderList, no Sign-in button, provider click → handleConnectProvider), connected state (truncated public key, Sign in click → login(), disabled in-flight Sign in, "Use a different account" disconnect), error surface alert, Sign up link |
| Register.test.tsx | Tests the /auth/register page — RoleSelector default + Landlord switch, role propagation to login() on connect, `?role=` deep-link pre-selection (landlord / tenant / unsupported fallback), disconnected ProviderList, "Use a different account" disconnect+reload, post-connect lock hint |
| RoleSelector.test.tsx | Tests the role radio selector — controlled value, onChange for tenant/landlord, disabled state, "set during first connection" hint only when isConnected |
