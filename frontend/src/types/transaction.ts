// Transaction Pipeline Types
// These types extend the existing transaction model with pipeline functionality

export type PipelineStage = 'lead' | 'showing' | 'offer' | 'under_contract' | 'closing' | 'closed' | 'lost';

export interface StageHistoryEntry {
  stage: PipelineStage;
  entered_at: string;
  exited_at: string;
  duration_days: number;
}

export interface Transaction {
  id: string;
  agent_id: string;
  property_address: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  amount: number;
  commission_amount?: number;
  pipeline_stage: PipelineStage;
  stage_entered_at: string;
  estimated_close_date?: string;
  probability_percent: number;
  stalled_reason?: string;
  stage_history: StageHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface PipelineMilestone {
  id: string;
  transaction_id: string;
  milestone_type: string;
  status: 'pending' | 'completed' | 'failed' | 'waived';
  due_date?: string;
  completed_date?: string;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStageSummary {
  count: number;
  total_value: number;
  avg_days_in_stage: number;
}

export interface PipelineSummary {
  total_transactions: number;
  total_pipeline_value: number;
  total_pipeline_commission: number;
  by_stage: {
    lead: PipelineStageSummary;
    showing: PipelineStageSummary;
    offer: PipelineStageSummary;
    under_contract: PipelineStageSummary;
    closing: PipelineStageSummary;
    closed: PipelineStageSummary;
  };
  stalled_deals: StalledDeal[];
  closing_soon: ClosingSoonDeal[];
}

export interface StalledDeal {
  transaction_id: string;
  property_address: string;
  client_name: string;
  pipeline_stage: PipelineStage;
  days_in_stage: number;
  amount: number;
  stalled_reason?: string;
}

export interface ClosingSoonDeal {
  transaction_id: string;
  property_address: string;
  client_name: string;
  estimated_close_date: string;
  days_until_close: number;
  amount: number;
  commission_amount: number;
  pipeline_stage: PipelineStage;
}

export interface UpdateStagePayload {
  new_stage: PipelineStage;
  notes?: string;
  estimated_close_date?: string;
  stalled_reason?: string;
}