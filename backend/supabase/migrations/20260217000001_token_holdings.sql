-- Current token balances for CEP-18 token holders.
--
-- Updated atomically on every Transfer and TokensPurchased event.
-- U256 amounts are stored as TEXT to support arbitrarily large numbers.
DROP TABLE IF EXISTS token_holdings;

CREATE TABLE token_holdings
(
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_address    TEXT        NOT NULL,
    token_type      TEXT        NOT NULL, -- 'BIG', 'USDC', 'USDT'
    balance         TEXT        NOT NULL, -- U256 stored as decimal string
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT token_holdings_unique UNIQUE (user_address, token_type)
);

CREATE INDEX idx_token_holdings_user    ON token_holdings (user_address);
CREATE INDEX idx_token_holdings_token   ON token_holdings (token_type);
CREATE INDEX idx_token_holdings_updated ON token_holdings (last_updated_at DESC);

COMMENT ON TABLE  token_holdings         IS 'Current CEP-18 token balances per user, maintained by the indexer';
COMMENT ON COLUMN token_holdings.balance IS 'U256 stored as a decimal string to support values beyond i64/f64 range';
