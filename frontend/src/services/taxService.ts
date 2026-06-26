import { TaxSummary, TaxDeduction, TaxCalendarEvent, TaxDocument, RentalIncomeData } from '@/types/tax';

export interface ExpenseBreakdownData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface NetIncomeTrendData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface TaxSavingsResult {
  estimatedSavings: number;
  deductions: {
    category: string;
    amount: number;
  }[];
  taxBracket: string;
  effectiveRate: number;
}

class TaxService {
  async getLandlordTaxSummary(userId: string): Promise<TaxSummary> {
    // Mock data
    return {
      totalIncome: 125000,
      totalDeductions: 45000,
      estimatedTax: 22000,
      taxYear: 2025,
      status: 'pending',
      lastUpdated: new Date().toISOString(),
    };
  }

  async getBuyerTaxSummary(userId: string): Promise<TaxSummary> {
    // Mock data for buyers
    return {
      totalIncome: 95000,
      totalDeductions: 15000,
      estimatedTax: 18000,
      taxYear: 2025,
      status: 'pending',
      lastUpdated: new Date().toISOString(),
    };
  }

  async getFirstTimeBuyerCredits(): Promise<TaxDeduction[]> {
    return [
      {
        id: '1',
        category: 'Mortgage Interest',
        amount: 8000,
        description: 'First-time homebuyer mortgage interest deduction',
        date: '2025-12-31',
        status: 'approved',
      },
      {
        id: '2',
        category: 'Property Tax',
        amount: 5000,
        description: 'Property tax deduction',
        date: '2025-12-31',
        status: 'approved',
      },
      {
        id: '3',
        category: 'Home Office',
        amount: 2000,
        description: 'Home office deduction',
        date: '2025-12-31',
        status: 'pending',
      },
    ];
  }

  async calculateTaxSavings(data: {
    income: number;
    propertyPrice: number;
    downPayment: number;
    mortgageRate: number;
    propertyTax: number;
  }): Promise<TaxSavingsResult> {
    // Calculate mortgage interest deduction
    const loanAmount = data.propertyPrice - data.downPayment;
    const annualMortgageInterest = loanAmount * (data.mortgageRate / 100);
    
    // Calculate total deductions
    const mortgageInterestDeduction = Math.min(annualMortgageInterest, 750000 * (data.mortgageRate / 100));
    const propertyTaxDeduction = Math.min(data.propertyTax, 10000);
    
    const totalDeductions = mortgageInterestDeduction + propertyTaxDeduction;
    
    // Determine tax bracket (simplified)
    let taxBracket = '22%';
    let effectiveRate = 0.22;
    
    if (data.income < 44725) {
      taxBracket = '12%';
      effectiveRate = 0.12;
    } else if (data.income < 95375) {
      taxBracket = '22%';
      effectiveRate = 0.22;
    } else if (data.income < 182100) {
      taxBracket = '24%';
      effectiveRate = 0.24;
    } else if (data.income < 231250) {
      taxBracket = '32%';
      effectiveRate = 0.32;
    } else {
      taxBracket = '35%';
      effectiveRate = 0.35;
    }
    
    const estimatedSavings = totalDeductions * effectiveRate;
    
    return {
      estimatedSavings,
      deductions: [
        {
          category: 'Mortgage Interest',
          amount: mortgageInterestDeduction,
        },
        {
          category: 'Property Tax',
          amount: propertyTaxDeduction,
        },
      ],
      taxBracket,
      effectiveRate,
    };
  }

  async getTaxDeductions(userId: string): Promise<TaxDeduction[]> {
    return [
      {
        id: '1',
        category: 'Maintenance',
        amount: 1200,
        description: 'HVAC Repair',
        date: '2025-03-15',
        propertyId: 'prop_1',
        propertyName: 'Sunset Apartments',
        status: 'approved',
      },
      {
        id: '2',
        category: 'Property Tax',
        amount: 4500,
        description: 'Q1 Property Tax',
        date: '2025-04-01',
        propertyId: 'prop_1',
        propertyName: 'Sunset Apartments',
        status: 'approved',
      },
      {
        id: '3',
        category: 'Utilities',
        amount: 350,
        description: 'Water Bill',
        date: '2025-03-28',
        propertyId: 'prop_2',
        propertyName: 'Downtown Loft',
        status: 'pending',
      },
    ];
  }

  async getTaxCalendar(year: number): Promise<TaxCalendarEvent[]> {
    return [
      {
        id: '1',
        title: 'Q1 Estimated Tax Payment',
        date: '2025-04-15',
        type: 'payment',
        description: 'Federal estimated tax payment for Q1',
        priority: 'high',
        completed: false,
      },
      {
        id: '2',
        title: 'Property Tax Deadline',
        date: '2025-04-10',
        type: 'deadline',
        description: 'County property tax deadline',
        priority: 'high',
        completed: false,
      },
      {
        id: '3',
        title: 'File Extension',
        date: '2025-04-15',
        type: 'deadline',
        description: 'Last day to file for extension',
        priority: 'medium',
        completed: false,
      },
    ];
  }

  async getTaxDocuments(userId: string): Promise<TaxDocument[]> {
    return [
      {
        id: '1',
        name: '2024_1099_MISC.pdf',
        type: 'application/pdf',
        uploadDate: '2025-01-20',
        size: 1024 * 1024 * 1.5,
        url: '#',
        category: '1099',
      },
      {
        id: '2',
        name: 'Property_Tax_Receipt_Q1.pdf',
        type: 'application/pdf',
        uploadDate: '2025-04-02',
        size: 1024 * 500,
        url: '#',
        category: 'receipt',
      },
      {
        id: '3',
        name: 'Expense_Report_March.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadDate: '2025-04-05',
        size: 1024 * 25,
        url: '#',
        category: 'other',
      },
    ];
  }

  async getRentalIncomeData(): Promise<RentalIncomeData[]> {
    return [
      {
        propertyId: 'prop_1',
        propertyName: 'Sunset Apartments',
        monthlyIncome: 4500,
        totalIncome: 54000,
        expenses: 12000,
        netIncome: 42000,
      },
      {
        propertyId: 'prop_2',
        propertyName: 'Downtown Loft',
        monthlyIncome: 2800,
        totalIncome: 33600,
        expenses: 8000,
        netIncome: 25600,
      },
    ];
  }

  async getExpenseBreakdown(userId: string, period: string): Promise<ExpenseBreakdownData[]> {
    return [
      { category: 'Maintenance', amount: 15000, percentage: 35, color: '#FF6B6B' },
      { category: 'Property Tax', amount: 12000, percentage: 28, color: '#4ECDC4' },
      { category: 'Utilities', amount: 8000, percentage: 19, color: '#45B7D1' },
      { category: 'Insurance', amount: 5000, percentage: 12, color: '#96CEB4' },
      { category: 'Other', amount: 2500, percentage: 6, color: '#FFEEAD' },
    ];
  }

  async getNetIncomeTrend(userId: string, period: string): Promise<NetIncomeTrendData[]> {
    return [
      { month: 'Jan', income: 12000, expenses: 4000, net: 8000 },
      { month: 'Feb', income: 12500, expenses: 3800, net: 8700 },
      { month: 'Mar', income: 11800, expenses: 5200, net: 6600 },
      { month: 'Apr', income: 13000, expenses: 4100, net: 8900 },
      { month: 'May', income: 12800, expenses: 3900, net: 8900 },
      { month: 'Jun', income: 13500, expenses: 4500, net: 9000 },
    ];
  }
}

export const taxService = new TaxService();