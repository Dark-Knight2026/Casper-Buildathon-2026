import { BudgetTransaction, BudgetSummary, BudgetCategory, TimePeriod, TransactionCategory } from '@/types/budget';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

export function getDateRange(period: TimePeriod, referenceDate: Date = new Date()): { start: Date; end: Date } {
  switch (period) {
    case 'monthly':
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate)
      };
    case 'quarterly':
      return {
        start: startOfQuarter(referenceDate),
        end: endOfQuarter(referenceDate)
      };
    case 'annual':
      return {
        start: startOfYear(referenceDate),
        end: endOfYear(referenceDate)
      };
  }
}

export function filterTransactionsByPeriod(
  transactions: BudgetTransaction[],
  period: TimePeriod,
  referenceDate: Date = new Date()
): BudgetTransaction[] {
  const { start, end } = getDateRange(period, referenceDate);
  
  return transactions.filter(transaction => {
    const transactionDate = parseISO(transaction.date);
    return isWithinInterval(transactionDate, { start, end });
  });
}

export function calculateCategoryTotals(
  transactions: BudgetTransaction[],
  type: 'income' | 'expense'
): Map<string, number> {
  const categoryTotals = new Map<string, number>();
  
  transactions
    .filter(t => t.type === type)
    .forEach(transaction => {
      const current = categoryTotals.get(transaction.category) || 0;
      categoryTotals.set(transaction.category, current + transaction.amount);
    });
  
  return categoryTotals;
}

export function calculateBudgetSummary(
  transactions: BudgetTransaction[],
  period: TimePeriod,
  referenceDate: Date = new Date()
): BudgetSummary {
  const { start, end } = getDateRange(period, referenceDate);
  const filteredTransactions = filterTransactionsByPeriod(transactions, period, referenceDate);
  
  const incomeTransactions = filteredTransactions.filter(t => t.type === 'income');
  const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
  
  const incomeCategoryTotals = calculateCategoryTotals(filteredTransactions, 'income');
  const expenseCategoryTotals = calculateCategoryTotals(filteredTransactions, 'expense');
  
  const income_categories: BudgetCategory[] = Array.from(incomeCategoryTotals.entries()).map(([category, amount]) => ({
    category: category as TransactionCategory,
    budgeted_amount: 0,
    actual_amount: amount,
    difference: amount,
    percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
  }));
  
  const expense_categories: BudgetCategory[] = Array.from(expenseCategoryTotals.entries()).map(([category, amount]) => ({
    category: category as TransactionCategory,
    budgeted_amount: 0,
    actual_amount: amount,
    difference: -amount,
    percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
  }));
  
  return {
    period,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_balance: netBalance,
    savings_rate: savingsRate,
    income_categories,
    expense_categories
  };
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    salary: 'Salary',
    freelance: 'Freelance',
    investment: 'Investment',
    other_income: 'Other Income',
    rent: 'Rent',
    utilities: 'Utilities',
    groceries: 'Groceries',
    transportation: 'Transportation',
    entertainment: 'Entertainment',
    healthcare: 'Healthcare',
    insurance: 'Insurance',
    other_expense: 'Other Expense'
  };
  return labels[category] || category;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    salary: '#10b981',
    freelance: '#3b82f6',
    investment: '#8b5cf6',
    other_income: '#06b6d4',
    rent: '#ef4444',
    utilities: '#f59e0b',
    groceries: '#84cc16',
    transportation: '#06b6d4',
    entertainment: '#ec4899',
    healthcare: '#f43f5e',
    insurance: '#6366f1',
    other_expense: '#64748b'
  };
  return colors[category] || '#64748b';
}