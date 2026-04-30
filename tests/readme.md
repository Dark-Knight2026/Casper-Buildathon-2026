# Tests Directory

This directory contains all test files for the LeaseFi application, organized by the type of code being tested.

## Responsibility Table

| File/Directory | Responsibility |
|----------------|----------------|
| `fixtures/` | Test data files and mock assets for integration and E2E tests (PDFs, images, text files) |
| `constants/` | Unit tests for application-wide constants |
| `constants/ico.test.ts` | Tests for ICO-related constants (schedules, token config, phase definitions) |
| `hooks/` | Unit tests for custom React hooks |
| `hooks/useFinancialDashboard.test.ts` | Tests for commission and financial summary calculations |
| `hooks/useICOSchedules.test.ts` | Tests for ICO schedule derivation and phase timing logic |
| `hooks/useICOState.test.ts` | Tests for ICO state machine (phase transitions, active sale detection) |
| `hooks/useICOWallet.test.ts` | Tests for wallet connection and address management in ICO context |
| `hooks/useMaintenanceRealtime.test.tsx` | Tests for real-time maintenance data synchronization |
| `hooks/usePurchaseFlow.test.ts` | Tests for multi-step purchase flow state and transitions |
| `hooks/usePurchaseToken.test.ts` | Tests for token purchase submission and transaction handling |
| `hooks/useWalletBalances.test.ts` | Tests for fetching and formatting wallet token balances |
| `lib/` | Unit tests for library utilities and helper functions |
| `lib/utils/taxCalculations.test.ts` | Tests for tax calculation utilities (depreciation, net income, tax liability) |
| `pages/` | Unit tests for top-level page components |
| `pages/ico/ICOPage.test.tsx` | Tests for ICO page rendering and routing behavior |
| `pages/PropertyLanding.test.tsx` | Tests for landing page (hero, stats, CTAs, FeaturedProperties + LandingHeader integration) |
| `services/` | Unit tests for service layer (API interactions, data fetching) |
| `services/casperClient.test.ts` | Tests for Casper RPC client initialization and query methods |
| `services/cep18Service.test.ts` | Tests for CEP-18 token contract interactions (balance, allowance, approve) |
| `services/contractTypes.test.ts` | Tests for contract type guards and ABI parsing utilities |
| `services/icoContractService.test.ts` | Tests for ICO smart contract read methods (phases, caps, raised amounts) |
| `services/icoPurchaseService.test.ts` | Tests for ICO purchase transaction building and submission |
| `services/odraStorage.test.ts` | Tests for Odra contract storage key derivation and decoding |
| `services/proxyCallerService.test.ts` | Tests for proxy-caller contract interactions |
| `services/sellerService.test.ts` | Tests for seller-related service methods (listings, offers, showings, documents, market analytics) |
| `components/` | Unit tests for reusable UI components |
| `components/FeaturedProperties.test.tsx` | Tests for featured property cards (rendering, navigation, keyboard a11y, favorite button) |
| `components/LandingHeader.test.tsx` | Tests for public landing page header (logo, nav links, auth CTAs) |
| `components/ui/` | Unit tests for shadcn-based UI primitives (see `components/ui/readme.md`) |
| `components/ui/badge.test.tsx` | Tests for Badge variants (default, secondary, destructive, outline, success, info) |
| `components/ui/button.test.tsx` | Tests white variant classes and loading/disabled behavior |
| `components/ico/AmountInput.test.tsx` | Tests for token amount input field (validation, formatting) |
| `components/ico/Card.test.tsx` | Tests for generic card container component |
| `components/ico/CountdownTimer.test.tsx` | Tests for countdown timer display and tick logic |
| `components/ico/CurrencySelector.test.tsx` | Tests for currency/token selector dropdown |
| `components/ico/DashboardTabs.test.tsx` | Tests for tabbed dashboard navigation and active state |
| `components/ico/ICOFooter.test.tsx` | Tests for ICO page footer rendering |
| `components/ico/ICOHeader.test.tsx` | Tests for ICO page header and branding |
| `components/ico/InfoCard.test.tsx` | Tests for informational card with label/value display |
| `components/ico/MainButton.test.tsx` | Tests for primary CTA button (disabled states, loading) |
| `components/ico/ProgressBar.test.tsx` | Tests for sale progress bar (percentage calculation, edge cases) |
| `components/ico/PurchaseConfirmationModal.test.tsx` | Tests for purchase confirmation modal (amounts, warnings, confirm/cancel) |
| `components/ico/SubTitle.test.tsx` | Tests for subtitle typography component |
| `components/ico/Title.test.tsx` | Tests for title typography component |
| `components/ico/TransactionHistory.test.tsx` | Tests for transaction history list (empty state, pagination) |
| `components/ico/TransactionStatusToast.test.tsx` | Tests for transaction status toast notifications |
| `components/ico/UserTokenBalance.test.tsx` | Tests for user token balance display |
| `components/ico/VestingProgressBlock.test.tsx` | Tests for vesting schedule progress visualization |
| `components/ico/WalletCard.test.tsx` | Tests for wallet info card (address truncation, balance) |
| `components/ico/states/PrivateSaleActive.test.tsx` | Tests for active presale phase UI and purchase form |
| `components/ico/states/OverviewTab.test.tsx` | Tests for ICO overview tab content |
| `components/ico/states/PostICODashboard.test.tsx` | Tests for post-ICO dashboard (vesting, claims) |
| `components/ico/states/PrivateSaleCountdown.test.tsx` | Tests for private sale countdown screen |
| `components/ico/states/RewardsTab.test.tsx` | Tests for rewards/referral tab content |
| `components/ico/states/TokenomicsTab.test.tsx` | Tests for tokenomics tab (distribution chart, allocation table) |
| `components/ico/states/WhitepaperTab.test.tsx` | Tests for whitepaper tab rendering and PDF link |

## Test Structure

- **Unit Tests**: Individual functions and hooks tested in isolation
- **Integration Tests**: Multiple components working together (using fixtures)
- **Mocking**: External dependencies (Supabase, APIs) are mocked using Vitest

## Running Tests

```bash
pnpm test          # Run all tests
pnpm test:watch    # Run tests in watch mode
pnpm test:ui       # Run tests with Vitest UI
```
