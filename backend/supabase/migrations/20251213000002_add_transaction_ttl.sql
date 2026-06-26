-- Add expires_at column to blockchain_transactions for TTL tracking
ALTER TABLE IF EXISTS blockchain_transactions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Update status check constraint to include 'expired' status
-- We first drop the existing constraint if we can identify it, or just add the new value to the check
-- Since modifying a check constraint usually requires dropping and recreating, we'll do that.
-- Note: The name 'blockchain_transactions_status_check' is standard but might vary if auto-generated.
-- We will try to drop the specific named constraint if it exists, otherwise we rely on the new constraint.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blockchain_transactions_status_check') THEN 
        ALTER TABLE blockchain_transactions DROP CONSTRAINT blockchain_transactions_status_check; 
    END IF; 
END $$;

ALTER TABLE blockchain_transactions 
ADD CONSTRAINT blockchain_transactions_status_check 
CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled', 'expired'));

-- Create index for faster expiration checks
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_expires_at ON blockchain_transactions(expires_at) WHERE status = 'pending';

-- Function to mark expired transactions
-- This function identifies pending transactions that have passed their expiration time
-- and marks them as 'expired'.
CREATE OR REPLACE FUNCTION mark_expired_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (admin) to ensure it can update all rows
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH expired_rows AS (
    UPDATE blockchain_transactions
    SET 
      status = 'expired',
      failed_at = NOW(),
      error_message = 'Transaction TTL expired'
    WHERE 
      status = 'pending' 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT count(*) INTO updated_count FROM expired_rows;
  
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION mark_expired_transactions IS 'Scans for pending transactions past their TTL and marks them as expired';