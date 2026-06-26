import { ScheduleEProperty } from '@/types/landlordTax';

/**
 * Calculates the annual depreciation using Straight-Line method.
 * @param costBasis - The total cost of the property/asset.
 * @param landValue - The value of the land (not depreciable).
 * @param recoveryPeriodYears - The recovery period in years (e.g., 27.5 for residential rental).
 * @returns The annual depreciation amount.
 */
export const calculateStraightLineDepreciation = (
  costBasis: number,
  landValue: number,
  recoveryPeriodYears: number = 27.5
): number => {
  const depreciableBasis = Math.max(0, costBasis - landValue);
  if (depreciableBasis === 0 || recoveryPeriodYears <= 0) return 0;
  return depreciableBasis / recoveryPeriodYears;
};

/**
 * Calculates the net income for a property based on Schedule E rules.
 * @param income - Total rents and royalties received.
 * @param expenses - Object containing all expense categories.
 * @returns The net income (or loss).
 */
export const calculateNetIncome = (
  income: { rentsReceived: number; royaltiesReceived: number },
  expenses: ScheduleEProperty['expenses']
): number => {
  const totalIncome = income.rentsReceived + income.royaltiesReceived;
  
  const totalExpenses =
    expenses.advertising +
    expenses.auto +
    expenses.cleaning +
    expenses.commissions +
    expenses.insurance +
    expenses.legal +
    expenses.management +
    expenses.mortgageInterest +
    expenses.otherInterest +
    expenses.repairs +
    expenses.supplies +
    expenses.taxes +
    expenses.utilities +
    expenses.depreciation +
    expenses.other.reduce((sum, item) => sum + item.amount, 0);

  return totalIncome - totalExpenses;
};

/**
 * Estimates tax liability based on net income and a tax bracket.
 * @param netIncome - The taxable net income.
 * @param taxRate - The estimated tax rate (e.g., 0.24 for 24%).
 * @returns The estimated tax amount (0 if net income is negative).
 */
export const estimateTaxLiability = (netIncome: number, taxRate: number = 0.24): number => {
  if (netIncome <= 0) return 0;
  return netIncome * taxRate;
};

/**
 * Aggregates expenses by category for reporting.
 * @param expenses - The expenses object.
 * @returns Array of category and amount.
 */
export const aggregateExpensesByCategory = (expenses: ScheduleEProperty['expenses']) => {
  const categories = [
    { id: 'advertising', amount: expenses.advertising },
    { id: 'auto', amount: expenses.auto },
    { id: 'cleaning', amount: expenses.cleaning },
    { id: 'commissions', amount: expenses.commissions },
    { id: 'insurance', amount: expenses.insurance },
    { id: 'legal', amount: expenses.legal },
    { id: 'management', amount: expenses.management },
    { id: 'mortgageInterest', amount: expenses.mortgageInterest },
    { id: 'otherInterest', amount: expenses.otherInterest },
    { id: 'repairs', amount: expenses.repairs },
    { id: 'supplies', amount: expenses.supplies },
    { id: 'taxes', amount: expenses.taxes },
    { id: 'utilities', amount: expenses.utilities },
    { id: 'depreciation', amount: expenses.depreciation },
    { id: 'other', amount: expenses.other.reduce((sum, item) => sum + item.amount, 0) },
  ];
  
  return categories.sort((a, b) => b.amount - a.amount);
};