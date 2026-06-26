import { describe, it, expect, beforeEach } from 'vitest';
import type { CommissionRecord, ExpenseRecord } from '@/types/financial';

// Import the calculation functions we need to test
// Since these are internal to the hook, we'll extract them for testing
function calculateCommission(salePrice: number, commissionRate: number, brokerSplit: number) {
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
}

function calculateFinancialSummary(commissions: CommissionRecord[], expenses: ExpenseRecord[]) {
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

describe('Commission Calculator', () => {
  describe('calculateCommission', () => {
    it('should correctly calculate commission with standard split', () => {
      const result = calculateCommission(500000, 3.0, 30);
      
      expect(result.sale_price).toBe(500000);
      expect(result.commission_rate).toBe(3.0);
      expect(result.gross_commission).toBe(15000);
      expect(result.broker_split_percentage).toBe(30);
      expect(result.broker_split_amount).toBe(4500);
      expect(result.net_commission).toBe(10500);
      expect(result.final_net_commission).toBe(10500);
    });

    it('should handle zero broker split', () => {
      const result = calculateCommission(400000, 2.5, 0);
      
      expect(result.gross_commission).toBe(10000);
      expect(result.broker_split_amount).toBe(0);
      expect(result.net_commission).toBe(10000);
    });

    it('should handle 100% broker split', () => {
      const result = calculateCommission(300000, 3.0, 100);
      
      expect(result.gross_commission).toBe(9000);
      expect(result.broker_split_amount).toBe(9000);
      expect(result.net_commission).toBe(0);
    });

    it('should handle low commission rates (referral)', () => {
      const result = calculateCommission(500000, 0.5, 20);
      
      expect(result.gross_commission).toBe(2500);
      expect(result.broker_split_amount).toBe(500);
      expect(result.net_commission).toBe(2000);
    });

    it('should handle decimal sale prices', () => {
      const result = calculateCommission(485750.50, 2.75, 30);
      
      expect(result.gross_commission).toBeCloseTo(13358.14, 2);
      expect(result.broker_split_amount).toBeCloseTo(4007.44, 2);
      expect(result.net_commission).toBeCloseTo(9350.70, 2);
    });

    it('should handle very large sale prices', () => {
      const result = calculateCommission(5000000, 2.0, 25);
      
      expect(result.gross_commission).toBe(100000);
      expect(result.broker_split_amount).toBe(25000);
      expect(result.net_commission).toBe(75000);
    });

    it('should return zero for zero sale price', () => {
      const result = calculateCommission(0, 3.0, 30);
      
      expect(result.gross_commission).toBe(0);
      expect(result.broker_split_amount).toBe(0);
      expect(result.net_commission).toBe(0);
    });
  });
});

describe('Financial Summary Calculator', () => {
  let mockCommissions: CommissionRecord[];
  let mockExpenses: ExpenseRecord[];

  beforeEach(() => {
    const currentYear = new Date().getFullYear();
    
    mockCommissions = [
      {
        id: '1',
        agent_id: 'agent-1',
        client_name: 'Client A',
        property_address: '123 Main St',
        transaction_type: 'sale',
        sale_price: 500000,
        commission_rate: 3.0,
        gross_commission: 15000,
        broker_split_percentage: 30,
        broker_split_amount: 4500,
        net_commission: 10500,
        status: 'received',
        created_at: new Date(currentYear, 0, 15).toISOString(),
        updated_at: new Date(currentYear, 0, 15).toISOString()
      },
      {
        id: '2',
        agent_id: 'agent-1',
        client_name: 'Client B',
        property_address: '456 Oak Ave',
        transaction_type: 'sale',
        sale_price: 400000,
        commission_rate: 2.5,
        gross_commission: 10000,
        broker_split_percentage: 30,
        broker_split_amount: 3000,
        net_commission: 7000,
        status: 'received',
        created_at: new Date(currentYear, 1, 20).toISOString(),
        updated_at: new Date(currentYear, 1, 20).toISOString()
      },
      {
        id: '3',
        agent_id: 'agent-1',
        client_name: 'Client C',
        property_address: '789 Pine Rd',
        transaction_type: 'referral',
        sale_price: 300000,
        commission_rate: 1.0,
        gross_commission: 3000,
        broker_split_percentage: 20,
        broker_split_amount: 600,
        net_commission: 2400,
        status: 'received',
        created_at: new Date(currentYear - 1, 11, 15).toISOString(),
        updated_at: new Date(currentYear - 1, 11, 15).toISOString()
      }
    ];

    mockExpenses = [
      {
        id: '1',
        agent_id: 'agent-1',
        category: 'marketing',
        description: 'Facebook Ads',
        amount: 500,
        date: new Date(currentYear, 0, 10).toISOString(),
        is_tax_deductible: true,
        created_at: new Date(currentYear, 0, 10).toISOString(),
        updated_at: new Date(currentYear, 0, 10).toISOString()
      },
      {
        id: '2',
        agent_id: 'agent-1',
        category: 'office',
        description: 'Office Rent',
        amount: 1200,
        date: new Date(currentYear, 1, 1).toISOString(),
        is_tax_deductible: true,
        created_at: new Date(currentYear, 1, 1).toISOString(),
        updated_at: new Date(currentYear, 1, 1).toISOString()
      },
      {
        id: '3',
        agent_id: 'agent-1',
        category: 'travel',
        description: 'Mileage',
        amount: 300,
        date: new Date(currentYear - 1, 11, 20).toISOString(),
        is_tax_deductible: true,
        created_at: new Date(currentYear - 1, 11, 20).toISOString(),
        updated_at: new Date(currentYear - 1, 11, 20).toISOString()
      }
    ];
  });

  describe('calculateFinancialSummary', () => {
    it('should correctly calculate total commissions', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      expect(summary.total_gross_commission).toBe(28000); // 15000 + 10000 + 3000
      expect(summary.total_net_commission).toBe(19900); // 10500 + 7000 + 2400
      expect(summary.total_broker_split).toBe(8100); // 4500 + 3000 + 600
    });

    it('should correctly calculate total expenses', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      expect(summary.total_expenses).toBe(2000); // 500 + 1200 + 300
    });

    it('should correctly calculate net income', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      expect(summary.net_income).toBe(17900); // 19900 - 2000
    });

    it('should correctly filter YTD commissions', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      // Only first two commissions are from current year
      expect(summary.ytd_gross_commission).toBe(25000); // 15000 + 10000
      expect(summary.ytd_net_commission).toBe(17500); // 10500 + 7000
    });

    it('should correctly filter YTD expenses', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      // Only first two expenses are from current year
      expect(summary.ytd_expenses).toBe(1700); // 500 + 1200
    });

    it('should correctly calculate YTD net income', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      expect(summary.ytd_net_income).toBe(15800); // 17500 - 1700
    });

    it('should correctly calculate average commission per deal', () => {
      const summary = calculateFinancialSummary(mockCommissions, mockExpenses);
      
      expect(summary.avg_commission_per_deal).toBeCloseTo(6633.33, 2); // 19900 / 3
    });

    it('should handle empty commissions array', () => {
      const summary = calculateFinancialSummary([], mockExpenses);
      
      expect(summary.total_gross_commission).toBe(0);
      expect(summary.total_net_commission).toBe(0);
      expect(summary.total_broker_split).toBe(0);
      expect(summary.avg_commission_per_deal).toBe(0);
      expect(summary.net_income).toBe(-2000); // 0 - 2000
    });

    it('should handle empty expenses array', () => {
      const summary = calculateFinancialSummary(mockCommissions, []);
      
      expect(summary.total_expenses).toBe(0);
      expect(summary.net_income).toBe(19900); // 19900 - 0
    });

    it('should handle both empty arrays', () => {
      const summary = calculateFinancialSummary([], []);
      
      expect(summary.total_gross_commission).toBe(0);
      expect(summary.total_net_commission).toBe(0);
      expect(summary.total_expenses).toBe(0);
      expect(summary.net_income).toBe(0);
      expect(summary.avg_commission_per_deal).toBe(0);
    });
  });
});