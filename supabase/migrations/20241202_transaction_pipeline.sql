-- Migration: Transaction Pipeline Visualizer
-- Description: Add pipeline stage tracking and milestone management to transactions
-- Date: 2024-12-02

-- ============================================================================
-- PART 1: Modify existing transactions table
-- ============================================================================

-- Add pipeline-related columns to transactions table
ALTER TABLE app_a5f54_transactions 
ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'lead',
ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS estimated_close_date DATE,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS probability_percent INTEGER CHECK (probability_percent >= 0 AND probability_percent <= 100) DEFAULT 50,
ADD COLUMN IF NOT EXISTS stalled_reason TEXT,
ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb;

-- Create indexes for pipeline queries
CREATE INDEX IF NOT EXISTS idx_transactions_pipeline_stage ON app_a5f54_transactions(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_transactions_agent_stage ON app_a5f54_transactions(agent_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_transactions_close_date ON app_a5f54_transactions(estimated_close_date);

-- Add constraint for valid pipeline stages
ALTER TABLE app_a5f54_transactions 
DROP CONSTRAINT IF EXISTS valid_pipeline_stage;

ALTER TABLE app_a5f54_transactions 
ADD CONSTRAINT valid_pipeline_stage 
CHECK (pipeline_stage IN ('lead', 'showing', 'offer', 'under_contract', 'closing', 'closed', 'lost'));

-- ============================================================================
-- PART 2: Create pipeline milestones table
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_a5f54_pipeline_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES app_a5f54_transactions(id) ON DELETE CASCADE NOT NULL,
  milestone_type VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'waived')),
  due_date DATE,
  completed_date DATE,
  notes TEXT,
  assigned_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for milestones
CREATE INDEX idx_pipeline_milestones_transaction ON app_a5f54_pipeline_milestones(transaction_id);
CREATE INDEX idx_pipeline_milestones_status ON app_a5f54_pipeline_milestones(status);
CREATE INDEX idx_pipeline_milestones_due ON app_a5f54_pipeline_milestones(due_date);

