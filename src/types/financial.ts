/**
 * Financial Dashboard Type Definitions
 */

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  occupancyRate: number;
  vacancyRate: number;
  collectionRate: number;
  averageRent: number;
  monthlyRecurringRevenue: number;
  outstandingBalance: number;
  overdueAmount: number;
  revenueGrowth: number;
  expenseRatio: number;
  netOperatingIncome: number;
}

export interface MetricTrend {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface KPIData {
  label: string;
  value: number;
  trend: MetricTrend;
  format: 'currency' | 'percentage' | 'number';
  icon?: string;
  color?: string;
}

export interface RevenueData {
  month: string;
  date: Date;
  totalRevenue: number;
  collectedRevenue: number;
  expectedRevenue: number;
  pendingRevenue: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface CashFlowData {
  month: string;
  date: Date;
  income: number;
  expenses: number;
  netCashFlow: number;
}

export interface OccupancyData {
  month: string;
  date: Date;
  occupancyRate: number;
  occupiedUnits: number;
  totalUnits: number;
}

export interface PropertyPerformance {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  occupancyRate: number;
  unitCount: number;
  averageRent: number;
}

export interface Transaction {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  propertyName: string;
  propertyId: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
  propertyIds?: string[];
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface DashboardFilters {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  properties: string[];
  comparisonPeriod?: 'previous' | 'year_ago';
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  includeCharts: boolean;
  includeRawData: boolean;
  filename?: string;
}

export type DateRangePreset = 
  | 'last_7_days'
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface PaymentStatusData {
  month: string;
  date: Date;
  paid: number;
  pending: number;
  overdue: number;
}

export interface FinancialReport {
  id: string;
  type: 'income_statement' | 'cash_flow' | 'property_performance' | 'rent_roll';
  title: string;
  generatedAt: Date;
  dateRange: DateRangeFilter;
  data: unknown;
}