import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  CommissionRecord,
  ExpenseRecord,
  FinancialSummary,
  MonthlyFinancials,
  TaxEstimate,
  ExpenseByCategory,
  CommissionProjection,
  FinancialGoal,
  CommissionCalculatorResult,
  ExpenseCategory
} from '@/types/financial';

interface UseFinancialDashboardReturn {
  commissions: CommissionRecord[];
  expenses: ExpenseRecord[];
  summary: FinancialSummary | null;
  monthlyFinancials: MonthlyFinancials[];
  taxEstimates: TaxEstimate[];
  expensesByCategory: ExpenseByCategory[];
  projections: CommissionProjection[];
  goals: FinancialGoal | null;
  loading: boolean;
  error: string | null;
  calculateCommission: (salePrice: number, commissionRate: number, brokerSplit: number) => CommissionCalculatorResult;
  addCommission: (commission: Partial<CommissionRecord>) => Promise<void>;
  updateCommission: (id: string, updates: Partial<CommissionRecord>) => Promise<void>;
  addExpense: (expense: Partial<ExpenseRecord>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

// Mock data generators
function generateMockCommissions(): CommissionRecord[] {
  const baseDate = new Date();
  return [
    {
      id: '1',
      agent_id: 'agent-1',
      transaction_id: 'trans-1',
      client_name: 'Sarah Mitchell',
      property_address: '2847 Ocean View Drive',
      transaction_type: 'sale',
      sale_price: 485000,
      commission_rate: 3.0,
      gross_commission: 14550,
      broker_split_percentage: 30,
      broker_split_amount: 4365,
      net_commission: 10185,
      status: 'received',
      expected_date: new Date(baseDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      received_date: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      agent_id: 'agent-1',
      transaction_id: 'trans-2',
      client_name: 'James & Rebecca Torres',
      property_address: '1523 Shoreline Avenue',
      transaction_type: 'sale',
      sale_price: 625000,
      commission_rate: 2.5,
      gross_commission: 15625,
      broker_split_percentage: 30,
      broker_split_amount: 4687.5,
      net_commission: 10937.5,
      status: 'received',
      expected_date: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      received_date: new Date(baseDate.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      agent_id: 'agent-1',
      transaction_id: 'trans-3',
      client_name: 'Michael Chen',
      property_address: '4156 Coastal Boulevard',
      transaction_type: 'sale',
      sale_price: 510000,
      commission_rate: 3.0,
      gross_commission: 15300,
      broker_split_percentage: 30,
      broker_split_amount: 4590,
      net_commission: 10710,
      status: 'expected',
      expected_date: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      agent_id: 'agent-1',
      transaction_id: 'trans-4',
      client_name: 'David & Lisa Park',
      property_address: '789 Bayfront Terrace',
      transaction_type: 'sale',
      sale_price: 445000,
      commission_rate: 3.0,
      gross_commission: 13350,
      broker_split_percentage: 30,
      broker_split_amount: 4005,
      net_commission: 9345,
      status: 'pending',
      expected_date: new Date(baseDate.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      agent_id: 'agent-1',
      client_name: 'Jennifer Williams',
      property_address: '3421 Marina View Lane',
      transaction_type: 'referral',
      sale_price: 395000,
      commission_rate: 1.0,
      gross_commission: 3950,
      broker_split_percentage: 20,
      broker_split_amount: 790,
      net_commission: 3160,
      status: 'received',
      expected_date: new Date(baseDate.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      received_date: new Date(baseDate.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Referral to John Smith at ABC Realty',
      created_at: new Date(baseDate.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function generateMockExpenses(): ExpenseRecord[] {
  const baseDate = new Date();
  return [
    {
      id: '1',
      agent_id: 'agent-1',
      category: 'marketing',
      description: 'Facebook Ads Campaign - Q4',
      amount: 850,
      date: new Date(baseDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: 'Meta Platforms',
      is_tax_deductible: true,
      created_at: new Date(baseDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      agent_id: 'agent-1',
      category: 'office',
      description: 'Monthly Office Rent',
      amount: 1200,
      date: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: 'Commercial Property LLC',
      is_tax_deductible: true,
      created_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      agent_id: 'agent-1',
      category: 'technology',
      description: 'CRM Software Subscription',
      amount: 299,
      date: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: 'Salesforce',
      is_tax_deductible: true,
      created_at: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      agent_id: 'agent-1',
      category: 'travel',
      description: 'Client Meeting - Mileage Reimbursement',
      amount: 145,
      date: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      is_tax_deductible: true,
      notes: '250 miles @ $0.58/mile',
      created_at: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      agent_id: 'agent-1',
      category: 'professional_development',
      description: 'Real Estate Conference Registration',
      amount: 595,
      date: new Date(baseDate.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: 'NAR Conference',
      is_tax_deductible: true,
      created_at: new Date(baseDate.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '6',
      agent_id: 'agent-1',
      category: 'marketing',
      description: 'Professional Photography',
      amount: 450,
      date: new Date(baseDate.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: 'Pro Photos Inc',
      is_tax_deductible: true,
      created_at: new Date(baseDate.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '7',
      agent_id: 'agent-1',
      category: 'insurance',
      description: 'E&O Insurance - Quarterly Premium',
      amount: 425,
      date: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: 'Insurance Company',
      is_tax_deductible: true,
      created_at: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function calculateFinancialSummary(commissions: CommissionRecord[], expenses: ExpenseRecord[]): FinancialSummary {
  const currentYear = new Date().getFullYear();
  
  const totalGrossCommission = commissions.reduce((sum, c) => sum + c.gross_commission, 0);
  const totalNetCommission = commissions.reduce((sum, c) => sum + c.net_commission, 0);
  const totalBrokerSplit = commissions.reduce((sum, c) => sum + c.broker_split_amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const ytdCommissions = commissions.filter(c => new Date(c.created_at).getFullYear() === currentYear);
  const ytdExpenses = expenses.filter(e => new Date(e.date).getFullYear() === currentYear);
  
  const ytdGrossCommission = ytdCommissions.reduce((sum, c) => sum + c.gross_commission, 0);
  const ytdNetCommission = ytdCommissions.reduce((sum, c) => sum + c.net_commission, 0);
  const ytdExpensesTotal = ytdExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  return {
    total_gross_commission: totalGrossCommission,
    total_net_commission: totalNetCommission,
    total_broker_split: totalBrokerSplit,
    total_expenses: totalExpenses,
    net_income: totalNetCommission - totalExpenses,
    ytd_gross_commission: ytdGrossCommission,
    ytd_net_commission: ytdNetCommission,
    ytd_expenses: ytdExpensesTotal,
    ytd_net_income: ytdNetCommission - ytdExpensesTotal,
    avg_commission_per_deal: commissions.length > 0 ? totalNetCommission / commissions.length : 0,
    avg_days_to_close: 28
  };
}

function generateMonthlyFinancials(): MonthlyFinancials[] {
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  return months.map((month, index) => ({
    month,
    year: 2024,
    gross_commission: 12000 + Math.random() * 8000,
    net_commission: 8400 + Math.random() * 5600,
    expenses: 2500 + Math.random() * 1500,
    net_income: 5900 + Math.random() * 4100,
    deals_closed: Math.floor(2 + Math.random() * 3)
  }));
}

function generateTaxEstimates(): TaxEstimate[] {
  return [
    {
      year: 2024,
      quarter: 'Q4',
      gross_income: 31832.5,
      deductible_expenses: 3964,
      taxable_income: 27868.5,
      estimated_federal_tax: 6130,
      estimated_state_tax: 1950,
      estimated_self_employment_tax: 3935,
      total_estimated_tax: 12015,
      tax_paid: 8500,
      tax_remaining: 3515,
      due_date: '2025-01-15'
    }
  ];
}

function generateExpensesByCategory(expenses: ExpenseRecord[]): ExpenseByCategory[] {
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  expenses.forEach(expense => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { total: 0, count: 0 };
    }
    categoryTotals[expense.category].total += expense.amount;
    categoryTotals[expense.category].count += 1;
  });
  
  return Object.entries(categoryTotals).map(([category, data]) => ({
    category: category as ExpenseCategory,
    total_amount: data.total,
    transaction_count: data.count,
    percentage_of_total: (data.total / totalExpenses) * 100,
    is_tax_deductible: true
  }));
}

function generateProjections(): CommissionProjection[] {
  const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const confidenceLevels: Array<'low' | 'medium' | 'high'> = ['high', 'high', 'medium', 'medium', 'low'];
  
  return months.map((month, index) => ({
    month,
    projected_gross: 14000 + index * 1000,
    projected_net: 9800 + index * 700,
    pipeline_value: 1250000 + index * 150000,
    expected_deals: 2 + Math.floor(index / 2),
    confidence_level: confidenceLevels[index]
  }));
}

function generateGoals(): FinancialGoal {
  return {
    id: '1',
    agent_id: 'agent-1',
    year: 2024,
    target_gross_commission: 150000,
    target_net_income: 75000,
    target_deals: 25,
    current_gross_commission: 62775,
    current_net_income: 27937.5,
    current_deals: 5,
    progress_percentage: 41.85,
    created_at: new Date(2024, 0, 1).toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function useFinancialDashboard(): UseFinancialDashboardReturn {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [monthlyFinancials, setMonthlyFinancials] = useState<MonthlyFinancials[]>([]);
  const [taxEstimates, setTaxEstimates] = useState<TaxEstimate[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [projections, setProjections] = useState<CommissionProjection[]>([]);
  const [goals, setGoals] = useState<FinancialGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateCommission = useCallback((salePrice: number, commissionRate: number, brokerSplit: number): CommissionCalculatorResult => {
    const grossCommission = (salePrice * commissionRate) / 100;
    const brokerSplitAmount = (grossCommission * brokerSplit) / 100;
    const netCommission = grossCommission - brokerSplitAmount;
    
    return {
      sale_price: salePrice,
      commission_rate: commissionRate,
      gross_commission: grossCommission,
      broker_split_percentage: brokerSplit,
      broker_split_amount: brokerSplitAmount,
      net_commission: netCommission,
      additional_fees: 0,
      final_net_commission: netCommission
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let data;
      
      if (isSupabaseConfigured()) {
        try {
          const [commissionsData, expensesData] = await Promise.all([
            supabase.from('app_a12f5_commissions').select('*').eq('agent_id', user.id),
            supabase.from('app_a12f5_expenses').select('*').eq('agent_id', user.id)
          ]);
          
          data = {
            commissions: commissionsData.data || [],
            expenses: expensesData.data || []
          };
        } catch (err) {
          console.warn('Supabase fetch failed, using mock data:', err);
          data = {
            commissions: generateMockCommissions(),
            expenses: generateMockExpenses()
          };
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        data = {
          commissions: generateMockCommissions(),
          expenses: generateMockExpenses()
        };
      }

      setCommissions(data.commissions);
      setExpenses(data.expenses);
      setSummary(calculateFinancialSummary(data.commissions, data.expenses));
      setMonthlyFinancials(generateMonthlyFinancials());
      setTaxEstimates(generateTaxEstimates());
      setExpensesByCategory(generateExpensesByCategory(data.expenses));
      setProjections(generateProjections());
      setGoals(generateGoals());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch financial data';
      console.error('Financial data fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addCommission = useCallback(async (commission: Partial<CommissionRecord>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: insertError } = await supabase
          .from('app_a12f5_commissions')
          .insert({ agent_id: user?.id, ...commission });

        if (insertError) throw insertError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      console.error('Add commission error:', err);
      throw err;
    }
  }, [user?.id, fetchData]);

  const updateCommission = useCallback(async (id: string, updates: Partial<CommissionRecord>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_commissions')
          .update(updates)
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      console.error('Update commission error:', err);
      throw err;
    }
  }, [fetchData]);

  const addExpense = useCallback(async (expense: Partial<ExpenseRecord>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: insertError } = await supabase
          .from('app_a12f5_expenses')
          .insert({ agent_id: user?.id, ...expense });

        if (insertError) throw insertError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      console.error('Add expense error:', err);
      throw err;
    }
  }, [user?.id, fetchData]);

  const updateExpense = useCallback(async (id: string, updates: Partial<ExpenseRecord>) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: updateError } = await supabase
          .from('app_a12f5_expenses')
          .update(updates)
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      await fetchData();
    } catch (err) {
      console.error('Update expense error:', err);
      throw err;
    }
  }, [fetchData]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: deleteError } = await supabase
          .from('app_a12f5_expenses')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await fetchData();
    } catch (err) {
      console.error('Delete expense error:', err);
      throw err;
    }
  }, [fetchData]);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    commissions,
    expenses,
    summary,
    monthlyFinancials,
    taxEstimates,
    expensesByCategory,
    projections,
    goals,
    loading,
    error,
    calculateCommission,
    addCommission,
    updateCommission,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshData
  };
}