-- Enable Row Level Security
ALTER TABLE app_a5f54_pipeline_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestones
CREATE POLICY "agents_view_own_milestones" ON app_a5f54_pipeline_milestones
  FOR SELECT TO authenticated
  USING (
    transaction_id IN (
      SELECT id FROM app_a5f54_transactions WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "agents_insert_own_milestones" ON app_a5f54_pipeline_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM app_a5f54_transactions WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "agents_update_own_milestones" ON app_a5f54_pipeline_milestones
  FOR UPDATE TO authenticated
  USING (
    transaction_id IN (
      SELECT id FROM app_a5f54_transactions WHERE agent_id = auth.uid()
    )
  );

CREATE POLICY "agents_delete_own_milestones" ON app_a5f54_pipeline_milestones
  FOR DELETE TO authenticated
  USING (
    transaction_id IN (
      SELECT id FROM app_a5f54_transactions WHERE agent_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 3: Create helper function for stage history tracking
-- ============================================================================

CREATE OR REPLACE FUNCTION update_transaction_stage_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if pipeline_stage has changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Calculate duration in the old stage
    NEW.stage_history = COALESCE(OLD.stage_history, '[]'::jsonb) || 
      jsonb_build_object(
        'stage', OLD.pipeline_stage,
        'entered_at', OLD.stage_entered_at,
        'exited_at', NOW(),
        'duration_days', EXTRACT(DAY FROM (NOW() - OLD.stage_entered_at))
      );
    
    -- Update stage_entered_at to current time
    NEW.stage_entered_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stage history tracking
DROP TRIGGER IF EXISTS transaction_stage_history_trigger ON app_a5f54_transactions;

CREATE TRIGGER transaction_stage_history_trigger
  BEFORE UPDATE ON app_a5f54_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_stage_history();

-- ============================================================================
-- PART 4: Create view for pipeline summary statistics
-- ============================================================================

CREATE OR REPLACE VIEW app_a5f54_pipeline_summary AS
SELECT 
  agent_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN pipeline_stage NOT IN ('closed', 'lost') THEN amount ELSE 0 END) as total_pipeline_value,
  SUM(CASE WHEN pipeline_stage NOT IN ('closed', 'lost') THEN commission_amount ELSE 0 END) as total_pipeline_commission,
  
  -- Count by stage
  COUNT(*) FILTER (WHERE pipeline_stage = 'lead') as lead_count,
  COUNT(*) FILTER (WHERE pipeline_stage = 'showing') as showing_count,
  COUNT(*) FILTER (WHERE pipeline_stage = 'offer') as offer_count,
  COUNT(*) FILTER (WHERE pipeline_stage = 'under_contract') as under_contract_count,
  COUNT(*) FILTER (WHERE pipeline_stage = 'closing') as closing_count,
  COUNT(*) FILTER (WHERE pipeline_stage = 'closed') as closed_count,
  COUNT(*) FILTER (WHERE pipeline_stage = 'lost') as lost_count,
  
  -- Value by stage
  SUM(amount) FILTER (WHERE pipeline_stage = 'lead') as lead_value,
  SUM(amount) FILTER (WHERE pipeline_stage = 'showing') as showing_value,
  SUM(amount) FILTER (WHERE pipeline_stage = 'offer') as offer_value,
  SUM(amount) FILTER (WHERE pipeline_stage = 'under_contract') as under_contract_value,
  SUM(amount) FILTER (WHERE pipeline_stage = 'closing') as closing_value,
  SUM(amount) FILTER (WHERE pipeline_stage = 'closed') as closed_value,
  
  -- Average days in each stage
  AVG(EXTRACT(DAY FROM (NOW() - stage_entered_at))) FILTER (WHERE pipeline_stage = 'lead') as avg_days_in_lead,
  AVG(EXTRACT(DAY FROM (NOW() - stage_entered_at))) FILTER (WHERE pipeline_stage = 'showing') as avg_days_in_showing,
  AVG(EXTRACT(DAY FROM (NOW() - stage_entered_at))) FILTER (WHERE pipeline_stage = 'offer') as avg_days_in_offer,
  AVG(EXTRACT(DAY FROM (NOW() - stage_entered_at))) FILTER (WHERE pipeline_stage = 'under_contract') as avg_days_in_under_contract,
  AVG(EXTRACT(DAY FROM (NOW() - stage_entered_at))) FILTER (WHERE pipeline_stage = 'closing') as avg_days_in_closing
FROM app_a5f54_transactions
GROUP BY agent_id;

-- ============================================================================
-- PART 5: Create function to identify stalled deals
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stalled_deals(p_agent_id UUID)
RETURNS TABLE (
  transaction_id UUID,
  property_address TEXT,
  client_name TEXT,
  pipeline_stage VARCHAR(50),
  days_in_stage INTEGER,
  amount DECIMAL(12,2),
  stalled_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.property_address,
    t.client_name,
    t.pipeline_stage,
    EXTRACT(DAY FROM (NOW() - t.stage_entered_at))::INTEGER as days_in_stage,
    t.amount,
    t.stalled_reason
  FROM app_a5f54_transactions t
  WHERE t.agent_id = p_agent_id
    AND t.pipeline_stage NOT IN ('closed', 'lost')
    AND (
      (t.pipeline_stage = 'lead' AND EXTRACT(DAY FROM (NOW() - t.stage_entered_at)) > 14) OR
      (t.pipeline_stage = 'showing' AND EXTRACT(DAY FROM (NOW() - t.stage_entered_at)) > 10) OR
      (t.pipeline_stage = 'offer' AND EXTRACT(DAY FROM (NOW() - t.stage_entered_at)) > 7) OR
      (t.pipeline_stage = 'under_contract' AND EXTRACT(DAY FROM (NOW() - t.stage_entered_at)) > 30) OR
      (t.pipeline_stage = 'closing' AND EXTRACT(DAY FROM (NOW() - t.stage_entered_at)) > 7)
    )
  ORDER BY days_in_stage DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: Create function to get deals closing soon
-- ============================================================================

CREATE OR REPLACE FUNCTION get_closing_soon_deals(p_agent_id UUID, p_days_ahead INTEGER DEFAULT 14)
RETURNS TABLE (
  transaction_id UUID,
  property_address TEXT,
  client_name TEXT,
  estimated_close_date DATE,
  days_until_close INTEGER,
  amount DECIMAL(12,2),
  commission_amount DECIMAL(12,2),
  pipeline_stage VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.property_address,
    t.client_name,
    t.estimated_close_date,
    (t.estimated_close_date - CURRENT_DATE)::INTEGER as days_until_close,
    t.amount,
    t.commission_amount,
    t.pipeline_stage
  FROM app_a5f54_transactions t
  WHERE t.agent_id = p_agent_id
    AND t.estimated_close_date IS NOT NULL
    AND t.estimated_close_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
    AND t.pipeline_stage IN ('under_contract', 'closing')
  ORDER BY t.estimated_close_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: Insert sample data for testing (optional - remove in production)
-- ============================================================================

-- This section can be commented out for production deployment
-- Uncomment for development/testing purposes

/*
-- Sample transactions for testing
INSERT INTO app_a5f54_transactions (
  agent_id, 
  property_address, 
  client_name, 
  amount, 
  pipeline_stage, 
  commission_amount, 
  probability_percent,
  estimated_close_date,
  stage_entered_at
) VALUES
  (auth.uid(), '123 Main St, Norfolk, VA', 'John Smith', 450000, 'lead', 13500, 60, CURRENT_DATE + 60, NOW() - INTERVAL '5 days'),
  (auth.uid(), '456 Oak Ave, Virginia Beach, VA', 'Sarah Johnson', 525000, 'showing', 15750, 70, CURRENT_DATE + 45, NOW() - INTERVAL '3 days'),
  (auth.uid(), '789 Pine Rd, Chesapeake, VA', 'Michael Davis', 380000, 'offer', 11400, 80, CURRENT_DATE + 30, NOW() - INTERVAL '2 days'),
  (auth.uid(), '321 Elm St, Norfolk, VA', 'Emily Rodriguez', 495000, 'under_contract', 14850, 90, CURRENT_DATE + 15, NOW() - INTERVAL '10 days'),
  (auth.uid(), '654 Maple Dr, Virginia Beach, VA', 'David Wilson', 610000, 'closing', 18300, 95, CURRENT_DATE + 5, NOW() - INTERVAL '2 days');
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON app_a5f54_pipeline_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_stalled_deals TO authenticated;
GRANT EXECUTE ON FUNCTION get_closing_soon_deals TO authenticated;