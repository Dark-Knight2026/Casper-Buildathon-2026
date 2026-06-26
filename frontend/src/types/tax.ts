// Tax-related type definitions
export interface TaxSummary {
  totalIncome: number;
  totalDeductions: number;
  estimatedTax: number;
  taxYear: number;
  status: 'draft' | 'filed' | 'pending';
  lastUpdated: string;
}

export interface TaxDeduction {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  propertyId?: string;
  propertyName?: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface TaxCalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'deadline' | 'reminder' | 'payment';
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface TaxDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: number;
  url: string;
  category: 'w2' | '1099' | 'receipt' | 'statement' | 'other';
}

export interface RentalIncomeData {
  propertyId: string;
  propertyName: string;
  monthlyIncome: number;
  totalIncome: number;
  expenses: number;
  netIncome: number;
}