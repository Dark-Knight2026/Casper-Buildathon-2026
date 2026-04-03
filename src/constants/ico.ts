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

  PAYMENT_METHODS: ['USDT', 'USDC', 'CSPR'] as const,

  CONTRACTS: {
    icoAddress: import.meta.env.VITE_ICO_CONTRACT_HASH ?? '',
    icoPackageHash: import.meta.env.VITE_ICO_PACKAGE_HASH ?? '',
    tokenAddress: import.meta.env.VITE_BIG_TOKEN_CONTRACT_HASH ?? '',
    treasuryAddress: import.meta.env.VITE_TREASURY_CONTRACT_HASH ?? '',
    vestingPackageHash: import.meta.env.VITE_VESTING_PACKAGE_HASH ?? '',
    stakingPackageHash: import.meta.env.VITE_STAKING_PACKAGE_HASH ?? '',
    // Package hashes — used for approve() transactions
    usdcAddress: import.meta.env.VITE_USDC_CONTRACT_HASH ?? '',
    usdtAddress: import.meta.env.VITE_USDT_CONTRACT_HASH ?? '',
    // Contract instance hashes — used for state queries (allowance check, balance)
    // Falls back to package hash if not set (for non-Odra contracts where package == contract)
    usdcInstanceHash: import.meta.env.VITE_USDC_CONTRACT_INSTANCE_HASH || '',
    usdtInstanceHash: import.meta.env.VITE_USDT_CONTRACT_INSTANCE_HASH || '',
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
    min: 1,      // $1 minimum
    max: 100000,  // $100,000 maximum
  },

};

/**
 * Validates that all required ICO contract addresses are set via environment variables.
 * Call once at app startup (e.g. main.tsx) to catch misconfigured deployments early.
 * Throws with a clear message listing every missing variable.
 */
export function validateICOConfig(): void {
  const required: Array<[string, string]> = [
    ['VITE_ICO_CONTRACT_HASH',       ICO_CONFIG.CONTRACTS.icoAddress],
    ['VITE_ICO_PACKAGE_HASH',        ICO_CONFIG.CONTRACTS.icoPackageHash],
    ['VITE_BIG_TOKEN_CONTRACT_HASH', ICO_CONFIG.CONTRACTS.tokenAddress],
    ['VITE_USDC_CONTRACT_HASH',      ICO_CONFIG.CONTRACTS.usdcAddress],
    ['VITE_USDT_CONTRACT_HASH',      ICO_CONFIG.CONTRACTS.usdtAddress],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[ICO] Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
      'Set them in your .env file (testnet) or deployment environment (production).',
    );
  }
}

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

