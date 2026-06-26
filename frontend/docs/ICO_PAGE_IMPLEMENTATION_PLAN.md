# ICO Page for Key Chain Token (BIG) - Implementation Plan

## Overview

**Token:** Key Chain (BIG)
**Blockchain:** Casper Network (CEP-18 standard)
**Total Supply:** 5,000,000,000 BIG
**Decimals:** 18
**KYC Required:** No

**Objective:** Single public ICO page hosted within the LeaseFi DApp
**Purpose:** Handle Presale, ICO, and Post-Sale Investor Dashboard states
**Design Principle:** One route (`/ico`), multiple UI modes driven by time + sale state
**Audience:** Retail users, non-crypto users, and experienced crypto participants

---

## Sale Phases (per Whitepaper)

| Phase | Price | Allocation | Target | Duration |
|-------|-------|------------|--------|----------|
| **Pre-Sale** | $0.001 | 20% (1B tokens) | $1,000,000 | 7 days or until sold out |
| **Public ICO** | $0.0015 | 15% (750M tokens) | $1,500,000 | TBD |

**Note:** Unsold Pre-Sale tokens will be redirected to the liquidity pool.

---

## Page States (5 States)

### State 1: Presale Countdown Mode
- Default public landing state prior to presale start
- Countdown timer to presale start (from whitepaper-defined timestamp)
- **Visible elements:**
  - Token Name (Key Chain) and symbol (BIG)
  - Brief presale explanation + supported payment methods
  - Disabled purchase module
- **Trigger to next state:** Presale start timestamp reached

### State 2: Active Presale Mode
- Countdown transitions automatically to Active Presale UI
- Users can connect wallet and purchase BIG
- **Supported payments:** USDC, USDT, Credit Card
- **Visible elements:**
  - Tokens allocated to presale
  - Tokens sold / remaining
  - User wallet balance (BIG purchased)
- **Trigger to next state:** Presale end timestamp or allocation sold out

### State 3: Investor Dashboard + ICO Countdown
- Presale ends → Page automatically becomes Investor Dashboard
- Dashboard remains persistent between presale and ICO
- **Visible elements:**
  - BIG in wallet
  - BIG staked (All pre-sale tokens a user purchases will be staked automatically into the staking contracts)
  - Rewards earned (Rewards start being earned as soon as transaction fees start happening on the main website)
  - Total BIG (wallet + staking)
  - Estimated USDC value (All BIG Token balances should also reflect its estimated USDC value next to the total number of tokens)
  - Countdown timer to ICO start
- **Trigger to next state:** ICO start timestamp reached

### State 4: Active ICO Mode
- Countdown reaches zero → Dashboard switches to ICO UI
- Entire page enters ICO Mode (similar UX to presale, expanded scope)
- **Visible elements:**
  - Live ICO token price
  - ICO allocation remaining
  - Purchase module (wallet + fiat)
  - User transaction history
- **Important:** Users cannot sell the token during Active ICO
- **Trigger to next state:** ICO end timestamp or allocation sold out

