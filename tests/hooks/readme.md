# tests/hooks

| File | Responsibility |
|------|----------------|
| useFinancialDashboard.test.ts | Test financial dashboard data aggregation hook |
| useICOSchedules.test.ts | Test ICO schedules and phase management hook |
| useICOState.test.ts | Test ICO state machine and countdown logic |
| useICOWallet.test.ts | Test wallet connection and event handlers |
| useMaintenanceRealtime.test.tsx | Test real-time maintenance status and websocket handling |
| usePurchaseFlow.test.ts | Test complete token purchase orchestration |
| usePurchaseToken.test.ts | Test purchase validation and transaction creation |
| useWalletBalances.test.ts | Test multi-currency balance fetching and caching |
| useCSPRPrice.test.ts | Test CSPR price fetching, stale-threshold logic, and polling interval — uses `vi.useFakeTimers()` |
| useContractDeploys.test.ts | Test BIG token FT-action fetching and pagination from CSPR Cloud |
| useUserTokenActions.test.ts | Test BigInt token amount math, non-integer input handling, disabled state for empty publicKey, and API error surfacing |
| useTenantScore.test.ts | Tests `useTenantScore` — scenario switching (excellent/average/unscored), scored/unscored field shape, memoization stability |
| useTenantPreferences.test.ts | Tests `useTenantPreferences` — storage lifecycle, `tenantId` switching, `updatePreferences` round-trip |
| useRecommendations.test.ts | Tests `useRecommendations` — 180-day window gate, `limit` slicing, memoization under stable inputs |
| auth/useSensitiveAction.test.ts | Tests `useSensitiveAction` — post-reauth cleanup (walletSignOut, `csprclick:*` localStorage strip, `/auth/login` redirect), failure path, forwarded state/reset |

The `auth/` subdirectory documents its own test files in its own `readme.md`.
