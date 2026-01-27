/**
 * ICO Page Types
 * Key Chain Token (BIG) - Casper Network (CEP-18)
 */

// ICO State enum (1-5 based on whitepaper)
export type ICOState = 1 | 2 | 3 | 4 | 5;

// State phase names for readability
export type ICOPhase =
  | 'presale-countdown'    // State 1
  | 'presale-active'       // State 2
  | 'dashboard-ico-countdown' // State 3
  | 'ico-active'           // State 4
  | 'post-ico';            // State 5

// Payment methods supported
export type PaymentMethod = 'USDC' | 'USDT' | 'CARD';

// Token types on Casper
export type TokenType = 'CSPR' | 'USDC' | 'USDT' | 'BIG';

// Sale timestamps
export interface SaleTimestamps {
  presaleStart: number;
  presaleEnd: number;
  icoStart: number;
  icoEnd: number;
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
  paymentMethod: PaymentMethod;
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
  paymentMethod: PaymentMethod;
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

// Hook return types
export interface UseICOStateReturn {
  state: ICOState;
  phase: ICOPhase;
  isLoading: boolean;
  error: Error | null;
  timestamps: SaleTimestamps | null;
  refetch: () => void;
}

export interface UseCountdownReturn {
  time: CountdownTime;
  isExpired: boolean;
  targetDate: Date | null;
}
