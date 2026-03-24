# ICO State Component Tests

Unit tests for ICO lifecycle state components.

| File | Responsibility |
|------|----------------|
| PrivateSaleActive.test.tsx | Tests presale countdown and progress display |
| OverviewTab.test.tsx | Tests dashboard cards and earnings chart rendering |
| PostICODashboard.test.tsx | Tests tab configuration and default state |
| PrivateSaleCountdown.test.tsx | Tests countdown timer and navigation behavior |
| RewardsTab.test.tsx | Tests staking info and rewards list display |
| TokenomicsTab.test.tsx | Tests tokenomics visualization and allocation rendering |
| WhitepaperTab.test.tsx | Tests PDF viewer and sidebar navigation |
| TransactionHistoryTab.test.tsx | Tests transaction table rendering, loading/error/empty states, and pagination |

## Renamed files

`ActiveICO.test.tsx` → `PrivateSaleActive.test.tsx` (component renamed from `ActiveICO` to `PrivateSaleActive` to match ICO phase naming convention)

`DashboardICOCountdown.test.tsx` → `PostICODashboard.test.tsx` (component renamed from `DashboardICOCountdown` to `PostICODashboard`; countdown variant coverage is included in `PrivateSaleCountdown.test.tsx`)
