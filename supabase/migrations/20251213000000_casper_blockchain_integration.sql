-- Casper Network Blockchain Integration
-- Database schema for hybrid blockchain + Supabase architecture

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE EXTENSION
-- ============================================

-- Add blockchain-related columns to existing users table
ALTER TABLE IF EXISTS user_profiles
ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cspr_name TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blockchain_reputation_score INTEGER DEFAULT 0;

-- Add constraints
ALTER TABLE IF EXISTS user_profiles
ADD CONSTRAINT valid_wallet_address CHECK (wallet_address IS NULL OR length(wallet_address) = 68),
ADD CONSTRAINT valid_cspr_name CHECK (cspr_name IS NULL OR cspr_name ~ '^[a-z0-9-]+\.cspr$');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_cspr_name ON user_profiles(cspr_name);

-- ============================================
-- PROPERTIES TABLE EXTENSION
-- ============================================

-- Add blockchain-related columns to existing properties table
ALTER TABLE IF EXISTS properties
ADD COLUMN IF NOT EXISTS nft_token_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS nft_contract_hash TEXT,
ADD COLUMN IF NOT EXISTS owner_wallet TEXT,
ADD COLUMN IF NOT EXISTS is_tokenized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fractional_token_contract TEXT,
ADD COLUMN IF NOT EXISTS fractional_token_symbol TEXT,
ADD COLUMN IF NOT EXISTS total_fractional_supply BIGINT,
ADD COLUMN IF NOT EXISTS valuation_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS valuation_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS tokenized_at TIMESTAMPTZ;

-- Add constraints
ALTER TABLE IF EXISTS properties
ADD CONSTRAINT valid_nft_token_id CHECK (nft_token_id IS NULL OR length(nft_token_id) > 0),
ADD CONSTRAINT tokenization_consistency CHECK (
  (is_tokenized = FALSE AND nft_token_id IS NULL) OR
  (is_tokenized = TRUE AND nft_token_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_nft_token_id ON properties(nft_token_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_tokenized ON properties(is_tokenized);

-- ============================================
-- LEASES TABLE EXTENSION
-- ============================================

-- Add smart contract columns to existing leases table
ALTER TABLE IF EXISTS leases
ADD COLUMN IF NOT EXISTS smart_contract_address TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS monthly_rent_cspr DECIMAL(30, 9),
ADD COLUMN IF NOT EXISTS security_deposit_cspr DECIMAL(30, 9),
ADD COLUMN IF NOT EXISTS is_smart_contract BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contract_deployed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS next_payment_date DATE,
ADD COLUMN IF NOT EXISTS total_payments_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_payment_count INTEGER DEFAULT 0;

-- Add constraint
ALTER TABLE IF EXISTS leases
ADD CONSTRAINT smart_contract_consistency CHECK (
  (is_smart_contract = FALSE AND smart_contract_address IS NULL) OR
  (is_smart_contract = TRUE AND smart_contract_address IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leases_smart_contract ON leases(smart_contract_address);
CREATE INDEX IF NOT EXISTS idx_leases_next_payment ON leases(next_payment_date);

-- ============================================
-- BLOCKCHAIN TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_hash TEXT UNIQUE NOT NULL,
  deploy_hash TEXT UNIQUE,
  block_number BIGINT,
  block_hash TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'property_mint', 'property_transfer', 'fractional_mint', 'fractional_transfer',
    'lease_create', 'rent_payment', 'deposit_escrow', 'deposit_release',
    'token_purchase', 'dividend_distribution', 'name_registration'
  )),
  from_address TEXT NOT NULL,
  to_address TEXT,
  amount DECIMAL(30, 9),
  currency TEXT DEFAULT 'CSPR',
  gas_fee DECIMAL(30, 9),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  confirmations INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_transaction_hash CHECK (length(transaction_hash) = 64)
);

-- Create indexes
CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX idx_blockchain_tx_type ON blockchain_transactions(transaction_type);
CREATE INDEX idx_blockchain_tx_status ON blockchain_transactions(status);
CREATE INDEX idx_blockchain_tx_property ON blockchain_transactions(property_id);
CREATE INDEX idx_blockchain_tx_user ON blockchain_transactions(user_id);
CREATE INDEX idx_blockchain_tx_created ON blockchain_transactions(created_at DESC);

-- ============================================
-- FRACTIONAL OWNERSHIP TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS fractional_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  token_contract_address TEXT UNIQUE NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  total_supply BIGINT NOT NULL,
  decimals INTEGER DEFAULT 0,
  token_price_usd DECIMAL(15, 2) NOT NULL,
  token_price_cspr DECIMAL(30, 9) NOT NULL,
  tokens_sold BIGINT DEFAULT 0,
  total_holders INTEGER DEFAULT 0,
  annual_yield_percentage DECIMAL(5, 2),
  last_dividend_distribution TIMESTAMPTZ,
  total_dividends_distributed DECIMAL(30, 9) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_supply CHECK (total_supply > 0),
  CONSTRAINT valid_sold CHECK (tokens_sold <= total_supply)
);

-- Create indexes
CREATE INDEX idx_fractional_property ON fractional_ownership(property_id);
CREATE INDEX idx_fractional_contract ON fractional_ownership(token_contract_address);
CREATE INDEX idx_fractional_status ON fractional_ownership(status);

-- ============================================
-- TOKEN HOLDINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS token_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fractional_ownership_id UUID NOT NULL REFERENCES fractional_ownership(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  token_balance BIGINT NOT NULL DEFAULT 0,
  percentage_owned DECIMAL(10, 6) NOT NULL,
  total_invested_usd DECIMAL(15, 2) NOT NULL,
  total_invested_cspr DECIMAL(30, 9) NOT NULL,
  total_dividends_received DECIMAL(30, 9) DEFAULT 0,
  acquisition_date TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(fractional_ownership_id, user_id),
  CONSTRAINT valid_balance CHECK (token_balance >= 0),
  CONSTRAINT valid_percentage CHECK (percentage_owned >= 0 AND percentage_owned <= 100)
);

-- Create indexes
CREATE INDEX idx_token_holdings_user ON token_holdings(user_id);
CREATE INDEX idx_token_holdings_fractional ON token_holdings(fractional_ownership_id);
CREATE INDEX idx_token_holdings_wallet ON token_holdings(wallet_address);

-- ============================================
-- BLOCKCHAIN EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blockchain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(transaction_hash, event_type, contract_address)
);

