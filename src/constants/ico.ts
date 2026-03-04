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
  },

  PAYMENT_METHODS: ['USDT', 'USDC', 'CSPR', 'CARD'] as const,

  CONTRACTS: {
    icoAddress: import.meta.env.VITE_ICO_CONTRACT_HASH ?? '',
    icoPackageHash: import.meta.env.VITE_ICO_PACKAGE_HASH ?? '',
    tokenAddress: import.meta.env.VITE_BIG_TOKEN_CONTRACT_HASH ?? 'hash-f7d94fd8670fdc69aabd07c214ab8d52c3fc1fd839f0cc7713e1574cdfd899ec',
    treasuryAddress: import.meta.env.VITE_TREASURY_CONTRACT_HASH ?? '',
    usdcAddress: import.meta.env.VITE_USDC_CONTRACT_HASH ?? 'hash-7f06f66426f18ca8d3b8df69f977a54554d39fda43ebe942fd22ece0d20235bd',
    usdtAddress: import.meta.env.VITE_USDT_CONTRACT_HASH ?? 'hash-7c902e8a111b3116e00c7507138b92b83f96b29be98aa95247928583720e297a',
  },

  // TODO: Replace with real timestamps from backend API.
  // Use getIcoTimestamps() for fresh values — see below.


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
    min: 1,      // $1 minimum
    max: 100000,  // $100,000 maximum
  },

};

/**
 * Returns currency-to-USD rate.
 * CSPR: live rate from CoinGecko (passed as param), stablecoins/fiat: always 1.
 */
export function getCurrencyRateUsd(currency: PaymentCurrency, csprPriceUsd?: number): number {
  if (currency === 'CSPR') {
    if (!csprPriceUsd || csprPriceUsd <= 0) {
      throw new Error('CSPR price unavailable - please try again later');
    }
    return csprPriceUsd;
  }
  return 1; // USDT, USDC, CARD are all 1:1 USD
}

// Mock transaction data - single source of truth
// TODO: Replace with real API data
export const MOCK_TRANSACTIONS = [
  {
    id: '1',
    type: 'purchase' as const,
    amount: 1500,
    currency: 'USDC',
    tokensReceived: 1000000,
    tokenSymbol: 'BIG',
    status: 'failed' as const,
    timestamp: new Date('2025-01-20T10:30:00'),
    txHash: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    id: '2',
    type: 'purchase' as const,
    amount: 100,
    currency: 'USDC',
    tokensReceived: 66666,
    tokenSymbol: 'BIG',
    status: 'pending' as const,
    timestamp: new Date('2025-01-15T14:20:00'),
    txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
  },
  {
    id: '3',
    type: 'purchase' as const,
    amount: 500,
    currency: 'USDC',
    tokensReceived: 333333,
    tokenSymbol: 'BIG',
    status: 'completed' as const,
    timestamp: new Date('2025-01-10T09:15:00'),
    txHash: '0x7890abcdef1234567890abcdef1234567890abcd',
  },
];

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
    category: 'Private Sale',
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
    name: 'Private Sale Countdown',
    description: 'Private Sale starts soon',
    color: 'hsl(var(--ico-state-countdown))',
  },
  2: {
    name: 'Private Sale Live',
    description: 'Private Sale is active',
    color: 'hsl(var(--ico-state-active))',
  },
  3: {
    name: 'Post-ICO Dashboard',
    description: 'Token sale complete',
    color: 'hsl(var(--ico-state-dashboard))',
  },
} as const;