### State 5: Post-ICO Dashboard (Final State)
- ICO concludes → Page permanently returns to Dashboard Mode
- No more sale countdowns or purchase modules (unless future rounds)
- **Visible elements:**
  - Final BIG balance (includes the wallet's pre-sale + ICO purchases)
  - Staked BIG (All pre-sale tokens should have been automatically staked)
  - Rewards / yield earned
  - Buy / Sell BIG buttons (when enabled)
- **Purpose:** Long-term investor and platform engagement

---

## Page Tabs

The ICO page includes multiple tabs for comprehensive information:

1. **Main Tab** - Primary sale/dashboard interface (state-dependent)
2. **Tokenomics Tab** - Token distribution and allocation visualization
3. **Rewards Tab** - Staking rewards and earnings information
4. **Whitepaper Tab** - Access to project documentation

---

## Functional Requirements

### 1. Countdown Timer
- Display countdown to Pre-Sale start (State 1)
- Switch to Active Sale UI when timestamp reached (State 2)
- Display countdown to ICO after Pre-Sale ends (State 3)
- Show "ICO Live" status during active ICO (State 4)
- Permanent dashboard after ICO (State 5)

### 2. Token Information Display
- Current token price
- Total supply
- Hard cap for current phase
- Tokens sold / remaining
- Estimated USDC value for all balances

### 3. Sale Progress Tracker
- Visual progress bar
- Percentage of tokens sold
- Amount raised vs target

### 4. Token Purchase (States 2 & 4)
- Connect wallet (Casper wallet integration)
- **Payment Methods:**
  - USDC
  - USDT
  - Credit Card (fiat on-ramp)
- Input purchase amount
- Calculate tokens to receive
- Execute purchase transaction
- Transaction confirmation

### 5. Investor Dashboard (States 3 & 5)
- BIG in wallet
- BIG staked (auto-staked from presale)
- Rewards earned
- Total BIG (wallet + staking)
- Estimated USDC value
- Transaction history

### 6. Staking Integration
- **Auto-staking:** All pre-sale tokens automatically staked into staking contracts
- Rewards start accruing when transaction fees begin on main website
- Display staked amount and rewards earned

### 7. Buy/Sell Module (State 5 only)
- Buy BIG buttons (when enabled)
- Sell BIG buttons (when enabled)

### 8. Tokenomics Visualization
- Pie chart showing token distribution
- Vesting schedule information

---

## Technical Architecture

### File Structure

```
src/
├── pages/
│   └── ico/
│       ├── ICOPage.tsx                    # Main ICO page (state router)
│       └── components/
│           ├── states/
│           │   ├── PresaleCountdown.tsx   # State 1: Countdown to presale
│           │   ├── ActivePresale.tsx      # State 2: Active presale
│           │   ├── DashboardICOCountdown.tsx # State 3: Dashboard + ICO countdown
│           │   ├── ActiveICO.tsx          # State 4: Active ICO
│           │   └── PostICODashboard.tsx   # State 5: Final dashboard
│           │
│           ├── shared/
│           │   ├── CountdownTimer.tsx     # Countdown component
│           │   ├── TokenInfo.tsx          # Token details display
│           │   ├── PurchaseForm.tsx       # Purchase form (USDC/USDT/Card)
│           │   ├── SaleProgress.tsx       # Progress bar & stats
│           │   ├── TransactionHistory.tsx # User transactions
│           │   ├── WalletConnect.tsx      # Wallet connection UI
│           │   ├── InvestorDashboard.tsx  # Dashboard stats component
│           │   └── BuySellModule.tsx      # Buy/Sell buttons (post-ICO)
│           │
│           └── tabs/
│               ├── TokenomicsTab.tsx      # Tokenomics pie chart
│               ├── RewardsTab.tsx         # Staking rewards display
│               └── WhitepaperTab.tsx      # Whitepaper access
│
├── services/
│   └── casper/
│       ├── casperClient.ts                # Casper SDK client
│       ├── tokenContract.ts               # BIG token contract interaction
│       ├── saleContract.ts                # ICO sale contract interaction
│       ├── stakingContract.ts             # Staking contract interaction
│       └── walletService.ts               # Wallet connection service
│
├── services/
│   └── payment/
│       ├── usdcService.ts                 # USDC payment handling
│       ├── usdtService.ts                 # USDT payment handling
│       └── fiatService.ts                 # Credit card integration
│
├── hooks/
│   └── ico/
│       ├── useICOState.ts                 # ICO state management (1-5)
│       ├── useTokenPrice.ts               # Current token price
│       ├── useSaleProgress.ts             # Sale progress data
│       ├── useTokenPurchase.ts            # Purchase mutation
│       ├── useTransactionHistory.ts       # User's transactions
│       ├── useCasperWallet.ts             # Wallet connection
│       ├── useStaking.ts                  # Staking data & rewards
│       └── useInvestorDashboard.ts        # Dashboard aggregated data
│
├── types/
│   └── ico.ts                             # TypeScript interfaces
│
└── constants/
    └── ico.ts                             # ICO configuration
```

### Route Configuration

Add to `App.tsx`:

```tsx
// Single public ICO route with state-driven UI
<Route path="/big-token" element={<ICOPage />} />
```

**Implementation Note:** No page reloads between modes; UI swaps dynamically based on state.

---

## UI Components Specification

### State 1: Presale Countdown Mode

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                      KEY CHAIN (BIG)                         │
│           "Powering the KeyChain Ecosystem"                  │
│                                                              │
│    ┌────────────────────────────────────────────────────┐    │
│    │              COUNTDOWN TO PRE-SALE                 │    │
│    │                                                    │    │
│    │         12 : 05 : 32 : 15                         │    │
│    │        days  hrs   min  sec                       │    │
│    │                                                    │    │
│    └────────────────────────────────────────────────────┘    │
│                                                              │
│    Supported Payment Methods: USDC • USDT • Credit Card     │
│                                                              │
│                    [ Connect Wallet ]                        │
│                    (Purchase Disabled)                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### State 2: Active Presale Mode

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    🟢 PRE-SALE LIVE!                        │
│                                                              │
│   Token Price          Allocation          Time Remaining    │
│   ─────────────        ────────────        ──────────────    │
│   $0.001               1,000,000,000 BIG   05:12:32:15      │
│                                                              │
│   ════════════════════════════════════════════════════════   │
│   Progress: 45% sold                                         │
│   ────────────────────────────░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│   450,000,000 / 1,000,000,000 BIG                           │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │                 BUY BIG TOKENS                     │     │
│   │                                                    │     │
│   │   Payment Method:  [USDC ▼]  [USDT]  [Card]       │     │
│   │                                                    │     │
│   │   Amount:  ┌─────────────────────────┐  [ MAX ]   │     │
│   │            │ 1000                    │             │     │
│   │            └─────────────────────────┘             │     │
│   │                                                    │     │
│   │   You will receive: 1,000,000 BIG                 │     │
│   │   (Auto-staked after purchase)                    │     │
│   │                                                    │     │
│   │                  [ BUY TOKENS ]                    │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│   Your BIG Purchased: 500,000 BIG (~$500 USDC)              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### State 3: Investor Dashboard + ICO Countdown

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   [Dashboard]  [Tokenomics]  [Rewards]  [Whitepaper]        │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │              COUNTDOWN TO ICO                      │     │
│   │           03 : 12 : 45 : 30                       │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│   ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│   │  BIG in     │  BIG        │  Rewards    │  Total      │ │
│   │  Wallet     │  Staked     │  Earned     │  BIG        │ │
│   │  ─────────  │  ─────────  │  ─────────  │  ─────────  │ │
│   │  0          │  500,000    │  1,250      │  501,250    │ │
│   │  $0.00      │  $500.00    │  $1.25      │  $501.25    │ │
│   └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │  Pre-sale tokens are automatically staked and      │     │
│   │  earning rewards from platform transaction fees.   │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### State 4: Active ICO Mode

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                     🟢 ICO LIVE!                            │
│                                                              │
│   Token Price          Allocation          Time Remaining    │
│   ─────────────        ────────────        ──────────────    │
│   $0.0015              750,000,000 BIG     14:08:22:45      │
│                                                              │
│   ════════════════════════════════════════════════════════   │
│   Progress: 30% sold                                         │
│   ────────────────────────────░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│   225,000,000 / 750,000,000 BIG                             │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │                 BUY BIG TOKENS                     │     │
│   │                                                    │     │
│   │   Payment Method:  [USDC ▼]  [USDT]  [Card]       │     │
│   │                                                    │     │
│   │   Amount:  ┌─────────────────────────┐  [ MAX ]   │     │
│   │            │ 1500                    │             │     │
│   │            └─────────────────────────┘             │     │
│   │                                                    │     │
│   │   You will receive: 1,000,000 BIG                 │     │
│   │                                                    │     │
│   │                  [ BUY TOKENS ]                    │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│   ⚠️ Token sales disabled during ICO                        │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │              YOUR TRANSACTION HISTORY              │     │
│   │  ──────────────────────────────────────────────    │     │
│   │  Date       │ Amount    │ Tokens     │ Status │ TX │     │
│   │  Jan 15     │ $100 USDC │ 66,666 BIG │   ✓    │ ↗  │     │
│   │  Jan 10     │ $500 USDC │ 500K BIG   │   ✓    │ ↗  │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### State 5: Post-ICO Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   [Dashboard]  [Tokenomics]  [Rewards]  [Whitepaper]        │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │              ICO COMPLETED ✓                       │     │
│   │     Total Raised: $2,125,000 | Tokens Sold: 1.75B │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│   ┌─────────────┬─────────────┬─────────────┬─────────────┐ │
│   │  BIG in     │  BIG        │  Rewards    │  Total      │ │
│   │  Wallet     │  Staked     │  Earned     │  BIG        │ │
│   │  ─────────  │  ─────────  │  ─────────  │  ─────────  │ │
│   │  66,666     │  500,000    │  5,500      │  572,166    │ │
│   │  $100.00    │  $750.00    │  $8.25      │  $858.25    │ │
│   └─────────────┴─────────────┴─────────────┴─────────────┘ │
│                                                              │
│   ┌──────────────────────┐  ┌──────────────────────┐        │
│   │      [ BUY BIG ]     │  │     [ SELL BIG ]     │        │
│   └──────────────────────┘  └──────────────────────┘        │
│                                                              │
│   ┌────────────────────────────────────────────────────┐     │
│   │              YOUR TRANSACTION HISTORY              │     │
│   │  ──────────────────────────────────────────────    │     │
│   │  Date       │ Amount    │ Tokens     │ Status │ TX │     │
│   │  Jan 20     │ $1500 USDC│ 1M BIG     │   ✓    │ ↗  │     │
│   │  Jan 15     │ $100 USDC │ 66,666 BIG │   ✓    │ ↗  │     │
│   │  Jan 10     │ $500 USDC │ 500K BIG   │   ✓    │ ↗  │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Casper Network Integration

### Wallet Support

1. **Casper Wallet** (Official browser extension)
2. **Casper Signer** (Legacy browser extension)
3. **Ledger** (Hardware wallet via Casper Wallet)

**Note:** Wallet connection logic shared with main LeaseFi dashboard.

### Service Methods

```typescript
// walletService.ts
interface WalletService {
  connect(): Promise<string>;           // Returns public key
  disconnect(): Promise<void>;
  getActivePublicKey(): string | null;
  getBalance(): Promise<string>;        // CSPR balance
  getTokenBalance(token: 'USDC' | 'USDT' | 'BIG'): Promise<string>;
  signDeploy(deploy: Deploy): Promise<Deploy>;
  isConnected(): boolean;
}

// saleContract.ts
interface SaleContractService {
  getSaleState(): Promise<ICOState>;    // Returns current state (1-5)
  getCurrentPrice(): Promise<string>;
  getTotalSold(): Promise<string>;
  getRemainingTokens(): Promise<string>;
  getHardCap(): Promise<string>;
  purchaseWithUSDC(amount: string): Promise<string>;
  purchaseWithUSDT(amount: string): Promise<string>;
  getUserPurchases(publicKey: string): Promise<Purchase[]>;
  getTimestamps(): Promise<SaleTimestamps>;
}

// stakingContract.ts
interface StakingContractService {
  getStakedBalance(publicKey: string): Promise<string>;
  getRewardsEarned(publicKey: string): Promise<string>;
  getTotalStaked(): Promise<string>;
}

// Types
type ICOState = 1 | 2 | 3 | 4 | 5;

interface SaleTimestamps {
  presaleStart: number;
  presaleEnd: number;
  icoStart: number;
  icoEnd: number;
}

interface SaleStatus {
  state: ICOState;
  phase: 'presale-countdown' | 'presale-active' | 'dashboard-ico-countdown' | 'ico-active' | 'post-ico';
  isActive: boolean;
  currentTimestamp: number;
  nextStateTimestamp: number | null;
}

interface Purchase {
  deployHash: string;
  timestamp: number;
  paymentMethod: 'USDC' | 'USDT' | 'CARD';
  paymentAmount: string;
  tokenAmount: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface InvestorDashboardData {
  bigInWallet: string;
  bigStaked: string;
  rewardsEarned: string;
  totalBig: string;
  estimatedUsdcValue: string;
}
```

---

## Payment Integration

### Supported Payment Methods

| Method | Implementation | Notes |
|--------|---------------|-------|
| **USDC** | Direct Casper transfer | CEP-18 token on Casper |
| **USDT** | Direct Casper transfer | CEP-18 token on Casper |
| **Credit Card** | Fiat on-ramp integration | Third-party service (e.g., MoonPay, Transak) |

### Payment Flow

1. User selects payment method
2. User enters amount
3. System calculates BIG tokens to receive
4. For crypto: Sign transaction with wallet
5. For fiat: Redirect to payment processor
6. Confirmation and token allocation
7. Auto-stake (presale tokens only)

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | Frontend framework |
| TailwindCSS | Styling |
| shadcn/ui | UI components |
| React Query (TanStack) | Server state management |
| casper-js-sdk | Casper blockchain interaction |
| recharts | Tokenomics pie chart |
| date-fns | Date/time handling |
| zustand | Local state (wallet connection, ICO state) |

---

## Implementation Phases

### Phase 1: Foundation & State Management (Priority: High)

**Tasks:**
1. Create `/ico` route in App.tsx
2. Create `ICOPage.tsx` with state router
3. Implement state management hook (`useICOState`)
4. Create all 5 state components (skeleton)
5. Implement `CountdownTimer` component
6. Create tab navigation structure
7. Basic responsive design

**Deliverables:**
- Working state transitions based on timestamps
- Countdown timers for each state
- Tab navigation

### Phase 2: Wallet Integration (Priority: High)

**Tasks:**
1. Install and configure `casper-js-sdk`
2. Create `walletService.ts`
3. Implement `useCasperWallet` hook
4. Create `WalletConnect` component
5. Add wallet state management (zustand)
6. Handle connection/disconnection flow
7. Display wallet balances (CSPR, USDC, USDT, BIG)

**Deliverables:**
- Working wallet connection
- Multi-token balance display
- Persistent connection state

### Phase 3: Purchase Flow (Priority: High)

**Tasks:**
1. Create `saleContract.ts` service
2. Create payment services (USDC, USDT, fiat)
3. Implement `useTokenPurchase` hook
4. Create `PurchaseForm` component with payment method selection
5. Add input validation
6. Implement transaction signing
7. Credit card integration (fiat on-ramp)
8. Transaction confirmation
9. Error handling and user feedback

**Deliverables:**
- Working token purchase with USDC/USDT
- Credit card payment option
- Transaction confirmation

### Phase 4: Staking & Dashboard (Priority: High)

**Tasks:**
1. Create `stakingContract.ts` service
2. Implement auto-staking logic for presale purchases
3. Create `InvestorDashboard` component
4. Implement `useStaking` hook
5. Display staked amounts and rewards
6. Show estimated USDC values for all balances
7. Create dashboard variations for States 3 and 5

**Deliverables:**
- Auto-staking functionality
- Investor dashboard with all metrics
- Rewards display

### Phase 5: Transaction History & Tabs (Priority: Medium)

**Tasks:**
1. Implement `useTransactionHistory` hook
2. Create `TransactionHistory` component
3. Create `TokenomicsTab` component
4. Create `RewardsTab` component
5. Create `WhitepaperTab` component
6. Link to Casper explorer

**Deliverables:**
- User transaction history
- All tab content
- Explorer links

### Phase 6: Post-ICO Features (Priority: Medium)

**Tasks:**
1. Create `BuySellModule` component
2. Implement buy/sell functionality (when enabled)
3. Final dashboard state polish
4. Sale summary display

**Deliverables:**
- Buy/Sell buttons (conditional)
- Complete post-ICO dashboard

### Phase 7: Polish & Testing (Priority: Medium)

**Tasks:**
1. Implement loading skeletons
2. Add error boundaries
3. Performance optimization
4. Final responsive adjustments
5. Cross-browser testing
6. Non-crypto user UX optimization

**Deliverables:**
- Polished UI/UX
- Production-ready page
- Accessible for non-crypto users

---

## Configuration Constants

```typescript
// constants/ico.ts

export const ICO_CONFIG = {
  TOKEN: {
    name: 'Key Chain',
    symbol: 'BIG',
    decimals: 18,
    totalSupply: '5000000000', // 5 billion
  },

  PRE_SALE: {
    price: '0.001',           // USD per token
    allocation: '1000000000', // 1 billion tokens (20%)
    hardCap: '1000000',       // $1,000,000 USD
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    autoStake: true,          // Presale tokens auto-staked
  },

  PUBLIC_ICO: {
    price: '0.0015',          // USD per token
    allocation: '750000000',  // 750 million tokens (15%)
    hardCap: '1500000',       // $1,500,000 USD
    autoStake: false,         // ICO tokens not auto-staked
  },

  PAYMENT_METHODS: ['USDC', 'USDT', 'CARD'] as const,

  CONTRACTS: {
    tokenAddress: '',    // To be filled after deployment
    saleAddress: '',     // To be filled after deployment
    stakingAddress: '',  // To be filled after deployment
    usdcAddress: '',     // USDC CEP-18 contract
    usdtAddress: '',     // USDT CEP-18 contract
  },

  TIMESTAMPS: {
    presaleStart: 0,     // Unix timestamp - to be set
    presaleEnd: 0,       // Unix timestamp - to be set
    icoStart: 0,         // Unix timestamp - to be set
    icoEnd: 0,           // Unix timestamp - to be set
  },

  CASPER: {
    networkName: 'casper', // or 'casper-test' for testnet
    explorerUrl: 'https://cspr.live',
  },

  FIAT_ONRAMP: {
    provider: 'moonpay', // or 'transak'
    apiKey: '',          // To be configured
  },
};

export type PaymentMethod = typeof ICO_CONFIG.PAYMENT_METHODS[number];
```

---

## API Endpoints (if backend required)

If a backend is needed for caching or additional data:

```
GET  /api/ico/state           - Current ICO state (1-5)
GET  /api/ico/status          - Full sale status with timestamps
GET  /api/ico/price           - Current token price
GET  /api/ico/progress        - Sale progress (cached)
GET  /api/ico/transactions    - User's transaction history
GET  /api/ico/dashboard       - Aggregated dashboard data
GET  /api/ico/staking         - User's staking info & rewards
POST /api/ico/verify-purchase - Verify purchase completion
```

---

## Security Considerations

1. **Input Validation**
   - Validate purchase amounts client-side and contract-side
   - Prevent negative or zero amounts
   - Check against user's balance

2. **Transaction Safety**
   - Always show transaction details before signing
   - Implement transaction timeout handling
   - Store pending transactions locally

3. **Wallet Security**
   - Never request private keys
   - Use official Casper Wallet SDK
   - Clear sensitive data on disconnect

4. **Rate Limiting**
   - Implement rate limiting on backend endpoints
   - Throttle contract read calls

5. **State Integrity**
   - State controlled by timestamps + backend sale status flags
   - Validate state transitions server-side

---

## Developer Implementation Notes

1. **Single public route** (`/ico`) with state-driven UI rendering
2. **State controlled by timestamps** + backend sale status flags
3. **No page reloads between modes**; UI swaps dynamically
4. **Wallet connection logic shared** with main LeaseFi dashboard
5. **Design must prioritize clarity** for non-crypto users

---

## Testing Strategy

### Unit Tests
- Countdown timer logic
- State transition logic
- Price calculations
- Input validation
- Hook behaviors

### Integration Tests
- Wallet connection flow
- Purchase flow (testnet)
- State transitions
- Transaction history loading
- Staking calculations

### E2E Tests
- Complete purchase journey (all payment methods)
- Full state progression (1 → 2 → 3 → 4 → 5)
- Wallet connection/disconnection
- Error scenarios
- Non-crypto user flow

---

## References

- [BIG ICO Page Development Deck v1](../BIG_ICO_Page_Development_Deck_v1.pptx)
- [Tailor Coin Whitepaper](./LeaseFi%20WhitePaper.pdf)
- [Casper JS SDK Documentation](https://github.com/casper-ecosystem/casper-js-sdk)
- [Casper Wallet Integration](https://docs.casperwallet.io/)
- [CEP-18 Token Standard](https://github.com/casper-ecosystem/cep18)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Development Team | Initial draft |
| 2.0 | 2026-01-26 | Development Team | Updated based on BIG ICO Page Development Deck v1: Added 5-state model, payment methods (USDC/USDT/Card), auto-staking, investor dashboard, tabs structure |
