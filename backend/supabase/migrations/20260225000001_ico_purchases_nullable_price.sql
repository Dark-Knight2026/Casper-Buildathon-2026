-- Make ico_purchases.price nullable.
--
-- Price is not available when a TokensPurchased event is reconstructed
-- via ICO backfill (node RPC does not expose the price arg). Storing an
-- empty string is misleading; NULL correctly signals "unknown".

ALTER TABLE ico_purchases ALTER COLUMN price DROP NOT NULL;
