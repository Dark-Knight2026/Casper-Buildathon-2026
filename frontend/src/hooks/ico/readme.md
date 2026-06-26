# ICO Hooks

Custom React hooks for ICO functionality including state management, wallet connection, balance tracking, and token purchases.

## Responsibility Table

| File | Responsibility |
|------|----------------|
| useICOState.ts | Manage ICO phase state based on timestamps (presale-countdown, presale-active, ico-countdown, ico-active, post-ico) with dev mode override support |
| useICOSchedules.ts | Fetch presale/ICO schedules and progress data (tokens sold, allocation, price) from smart contract with 5-minute polling |
| useICOWallet.ts | Manage Casper wallet connection via CSPR.click SDK, handle sign-in/sign-out events and account switching |
| useWalletBalances.ts | Fetch wallet balances (CSPR, USDT, USDC, BIG tokens) from CSPR.Cloud API with 30-second auto-refresh |
| usePurchaseFlow.ts | Orchestrate complete purchase flow: modal/toast state management, wallet integration, and purchase execution |
| usePurchaseToken.ts | Execute token purchase transactions: validation, CEP-18 approval handling, transaction signing, and blockchain submission |

## Hook Details

### useICOState

Calculates the current ICO state based on configured timestamps. Returns:
- `state`: Current ICO state (1-5)
- `phase`: Human-readable phase name
- `status`: Combined status object
- `timestamps`: Sale timestamps
- `setDevState`: Dev mode override for testing

### useICOSchedules

Fetches schedule data from ICO smart contract. Returns:
- `timestamps`: Presale/ICO start and end times
- `presaleProgress`: Tokens sold, allocation, price, percent sold
- `icoProgress`: Same metrics for ICO phase
- `refetch()`: Manual refresh function

### useICOWallet

Integrates with CSPR.click SDK for wallet management. Returns:
- `isConnected`: Connection status
- `account`: Connected account details (publicKey, accountHash, provider)
- `connect()`: Trigger wallet sign-in
- `disconnect()`: Trigger wallet sign-out

### useWalletBalances

Fetches token balances from CSPR.Cloud API with 30-second auto-refresh. Returns:
- `balances`: Object containing cspr, usdt, usdc, big balances
- `isLoading`: Loading state
- `error`: Error message if fetch failed
- `refetch()`: Manual refresh function

### usePurchaseFlow

High-level hook combining wallet, balances, and purchase logic. Returns:
- `isConnected`, `account`, `connect`, `balances`: Wallet state
- `showConfirmModal`, `pendingPurchase`: Modal state
- `handlePurchase()`: Initiate purchase (opens modal or triggers connect)
- `handleConfirmPurchase()`: Execute confirmed purchase
- `modalProps`, `toastProps`: Ready-to-use component props

### usePurchaseToken

Low-level hook for transaction execution. Returns:
- `state`: Current step (idle, validating, awaiting-signature, confirmed, failed)
- `purchase()`: Execute purchase with amount, currency, and balance
- `reset()`: Reset state to idle
- `calculateTokens()`: Calculate tokens for given payment amount
