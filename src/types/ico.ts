/**
 * ICO Page Types
 * Key Chain Token (BIG) - Casper Network (CEP-18)
 */

// ICO state: 1 = upcoming, 2 = active, 3 = ended
export type ICOState = 1 | 2 | 3;

// State phase names for readability
export type ICOPhase =
  | 'private-sale-countdown'    // State 1
  | 'private-sale-active'       // State 2
  | 'post-ico-dashboard';       // State 3
// Payment currencies supported
export type PaymentCurrency = 'USDT' | 'USDC' | 'CSPR';

// Token types on Casper
export type TokenType = 'CSPR' | 'USDC' | 'USDT' | 'BIG';

// Sale timestamps
export interface SaleTimestamps {
  presaleStart: number;
  presaleEnd: number;
}

// Current sale status
export interface SaleStatus {
  state: ICOState;
  phase: ICOPhase;
  isActive: boolean;
  currentTimestamp: number;
  nextStateTimestamp: number | null;
}

// Token purchase record
export interface Purchase {
  deployHash: string;
  timestamp: number;
  paymentMethod: PaymentCurrency;
  paymentAmount: string;
  tokenAmount: string;
  status: 'pending' | 'confirmed' | 'failed';
}

// Investor dashboard data
export interface InvestorDashboardData {
  bigInWallet: string;
  bigStaked: string;
  rewardsEarned: string;
  totalBig: string;
  estimatedUsdcValue: string;
}

// Sale progress data
export interface SaleProgress {
  totalAllocation: string;
  tokensSold: string;
  tokensRemaining: string;
  percentageSold: number;
  amountRaised: string;
  targetAmount: string;
}

// Token info for display
export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  currentPrice: string;
  priceChange24h?: number;
}

// Countdown time breakdown
export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

// Wallet connection state
export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  balance: {
    cspr: string;
    usdc: string;
    usdt: string;
    big: string;
  };
}

// Staking info
export interface StakingInfo {
  stakedBalance: string;
  rewardsEarned: string;
  apy: number;
  stakingStartDate: number | null;
}

// Transaction history item
export interface TransactionHistoryItem {
  id: string;
  deployHash: string;
  type: 'purchase' | 'stake' | 'unstake' | 'reward_claim' | 'transfer';
  timestamp: number;
  amount: string;
  tokenSymbol: TokenType;
  status: 'pending' | 'confirmed' | 'failed';
  explorerUrl: string;
}

// Tokenomics distribution
export interface TokenomicsAllocation {
  category: string;
  percentage: number;
  amount: string;
  vestingPeriod?: string;
  color: string;
}

// ICO Page tabs
export type ICOTab = 'main' | 'tokenomics' | 'rewards' | 'whitepaper';

// Purchase form data
export interface PurchaseFormData {
  paymentMethod: PaymentCurrency;
  amount: string;
  estimatedTokens: string;
}

// API response types
export interface ICOStateResponse {
  state: ICOState;
  phase: ICOPhase;
  timestamps: SaleTimestamps;
  currentPrice: string;
  progress: SaleProgress;
}

// Backend API response types
export interface IcoBalanceResponse {
  tokensPurchased: string;
  totalSpentUSD: number;
  tokenPrice: number;
  tokenSymbol: string;
  currentValue: number;
}

export interface IcoProgressResponse {
  tokensSold: string;
  totalAllocation: string;
  tokensRemaining: string;
  amountRaised: number;
  hardCapUsd: number;
  priceUsd: number;
  percentSold: number;
}

// Hook return types
export interface UseCountdownReturn {
  time: CountdownTime;
  isExpired: boolean;
  targetDate: Date | null;
}
