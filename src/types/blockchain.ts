/**
 * Blockchain Type Definitions
 * Comprehensive types for Casper Network integration
 */

// ============ Property NFT Types (CEP-78) ============

export interface PropertyMetadata {
  property_address: string;
  property_type: 'residential' | 'commercial' | 'industrial' | 'mixed';
  square_footage: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built: number;
  valuation: number;
  valuation_currency: string;
  images: string[];
  legal_description: string;
  parcel_id: string;
}

export interface OwnershipRecord {
  previous_owner: string;
  new_owner: string;
  transfer_date: number;
  transaction_hash: string;
  sale_price?: number;
}

export interface PropertyNFT {
  token_id: string;
  owner: string;
  metadata: PropertyMetadata;
  ownership_history: OwnershipRecord[];
  created_at: number;
  updated_at: number;
}

// ============ Fractional Ownership Types (CEP-18) ============

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  acquisition_date: number;
}

export interface DividendRecord {
  distribution_date: number;
  total_amount: number;
  amount_per_token: number;
  transaction_hash: string;
}

export interface FractionalToken {
  token_name: string;
  token_symbol: string;
  total_supply: number;
  decimals: number;
  property_nft_id: string;
  token_price: number;
  currency: string;
  holders: TokenHolder[];
  dividend_distribution: DividendRecord[];
}

// ============ Smart Lease Types ============

export interface PaymentRecord {
  payment_date: number;
  amount: number;
  transaction_hash: string;
  block_number: number;
  status: 'pending' | 'confirmed' | 'failed';
  late_fee?: number;
}

export interface SmartLease {
  contract_address: string;
  property_nft_id: string;
  landlord: string;
  tenant: string;
  monthly_rent: number;
  security_deposit: number;
  lease_start: number;
  lease_end: number;
  payment_day: number;
  auto_renewal: boolean;
  payment_history: PaymentRecord[];
  status: 'active' | 'expired' | 'terminated';
  created_at: number;
}

// ============ Database Types (Supabase) ============

export interface UserProfile {
  id: string;
  email: string;
  wallet_address?: string;
  cspr_name?: string;
  role: 'agent' | 'landlord' | 'tenant' | 'investor';
  kyc_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
  blockchain_reputation_score?: number;
}

export interface Property {
  id: string;
  nft_token_id?: string;
  nft_contract_hash?: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  status: 'available' | 'leased' | 'tokenized' | 'fractional';
  owner_id: string;
  owner_wallet?: string;
  is_tokenized: boolean;
  fractional_token_address?: string;
  fractional_token_symbol?: string;
  total_fractional_supply?: number;
  valuation_amount?: number;
  valuation_currency?: string;
  square_footage?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  tokenized_at?: string;
}

