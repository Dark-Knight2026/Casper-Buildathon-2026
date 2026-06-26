-- Drop legacy fiat-style payment tables (no Rust references; replaced by the
-- invoice model that mirrors the on-chain Escrow contract).
-- payment_receipts has a FK to payments, so it is dropped first.
DROP TABLE IF EXISTS payment_receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;

-- app_1fa2dc8566_lease_payment_schedules uses payment_status; drop it first.
DROP TABLE IF EXISTS app_1fa2dc8566_lease_payment_schedules CASCADE;

-- payment_status and payment_method ENUM types were created in 20251214000001.
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS payment_method;
