/**
 * ICO Configuration Constants
 * Key Chain Token (BIG) on Casper Network
 */

import type { PaymentCurrency, TokenomicsAllocation } from '@/types/ico';

export const ICO_CONFIG = {
  TOKEN: {
    name: 'BIG Token',
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
    fundsRaised: '500000',    // $500,000 USD raised so far
  },

  PUBLIC_ICO: {
    price: '0.0015',          // USD per token
    allocation: '750000000',  // 750 million tokens (15%)
    hardCap: '1500000',       // $1,500,000 USD
    autoStake: false,         // ICO tokens not auto-staked
  },

  PAYMENT_METHODS: ['USDT', 'USDC', 'CSPR', 'CARD'] as const,

  CONTRACTS: {
    tokenAddress: '',    // To be filled after deployment
    saleAddress: '',     // To be filled after deployment
    stakingAddress: '',  // To be filled after deployment
    usdcAddress: '',     // USDC CEP-18 contract
    usdtAddress: '',     // USDT CEP-18 contract
  },

  // TODO: Replace with real timestamps from backend API.
  // Use getIcoTimestamps() for fresh values — see below.
  TIMESTAMPS_OFFSETS: {
    presaleStart: 2 * 24 * 60 * 60 * 1000, // 2 days
    presaleEnd: 9 * 24 * 60 * 60 * 1000,   // 9 days
    icoStart: 12 * 24 * 60 * 60 * 1000,    // 12 days
    icoEnd: 26 * 24 * 60 * 60 * 1000,      // 26 days
  },

  CASPER: {
    networkName: 'casper', // or 'casper-test' for testnet
    explorerUrl: 'https://cspr.live',
  },

  FIAT_ONRAMP: {
    provider: 'moonpay', // or 'transak'
    apiKey: '',          // To be configured
  },

  // Minimum and maximum purchase amounts in USD
  PURCHASE_LIMITS: {
    min: 10,      // $10 minimum
    max: 100000,  // $100,000 maximum
  },

  // Currency to USD conversion rates (constant for now)
  // TODO: [Next PR] Replace hardcoded CSPR rate with real-time price oracle.
  // CSPR is volatile — a hardcoded rate can cause significant over/under-charging.
  // Integration plan:
  //   1. Use useCSPRPrice hook (src/hooks/useCSPRPrice.ts) which already fetches
  //      live rates from csprCloudService every 60 seconds.
  //   2. Add staleness detection — reject transactions if rate is > 5 min old.
  //   3. USDT/USDC rates should also be fetched to handle minor de-peg scenarios.
  //   4. Keep these hardcoded values only as fallback defaults.
  //
  // NOTE: These client-side rates are for UI display/estimation only.
  // They are inherently manipulable (browser DevTools, etc.) and MUST NOT be
  // trusted for actual financial calculations. The backend will independently
  // compute token amounts using its own exchange rates and reject any request
  // where client-submitted values diverge from the server-side truth.
  CURRENCY_RATES: {
    USDT: 1,       // 1 USDT = $1
    USDC: 1,       // 1 USDC = $1
    CSPR: 0.02,    // 1 CSPR = $0.02 — PLACEHOLDER, must be replaced with live rate
    CARD: 1,       // 1 USD = $1 (fiat)
  },
} as const;

/** Returns fresh mock timestamps relative to the current time. */
export function getIcoTimestamps() {
  const now = Date.now();
  return {
    presaleStart: now + ICO_CONFIG.TIMESTAMPS_OFFSETS.presaleStart,
    presaleEnd: now + ICO_CONFIG.TIMESTAMPS_OFFSETS.presaleEnd,
    icoStart: now + ICO_CONFIG.TIMESTAMPS_OFFSETS.icoStart,
    icoEnd: now + ICO_CONFIG.TIMESTAMPS_OFFSETS.icoEnd,
  };
}

// Payment currency display info
export const PAYMENT_CURRENCY_INFO: Record<PaymentCurrency, {
  name: string;
  icon: string;
  description: string;
}> = {
  USDT: {
    name: 'USDT',
    icon: 'usdt',
    description: 'Tether on Casper Network',
  },
  USDC: {
    name: 'USDC',
    icon: 'usdc',
    description: 'USD Coin on Casper Network',
  },
  CSPR: {
    name: 'CSPR',
    icon: 'cspr',
    description: 'Casper Network native token',
  },
  CARD: {
    name: 'Credit Card',
    icon: 'credit-card',
    description: 'Pay with Visa, Mastercard, or other cards',
  },
};

// Tokenomics distribution (from whitepaper)
export const TOKENOMICS_ALLOCATION: TokenomicsAllocation[] = [
  {
    category: 'Pre-Sale',
    percentage: 20,
    amount: '1,000,000,000',
    vestingPeriod: 'Auto-staked',
    color: 'hsl(var(--ico-card-staked))',
  },
  {
    category: 'Public ICO',
    percentage: 15,
    amount: '750,000,000',
    vestingPeriod: 'Immediate',
    color: 'hsl(var(--ico-brand-primary))',
  },
  {
    category: 'Team & Advisors',
    percentage: 15,
    amount: '750,000,000',
    vestingPeriod: '24 months linear',
    color: 'hsl(var(--ico-card-rewards))',
  },
  {
    category: 'Ecosystem & Development',
    percentage: 20,
    amount: '1,000,000,000',
    vestingPeriod: '36 months linear',
    color: 'hsl(var(--ico-brand-accent))',
  },
  {
    category: 'Liquidity Pool',
    percentage: 15,
    amount: '750,000,000',
    vestingPeriod: 'Locked',
    color: 'hsl(var(--ico-card-wallet))',
  },
  {
    category: 'Marketing & Partnerships',
    percentage: 10,
    amount: '500,000,000',
    vestingPeriod: '12 months linear',
    color: 'hsl(var(--ico-state-countdown))',
  },
  {
    category: 'Reserve',
    percentage: 5,
    amount: '250,000,000',
    vestingPeriod: 'Locked 12 months',
    color: 'hsl(var(--ico-timer-label))',
  },
];

// State display info
export const ICO_STATE_INFO = {
  1: {
    name: 'Pre-Sale Countdown',
    description: 'Pre-sale starts soon',
    color: 'hsl(var(--ico-state-countdown))',
  },
  2: {
    name: 'Pre-Sale Live',
    description: 'Pre-sale is active',
    color: 'hsl(var(--ico-state-active))',
  },
  3: {
    name: 'ICO Countdown',
    description: 'ICO starts soon',
    color: 'hsl(var(--ico-state-dashboard))',
  },
  4: {
    name: 'ICO Live',
    description: 'Public ICO is active',
    color: 'hsl(var(--ico-state-active))',
  },
  5: {
    name: 'ICO Completed',
    description: 'Token sale has ended',
    color: 'hsl(var(--ico-state-completed))',
  },
} as const;

