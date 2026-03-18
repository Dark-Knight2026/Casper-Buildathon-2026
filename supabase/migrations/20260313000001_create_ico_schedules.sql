-- ICO schedule data from ICOScheduleAdded contract events.
-- Replaces hardcoded ICO_PRICE_USD / ICO_TOTAL_ALLOCATION env vars.

CREATE TABLE IF NOT EXISTS ico_schedules (
    -- Schedule ID from the contract (ICOScheduleId).
    schedule_id       TEXT        PRIMARY KEY,
    -- Unix timestamp: sale window start.
    start_timestamp   BIGINT      NOT NULL,
    -- Unix timestamp: sale window end.
    end_timestamp     BIGINT      NOT NULL,
    -- Total allocation for this round (U256 as TEXT, minimal units, decimals=18).
    sale_amount       TEXT        NOT NULL,
    -- Token price (U256 as TEXT, 6 decimals like USDC/USDT; 500000 = $0.50).
    price             TEXT        NOT NULL,
    -- Deploy hash that emitted the event.
    transaction_hash  TEXT        NOT NULL,
    -- Block height where the event was included.
    block_height      BIGINT      NOT NULL,
    -- Row creation timestamp.
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Last UPSERT timestamp (audit trail).
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  ico_schedules IS 'ICO round schedules indexed from ICOScheduleAdded contract events';
COMMENT ON COLUMN ico_schedules.price IS 'Token price with 6 decimals (500000 = $0.50)';
COMMENT ON COLUMN ico_schedules.sale_amount IS 'Total allocation in minimal units (decimals=18)';
