-- On-chain registration columns: the user's id in the UserRegistry contract
-- and the lifecycle of that registration. Written by the indexer when it
-- observes a UserCreated event, matched to the account by wallet.
--
-- Permanent schema: these columns stay regardless of who calls
-- UserRegistry::create_user (the frontend for now, a backend
-- writer later) - the contract assigns the id and the indexer records it here.
--
-- onchain_user_id: the contract-assigned user id (a U256). NUMERIC, not
-- BIGINT, because the on-chain id can exceed i64. Nullable until the indexer
-- observes the UserCreated event; UNIQUE so two backend users can never map
-- to the same on-chain record (a UNIQUE constraint permits many NULLs in
-- Postgres, so unregistered users do not collide).
--
-- onchain_status: lifecycle of the on-chain record, written by the indexer
-- ('active' once UserCreated is seen). 'pending' is reserved for a future
-- frontend-initiated marker; today the column stays NULL until the indexer
-- sets it.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onchain_user_id NUMERIC,
    ADD COLUMN IF NOT EXISTS onchain_status TEXT;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_onchain_user_id_key;

ALTER TABLE users
    ADD CONSTRAINT users_onchain_user_id_key UNIQUE (onchain_user_id);

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_onchain_status_check;

ALTER TABLE users
    ADD CONSTRAINT users_onchain_status_check
    CHECK (onchain_status IN ('pending', 'active'));

COMMENT ON COLUMN users.onchain_user_id IS
    'Contract-assigned UserRegistry id (U256), written by the indexer from the UserCreated event; NULL until observed on-chain.';
COMMENT ON COLUMN users.onchain_status IS
    'On-chain registration lifecycle: pending | active; set to active by the indexer when UserCreated is observed.';
