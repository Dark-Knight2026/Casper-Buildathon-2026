-- ============================================================
-- Migration: Add transform_idx to ico_purchases
-- Description: Adds transform_idx column and widens the unique
--              constraint to (transaction_hash, transform_idx)
--              so multiple TokensPurchased events from the same
--              deploy are recorded instead of silently dropped.
-- Created: 2026-03-27
-- ============================================================

-- Add the column (nullable for existing rows).
ALTER TABLE ico_purchases
    ADD COLUMN IF NOT EXISTS transform_idx INTEGER;

-- Drop the old narrow unique constraint on transaction_hash alone.
ALTER TABLE ico_purchases
    DROP CONSTRAINT IF EXISTS ico_purchases_transaction_hash_key;

-- Create a wider unique index that distinguishes intra-deploy events.
-- A unique INDEX (not CONSTRAINT) is required because COALESCE is an expression.
-- Sentinel -1 avoids collision with real transform_idx = 0.
CREATE UNIQUE INDEX ico_purchases_tx_hash_transform_idx_key
    ON ico_purchases (transaction_hash, COALESCE(transform_idx, -1));
