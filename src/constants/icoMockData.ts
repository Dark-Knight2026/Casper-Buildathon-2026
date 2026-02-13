/**
 * Consolidated ICO mock data for development.
 * TODO: Replace with real API data.
 */

import type { VestingEntry } from '@/pages/ico/components/shared/VestingProgressBlock';

// === ActivePresale ===

export const MOCK_PRESALE_PROGRESS = {
  tokensSold: 450000000,
  totalAllocation: 1000000000,
  amountRaised: 450000,
};

export const MOCK_WALLET = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  balanceUSDT: 5000,
  balanceUSDC: 3500,
  balanceCSPR: 10000,
};

export const MOCK_USER_BALANCE = {
  tokensPurchased: 1505000,  // 500,000 + 1,000,000 + 5,000
  totalSpentUSD: 1505,       // $500 + $1,000 + $5 (250 CSPR × $0.02)
};

// === ActiveICO ===

export const MOCK_ICO_PROGRESS = {
  tokensSold: 225000000,
  totalAllocation: 750000000,
  amountRaised: 337500,
};

// === DashboardICOCountdown ===

export const MOCK_VESTING_INFO = {
  bigPurchased: '500000',
  bigLocked: '500000',
  bigAvailable: '0',
  vestingStartDate: 'After ICO ends',
  vestingDuration: '12 months',
  vestingCliff: '3 months',
};

export const MOCK_VESTING_ENTRIES: VestingEntry[] = [
  {
    id: '1',
    lockedAmount: 200000,
    unlockTimestamp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    purchaseTimestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
  },
  {
    id: '2',
    lockedAmount: 150000,
    unlockTimestamp: Date.now() + 60 * 24 * 60 * 60 * 1000,
    purchaseTimestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: '3',
    lockedAmount: 150000,
    unlockTimestamp: Date.now() + 90 * 24 * 60 * 60 * 1000,
    purchaseTimestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
];

// === OverviewTab ===

export const MOCK_DASHBOARD = {
  bigInWallet: '66666',
  bigStaked: '500000',
  rewardsEarned: '5500',
  totalBig: '572166',
  estimatedUsdcValue: '858.25',
};

export const MOCK_STAKING_INFO = {
  nextRewards: '2d 14h 32m',
  currentAPY: '12.5',
};

export const MOCK_EARNINGS_DATA = [
  { month: 'Jan', earnings: 120 },
  { month: 'Feb', earnings: 250 },
  { month: 'Mar', earnings: 180 },
  { month: 'Apr', earnings: 420 },
  { month: 'May', earnings: 380 },
  { month: 'Jun', earnings: 550 },
];

export const MOCK_PORTFOLIO = {
  estimatedValue: '858.25',
  change24h: '+2.4',
};

// === RewardsTab ===

export const MOCK_STAKING = {
  stakedTokens: '500,000',
  currentAPY: '12.5',
  nextRewards: '2d 14h 32m',
};

export const MOCK_FEE_DATA = [
  { day: '1', swap: 10, transfer: 5, bridge: 2, lease: 8, liquidation: 1 },
  { day: '10', swap: 45, transfer: 20, bridge: 12, lease: 30, liquidation: 5 },
  { day: '20', swap: 90, transfer: 48, bridge: 25, lease: 65, liquidation: 12 },
  { day: '30', swap: 140, transfer: 75, bridge: 40, lease: 110, liquidation: 20 },
  { day: '45', swap: 200, transfer: 110, bridge: 58, lease: 160, liquidation: 32 },
  { day: '60', swap: 260, transfer: 150, bridge: 75, lease: 210, liquidation: 45 },
  { day: '75', swap: 320, transfer: 190, bridge: 90, lease: 260, liquidation: 60 },
  { day: '90', swap: 400, transfer: 240, bridge: 110, lease: 320, liquidation: 80 },
];

// === TokenomicsTab ===

export const MOCK_VESTING_SCHEDULE = [
  { day: '0', released: 50_000_000 },
  { day: '30', released: 80_000_000 },
  { day: '60', released: 120_000_000 },
  { day: '90', released: 170_000_000 },
  { day: '120', released: 230_000_000 },
  { day: '180', released: 340_000_000 },
  { day: '240', released: 460_000_000 },
  { day: '300', released: 580_000_000 },
  { day: '360', released: 700_000_000 },
  { day: '480', released: 850_000_000 },
  { day: '600', released: 950_000_000 },
  { day: '720', released: 1_000_000_000 },
];

export const MOCK_ALLOCATION_DATA = [
  { name: 'Public Sale', value: 20, color: '#3b82f6' },
  { name: 'Private Sale', value: 15, color: '#8b5cf6' },
  { name: 'Team & Advisors', value: 15, color: '#06b6d4' },
  { name: 'Ecosystem & Rewards', value: 20, color: '#d4a847' },
  { name: 'Liquidity Pool', value: 10, color: '#22c55e' },
  { name: 'Reserve', value: 10, color: '#ef4444' },
  { name: 'Treasury', value: 10, color: '#E8D613' },
];
