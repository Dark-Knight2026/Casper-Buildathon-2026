import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { 
  Transaction, 
  PipelineSummary, 
  PipelineStage,
  UpdateStagePayload,
  StalledDeal,
  ClosingSoonDeal
} from '@/types/transaction';

interface UseTransactionPipelineReturn {
  transactions: Record<PipelineStage, Transaction[]>;
  summary: PipelineSummary | null;
  stalledDeals: StalledDeal[];
  closingSoon: ClosingSoonDeal[];
  loading: boolean;
  error: string | null;
  updateTransactionStage: (transactionId: string, payload: UpdateStagePayload) => Promise<void>;
  refreshPipeline: () => Promise<void>;
}

// Enhanced mock data generator with more diverse transactions
function generateMockTransactions(userId: string): Transaction[] {
  return [
    // Lead Stage (3 transactions)
    {
      id: '1',
      agent_id: userId,
      property_address: '123 Main St, Norfolk, VA 23510',
      client_name: 'John Smith',
      client_email: 'john.smith@email.com',
      amount: 450000,
      commission_amount: 13500,
      pipeline_stage: 'lead',
      stage_entered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 60,
      stage_history: [],
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      agent_id: userId,
      property_address: '789 Colonial Ave, Virginia Beach, VA 23451',
      client_name: 'Jennifer Martinez',
      client_email: 'j.martinez@email.com',
      amount: 385000,
      commission_amount: 11550,
      pipeline_stage: 'lead',
      stage_entered_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 50,
      stage_history: [],
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      agent_id: userId,
      property_address: '2456 Oceanfront Blvd, Virginia Beach, VA 23451',
      client_name: 'Robert & Lisa Chen',
      client_email: 'chen.family@email.com',
      amount: 875000,
      commission_amount: 26250,
      pipeline_stage: 'lead',
      stage_entered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 65,
      stage_history: [],
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Showing Stage (3 transactions)
    {
      id: '4',
      agent_id: userId,
      property_address: '456 Oak Ave, Chesapeake, VA 23320',
      client_name: 'Sarah Johnson',
      client_email: 'sarah.j@email.com',
      amount: 525000,
      commission_amount: 15750,
      pipeline_stage: 'showing',
      stage_entered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 70,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 11
        }
      ],
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '5',
      agent_id: userId,
      property_address: '1234 Harbor View Dr, Norfolk, VA 23518',
      client_name: 'Marcus & Angela Thompson',
      client_email: 'thompson.family@email.com',
      amount: 620000,
      commission_amount: 18600,
      pipeline_stage: 'showing',
      stage_entered_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 75,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 12
        }
      ],
      created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '6',
      agent_id: userId,
      property_address: '567 Willow Creek Ln, Suffolk, VA 23435',
      client_name: 'Patricia Williams',
      amount: 295000,
      commission_amount: 8850,
      pipeline_stage: 'showing',
      stage_entered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 68,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 8
        }
      ],
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Offer Stage (2 transactions)
    {
      id: '7',
      agent_id: userId,
      property_address: '789 Pine Rd, Chesapeake, VA 23322',
      client_name: 'Michael Davis',
      amount: 380000,
      commission_amount: 11400,
      pipeline_stage: 'offer',
      stage_entered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 80,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 13
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 9
        }
      ],
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '8',
      agent_id: userId,
      property_address: '3421 Lakeside Terrace, Virginia Beach, VA 23454',
      client_name: 'Kevin & Amanda Park',
      client_email: 'park.residence@email.com',
      amount: 715000,
      commission_amount: 21450,
      pipeline_stage: 'offer',
      stage_entered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 82,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 12
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        }
      ],
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Under Contract Stage (2 transactions)
    {
      id: '9',
      agent_id: userId,
      property_address: '321 Elm St, Norfolk, VA 23507',
      client_name: 'Emily Rodriguez',
      amount: 495000,
      commission_amount: 14850,
      pipeline_stage: 'under_contract',
      stage_entered_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 90,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 12
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 8
        },
        {
          stage: 'offer',
          entered_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 8
        }
      ],
      created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '10',
      agent_id: userId,
      property_address: '8765 Riverside Dr, Portsmouth, VA 23707',
      client_name: 'Daniel & Michelle Lee',
      client_email: 'lee.home@email.com',
      amount: 540000,
      commission_amount: 16200,
      pipeline_stage: 'under_contract',
      stage_entered_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 92,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 13
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        },
        {
          stage: 'offer',
          entered_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        }
      ],
      created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Closing Stage (2 transactions - closing soon!)
    {
      id: '11',
      agent_id: userId,
      property_address: '654 Maple Dr, Virginia Beach, VA 23462',
      client_name: 'David Wilson',
      amount: 610000,
      commission_amount: 18300,
      pipeline_stage: 'closing',
      stage_entered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 95,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 15
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 10
        },
        {
          stage: 'offer',
          entered_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        },
        {
          stage: 'under_contract',
          entered_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 15
        }
      ],
      created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '12',
      agent_id: userId,
      property_address: '9012 Sunset Ridge, Chesapeake, VA 23321',
      client_name: 'Christopher & Nicole Brown',
      client_email: 'brown.family@email.com',
      amount: 435000,
      commission_amount: 13050,
      pipeline_stage: 'closing',
      stage_entered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 94,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 12
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 8
        },
        {
          stage: 'offer',
          entered_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 6
        },
        {
          stage: 'under_contract',
          entered_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 11
        }
      ],
      created_at: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Closed Stage (2 transactions - recently completed)
    {
      id: '13',
      agent_id: userId,
      property_address: '1567 Heritage Blvd, Norfolk, VA 23509',
      client_name: 'Thomas & Rebecca Garcia',
      client_email: 'garcia.home@email.com',
      amount: 485000,
      commission_amount: 14550,
      pipeline_stage: 'closed',
      stage_entered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 100,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 13
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 9
        },
        {
          stage: 'offer',
          entered_at: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        },
        {
          stage: 'under_contract',
          entered_at: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 16
        },
        {
          stage: 'closing',
          entered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 8
        }
      ],
      created_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '14',
      agent_id: userId,
      property_address: '4321 Bayview Circle, Virginia Beach, VA 23455',
      client_name: 'Steven & Rachel Kim',
      amount: 725000,
      commission_amount: 21750,
      pipeline_stage: 'closed',
      stage_entered_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_close_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 100,
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 15
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 10
        },
        {
          stage: 'offer',
          entered_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        },
        {
          stage: 'under_contract',
          entered_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 14
        },
        {
          stage: 'closing',
          entered_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 7
        }
      ],
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    },
    
    // Lost Stage (1 transaction - example of a deal that didn't close)
    {
      id: '15',
      agent_id: userId,
      property_address: '7890 Mountain View Rd, Suffolk, VA 23434',
      client_name: 'Brian Anderson',
      amount: 340000,
      commission_amount: 10200,
      pipeline_stage: 'lost',
      stage_entered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      probability_percent: 0,
      stalled_reason: 'Client decided to rent instead of buy due to job relocation uncertainty',
      stage_history: [
        {
          stage: 'lead',
          entered_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 12
        },
        {
          stage: 'showing',
          entered_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          exited_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          duration_days: 14
        }
      ],
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

export function useTransactionPipeline(): UseTransactionPipelineReturn {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Record<PipelineStage, Transaction[]>>({
    lead: [],
    showing: [],
    offer: [],
    under_contract: [],
    closing: [],
    closed: [],
    lost: []
  });
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [stalledDeals, setStalledDeals] = useState<StalledDeal[]>([]);
  const [closingSoon, setClosingSoon] = useState<ClosingSoonDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipelineFromSupabase = useCallback(async (userId: string) => {
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('app_a5f54_transactions')
      .select('*')
      .eq('agent_id', userId)
      .order('stage_entered_at', { ascending: false });

    if (transactionsError) throw transactionsError;

    const { data: summaryData, error: summaryError } = await supabase
      .from('app_a5f54_pipeline_summary')
      .select('*')
      .eq('agent_id', userId)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') {
      console.error('Summary error:', summaryError);
    }

    const { data: stalledData } = await supabase
      .rpc('get_stalled_deals', { p_agent_id: userId });

    const { data: closingData } = await supabase
      .rpc('get_closing_soon_deals', { p_agent_id: userId, p_days_ahead: 14 });

    return {
      transactions: transactionsData || [],
      summary: summaryData,
      stalledDeals: stalledData || [],
      closingSoon: closingData || []
    };
  }, []);

  const fetchPipelineWithMockData = useCallback(async (userId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockTransactions = generateMockTransactions(userId);
    
    const mockStalledDeals: StalledDeal[] = mockTransactions
      .filter(t => {
        const daysInStage = Math.floor(
          (Date.now() - new Date(t.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const thresholds: Record<PipelineStage, number> = {
          lead: 14, showing: 10, offer: 7, under_contract: 30, closing: 7, closed: 999, lost: 999
        };
        return daysInStage > thresholds[t.pipeline_stage];
      })
      .map(t => ({
        transaction_id: t.id,
        property_address: t.property_address,
        client_name: t.client_name,
        pipeline_stage: t.pipeline_stage,
        days_in_stage: Math.floor(
          (Date.now() - new Date(t.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
        amount: t.amount,
        stalled_reason: t.stalled_reason
      }));

    const mockClosingSoon: ClosingSoonDeal[] = mockTransactions
      .filter(t => {
        if (!t.estimated_close_date) return false;
        const daysUntilClose = Math.floor(
          (new Date(t.estimated_close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilClose >= 0 && daysUntilClose <= 14;
      })
      .map(t => ({
        transaction_id: t.id,
        property_address: t.property_address,
        client_name: t.client_name,
        estimated_close_date: t.estimated_close_date!,
        days_until_close: Math.floor(
          (new Date(t.estimated_close_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
        amount: t.amount,
        commission_amount: t.commission_amount || 0,
        pipeline_stage: t.pipeline_stage
      }));

    return {
      transactions: mockTransactions,
      summary: null,
      stalledDeals: mockStalledDeals,
      closingSoon: mockClosingSoon
    };
  }, []);

  const fetchPipeline = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let data;
      
      if (isSupabaseConfigured()) {
        try {
          data = await fetchPipelineFromSupabase(user.id);
        } catch (err) {
          console.warn('Supabase fetch failed, using mock data:', err);
          data = await fetchPipelineWithMockData(user.id);
        }
      } else {
        data = await fetchPipelineWithMockData(user.id);
      }

      // Group transactions by stage
      const groupedTransactions: Record<PipelineStage, Transaction[]> = {
        lead: [], showing: [], offer: [], under_contract: [], closing: [], closed: [], lost: []
      };

      data.transactions.forEach((transaction: Transaction) => {
        const stage = transaction.pipeline_stage;
        if (stage in groupedTransactions) {
          groupedTransactions[stage].push(transaction);
        }
      });

      setTransactions(groupedTransactions);

      // Calculate summary if not provided
      if (data.summary) {
        const formattedSummary: PipelineSummary = {
          total_transactions: data.summary.total_transactions || 0,
          total_pipeline_value: data.summary.total_pipeline_value || 0,
          total_pipeline_commission: data.summary.total_pipeline_commission || 0,
          by_stage: {
            lead: { count: data.summary.lead_count || 0, total_value: data.summary.lead_value || 0, avg_days_in_stage: data.summary.avg_days_in_lead || 0 },
            showing: { count: data.summary.showing_count || 0, total_value: data.summary.showing_value || 0, avg_days_in_stage: data.summary.avg_days_in_showing || 0 },
            offer: { count: data.summary.offer_count || 0, total_value: data.summary.offer_value || 0, avg_days_in_stage: data.summary.avg_days_in_offer || 0 },
            under_contract: { count: data.summary.under_contract_count || 0, total_value: data.summary.under_contract_value || 0, avg_days_in_stage: data.summary.avg_days_in_under_contract || 0 },
            closing: { count: data.summary.closing_count || 0, total_value: data.summary.closing_value || 0, avg_days_in_stage: data.summary.avg_days_in_closing || 0 },
            closed: { count: data.summary.closed_count || 0, total_value: data.summary.closed_value || 0, avg_days_in_stage: 0 }
          },
          stalled_deals: [],
          closing_soon: []
        };
        setSummary(formattedSummary);
      } else {
        // Calculate summary from transactions
        const activeTransactions = data.transactions.filter((t: Transaction) => 
          !['closed', 'lost'].includes(t.pipeline_stage)
        );
        
        const mockSummary: PipelineSummary = {
          total_transactions: activeTransactions.length,
          total_pipeline_value: activeTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0),
          total_pipeline_commission: activeTransactions.reduce((sum: number, t: Transaction) => sum + (t.commission_amount || 0), 0),
          by_stage: {
            lead: { count: groupedTransactions.lead.length, total_value: groupedTransactions.lead.reduce((sum, t) => sum + t.amount, 0), avg_days_in_stage: 5 },
            showing: { count: groupedTransactions.showing.length, total_value: groupedTransactions.showing.reduce((sum, t) => sum + t.amount, 0), avg_days_in_stage: 4 },
            offer: { count: groupedTransactions.offer.length, total_value: groupedTransactions.offer.reduce((sum, t) => sum + t.amount, 0), avg_days_in_stage: 2 },
            under_contract: { count: groupedTransactions.under_contract.length, total_value: groupedTransactions.under_contract.reduce((sum, t) => sum + t.amount, 0), avg_days_in_stage: 10 },
            closing: { count: groupedTransactions.closing.length, total_value: groupedTransactions.closing.reduce((sum, t) => sum + t.amount, 0), avg_days_in_stage: 4 },
            closed: { count: groupedTransactions.closed.length, total_value: groupedTransactions.closed.reduce((sum, t) => sum + t.amount, 0), avg_days_in_stage: 0 }
          },
          stalled_deals: [],
          closing_soon: []
        };
        setSummary(mockSummary);
      }

      setStalledDeals(data.stalledDeals);
      setClosingSoon(data.closingSoon);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pipeline data';
      console.error('Pipeline fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchPipelineFromSupabase, fetchPipelineWithMockData]);

  const updateTransactionStage = useCallback(async (
    transactionId: string,
    payload: UpdateStagePayload
  ) => {
    try {
      if (isSupabaseConfigured()) {
        const updateData: Record<string, unknown> = {
          pipeline_stage: payload.new_stage,
          updated_at: new Date().toISOString()
        };

        if (payload.estimated_close_date) {
          updateData.estimated_close_date = payload.estimated_close_date;
        }

        if (payload.stalled_reason) {
          updateData.stalled_reason = payload.stalled_reason;
        }

        const { error: updateError } = await supabase
          .from('app_a5f54_transactions')
          .update(updateData)
          .eq('id', transactionId);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Optimistically update local state
      setTransactions(prev => {
        const newTransactions = { ...prev };
        
        let movedTransaction: Transaction | null = null;
        for (const stage in newTransactions) {
          const index = newTransactions[stage as PipelineStage].findIndex(
            t => t.id === transactionId
          );
          if (index !== -1) {
            [movedTransaction] = newTransactions[stage as PipelineStage].splice(index, 1);
            break;
          }
        }

        if (movedTransaction) {
          movedTransaction.pipeline_stage = payload.new_stage;
          movedTransaction.stage_entered_at = new Date().toISOString();
          if (payload.estimated_close_date) {
            movedTransaction.estimated_close_date = payload.estimated_close_date;
          }
          if (payload.stalled_reason) {
            movedTransaction.stalled_reason = payload.stalled_reason;
          }
          newTransactions[payload.new_stage].push(movedTransaction);
        }

        return newTransactions;
      });

      await fetchPipeline();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction stage';
      console.error('Update stage error:', err);
      throw new Error(errorMessage);
    }
  }, [fetchPipeline]);

  const refreshPipeline = useCallback(async () => {
    await fetchPipeline();
  }, [fetchPipeline]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  return {
    transactions,
    summary,
    stalledDeals,
    closingSoon,
    loading,
    error,
    updateTransactionStage,
    refreshPipeline
  };
}