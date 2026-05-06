# Page Tests

Unit tests for top-level pages in `src/pages/`.

| File | Responsibility |
|------|----------------|
| PropertyLanding.test.tsx | Tests the landing page — hero heading, stat cards, FeaturedProperties + LandingHeader integration, "Explore Properties" / "Start Your Search" navigation, demo / consultation toasts |
| HelpHub.test.tsx | Tests the /help page — heading, FAQ accordion, QuickActionCard grid, support contact block |
| auth/Login.test.tsx | Tests the /auth/login page — disconnected ProviderList, connected Sign in flow, "Use a different wallet" disconnect+reload, error surface, Sign up link |
| auth/Register.test.tsx | Tests the /auth/register page — RoleSelector default + Landlord switch, role propagation to login(), disconnected ProviderList, "Use a different wallet" disconnect+reload |
| auth/RoleSelector.test.tsx | Tests the role radio selector — controlled value, onChange, disabled state, post-connect lock hint |

The `ico/` subdirectory documents its own test files in its own `readme.md`.