export interface Lease {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  smart_contract_address?: string;
  monthly_rent_amount: number;
  monthly_rent_cspr?: number;
  security_deposit_amount: number;
  security_deposit_cspr?: number;
  currency: string;
  lease_start_date: string;
  lease_end_date: string;
  payment_day_of_month: number;
  auto_renewal: boolean;
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated' | 'on_chain';
  is_smart_contract: boolean;
  contract_deployed_at?: string;
  last_payment_date?: string;
  next_payment_date?: string;
  total_payments_made: number;
  late_payment_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'property_mint'
  | 'property_transfer'
  | 'fractional_mint'
  | 'fractional_transfer'
  | 'lease_create'
  | 'rent_payment'
  | 'deposit_escrow'
  | 'deposit_release'
  | 'token_purchase'
  | 'dividend_distribution'
  | 'name_registration';

export interface BlockchainTransaction {
  id: string;
  transaction_hash: string;
  deploy_hash?: string;
  block_number?: number;
  block_hash?: string;
  transaction_type: TransactionType;
  from_address: string;
  to_address?: string;
  amount?: number;
  currency: string;
  gas_fee?: number;
  property_id?: string;
  lease_id?: string;
  user_id?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  confirmations: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  confirmed_at?: string;
  failed_at?: string;
}

export interface FractionalOwnership {
  id: string;
  property_id: string;
  token_contract_address: string;
  token_name: string;
  token_symbol: string;
  total_supply: number;
  decimals: number;
  token_price_usd: number;
  token_price_cspr: number;
  tokens_sold: number;
  total_holders: number;
  annual_yield_percentage?: number;
  last_dividend_distribution?: string;
  total_dividends_distributed: number;
  status: 'active' | 'paused' | 'closed';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TokenHolding {
  id: string;
  fractional_ownership_id: string;
  user_id: string;
  wallet_address: string;
  token_balance: number;
  percentage_owned: number;
  total_invested_usd: number;
  total_invested_cspr: number;
  total_dividends_received: number;
  acquisition_date: string;
  last_updated: string;
}

// ============ API Request/Response Types ============

export interface TokenizePropertyRequest {
  property_id: string;
  metadata: PropertyMetadata;
  fractional: boolean;
  total_supply?: number;
}

export interface TokenizePropertyResponse {
  transaction_hash: string;
  status: 'pending';
  estimated_confirmation_time: string;
}

export interface CreateSmartLeaseRequest {
  property_id: string;
  tenant_id: string;
  lease_terms: {
    monthly_rent: number;
    security_deposit: number;
    lease_start: string;
    lease_end: string;
    payment_day: number;
    auto_renewal: boolean;
  };
}

export interface CreateSmartLeaseResponse {
  contract_address: string;
  transaction_hash: string;
  status: 'confirmed';
}

export interface PurchaseTokensRequest {
  property_id: string;
  token_contract_address: string;
  token_quantity: number;
  total_amount: number;
}

export interface PurchaseTokensResponse {
  transaction_hash: string;
  tokens_purchased: number;
  new_balance: number;
  ownership_percentage: number;
}

export interface TransactionStatusResponse {
  transaction_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  block_number?: number;
  error_message?: string;
}

// ============ Wallet Types ============

export interface WalletConnection {
  wallet_address: string;
  account_hash: string;
  cspr_name?: string;
  provider: string;
  balance?: number;
}

export interface WalletInfo {
  wallet_address: string;
  cspr_name?: string;
  balance: number;
  nfts: PropertyNFT[];
  tokens: FractionalToken[];
}

// ============ Marketplace Types ============

export interface MarketplaceProperty {
  id: string;
  address: string;
  valuation: number;
  token_symbol: string;
  token_price: number;
  available_tokens: number;
  total_tokens: number;
  annual_yield: number;
  images: string[];
  property_type: string;
  city: string;
  state: string;
}

export interface InvestorPortfolio {
  total_investment: number;
  total_properties: number;
  monthly_income: number;
  total_returns: number;
  positions: Array<{
    property_id: string;
    property_address: string;
    token_balance: number;
    ownership_percentage: number;
    current_value: number;
    total_dividends: number;
  }>;
}

// ============ Event Types ============

export interface BlockchainEvent {
  event_type: 'transfer' | 'nft_mint' | 'nft_transfer' | 'contract_event' | 'block' | 'rent_payment' | 'deposit_release';
  contract_address?: string;
  transaction_hash: string;
  block_number: number;
  data: Record<string, unknown>;
  timestamp?: number;
}

// ============ Sync Types ============

export interface SyncStatus {
  id: string;
  entity_type: 'property' | 'lease' | 'transaction';
  entity_id: string;
  blockchain_hash?: string;
  last_sync_at: string;
  sync_status: 'synced' | 'pending' | 'failed';
  error_message?: string;
  retry_count?: number;
}

// ============ Exchange Rate Types ============

export interface CSPRPriceHistory {
  id: string;
  price_usd: number;
  price_eur?: number;
  price_gbp?: number;
  volume_24h?: number;
  market_cap?: number;
  source: string;
  timestamp: string;
}