-- Create indexes
CREATE INDEX idx_blockchain_events_type ON blockchain_events(event_type);
CREATE INDEX idx_blockchain_events_contract ON blockchain_events(contract_address);
CREATE INDEX idx_blockchain_events_processed ON blockchain_events(processed);
CREATE INDEX idx_blockchain_events_block ON blockchain_events(block_number DESC);

-- ============================================
-- CSPR PRICE HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cspr_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_usd DECIMAL(15, 6) NOT NULL,
  price_eur DECIMAL(15, 6),
  price_gbp DECIMAL(15, 6),
  volume_24h DECIMAL(20, 2),
  market_cap DECIMAL(20, 2),
  source TEXT DEFAULT 'cspr.cloud',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(timestamp, source)
);

-- Create index
CREATE INDEX idx_cspr_price_timestamp ON cspr_price_history(timestamp DESC);

-- ============================================
-- WALLET CONNECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_custodial BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  UNIQUE(user_id, wallet_address)
);

-- Create indexes
CREATE INDEX idx_wallet_connections_user ON wallet_connections(user_id);
CREATE INDEX idx_wallet_connections_wallet ON wallet_connections(wallet_address);

-- ============================================
-- CSPR NAMES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cspr_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  account_hash TEXT NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  registration_tx_hash TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cspr_names_name ON cspr_names(name);
CREATE INDEX idx_cspr_names_account ON cspr_names(account_hash);
CREATE INDEX idx_cspr_names_user ON cspr_names(user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to fractional_ownership
CREATE TRIGGER update_fractional_ownership_updated_at
  BEFORE UPDATE ON fractional_ownership
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to token_holdings
CREATE TRIGGER update_token_holdings_updated_at
  BEFORE UPDATE ON token_holdings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate token percentage
CREATE OR REPLACE FUNCTION update_token_percentage()
RETURNS TRIGGER AS $$
DECLARE
  v_total_supply BIGINT;
BEGIN
  SELECT total_supply INTO v_total_supply
  FROM fractional_ownership
  WHERE id = NEW.fractional_ownership_id;
  
  NEW.percentage_owned := (NEW.token_balance::DECIMAL / v_total_supply::DECIMAL) * 100;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to token_holdings
CREATE TRIGGER update_token_holdings_percentage
  BEFORE INSERT OR UPDATE ON token_holdings
  FOR EACH ROW EXECUTE FUNCTION update_token_percentage();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fractional_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cspr_names ENABLE ROW LEVEL SECURITY;

-- Blockchain transactions policies
CREATE POLICY "Users can view own transactions" ON blockchain_transactions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (wallet_address = from_address OR wallet_address = to_address)
    )
  );

-- Fractional ownership policies
CREATE POLICY "Public can view active fractional ownership" ON fractional_ownership
  FOR SELECT USING (status = 'active');

CREATE POLICY "Property owners can manage fractional ownership" ON fractional_ownership
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE id = fractional_ownership.property_id
      AND owner_id = auth.uid()
    )
  );

-- Token holdings policies
CREATE POLICY "Users can view own holdings" ON token_holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Property owners can view all holders" ON token_holdings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fractional_ownership fo
      JOIN properties p ON p.id = fo.property_id
      WHERE fo.id = token_holdings.fractional_ownership_id
      AND p.owner_id = auth.uid()
    )
  );

-- Wallet connections policies
CREATE POLICY "Users can manage own wallet connections" ON wallet_connections
  FOR ALL USING (auth.uid() = user_id);

-- CSPR names policies
CREATE POLICY "Public can view CSPR names" ON cspr_names
  FOR SELECT USING (true);

CREATE POLICY "Users can register CSPR names" ON cspr_names
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert initial CSPR price (mock data)
INSERT INTO cspr_price_history (price_usd, price_eur, price_gbp, source)
VALUES (0.045, 0.041, 0.035, 'cspr.cloud')
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE blockchain_transactions IS 'Stores all blockchain transactions for audit trail and reporting';
COMMENT ON TABLE fractional_ownership IS 'Manages fractional ownership tokens (CEP-18) for properties';
COMMENT ON TABLE token_holdings IS 'Tracks individual investor holdings of fractional tokens';
COMMENT ON TABLE blockchain_events IS 'Stores raw blockchain events for processing';
COMMENT ON TABLE cspr_price_history IS 'Historical CSPR exchange rates for financial calculations';
COMMENT ON TABLE wallet_connections IS 'Manages multiple wallet connections per user';
COMMENT ON TABLE cspr_names IS 'Registry of CSPR.name identities linked to users';