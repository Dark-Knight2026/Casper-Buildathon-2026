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
    icoAddress: import.meta.env.VITE_ICO_CONTRACT_HASH ?? '',
    tokenAddress: import.meta.env.VITE_BIG_TOKEN_CONTRACT_HASH ?? '',
    treasuryAddress: import.meta.env.VITE_TREASURY_CONTRACT_HASH ?? '',
    usdcAddress: import.meta.env.VITE_USDC_CONTRACT_HASH ?? '',
    usdtAddress: import.meta.env.VITE_USDT_CONTRACT_HASH ?? '',
  },

  // TODO: Replace with real timestamps from ICO contract (get_current_ico_schedule)
  // Mock values — Date.now() is evaluated once at module load, so these become stale on long sessions.
  TIMESTAMPS: {
    presaleStart: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
    presaleEnd: Date.now() + 9 * 24 * 60 * 60 * 1000,   // 9 days from now
    icoStart: Date.now() + 12 * 24 * 60 * 60 * 1000,    // 12 days from now
    icoEnd: Date.now() + 26 * 24 * 60 * 60 * 1000,      // 26 days from now
  },

  CASPER: {
    networkName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
    explorerUrl: import.meta.env.VITE_CASPER_EXPLORER_URL ?? 'https://testnet.cspr.live',
    rpcUrl: import.meta.env.VITE_CASPER_RPC_URL ?? 'https://node.testnet.casper.network/rpc',
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
  CURRENCY_RATES: {
    USDT: 1,       // 1 USDT = $1
    USDC: 1,       // 1 USDC = $1
    CSPR: 0.02,    // 1 CSPR = $0.02
    CARD: 1,       // 1 USD = $1 (fiat)
  },
};

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

