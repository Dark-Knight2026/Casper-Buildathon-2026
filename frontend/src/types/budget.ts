export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 
  | 'salary' | 'freelance' | 'investment' | 'other_income'
  | 'rent' | 'utilities' | 'groceries' | 'transportation' 
  | 'entertainment' | 'healthcare' | 'insurance' | 'other_expense';

export type TimePeriod = 'monthly' | 'quarterly' | 'annual';

export interface BudgetTransaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string;
  recurring: boolean;
  recurring_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  category: TransactionCategory;
  budgeted_amount: number;
  actual_amount: number;
  difference: number;
  percentage: number;
}

export interface BudgetSummary {
  period: TimePeriod;
  start_date: string;
  end_date: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  savings_rate: number;
  income_categories: BudgetCategory[];
  expense_categories: BudgetCategory[];
}

export interface BudgetGoal {
  id: string;
  tenant_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
  created_at: string;
}