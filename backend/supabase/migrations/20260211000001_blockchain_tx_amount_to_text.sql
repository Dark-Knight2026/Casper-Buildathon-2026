-- Change blockchain_transactions.amount from DECIMAL(30,9) to TEXT.
--
-- U256 values from Casper smart contracts can exceed the 28-digit precision
-- of DECIMAL. Storing as TEXT (consistent with ico_purchases) avoids silent
-- truncation. Raw event data in blockchain_events.event_data JSONB is always
-- preserved as a safety net.

ALTER TABLE blockchain_transactions
    ALTER COLUMN amount TYPE TEXT USING amount::TEXT;
