/**
 * Report Types
 * Types for custom report builder and analytics
 */

export type ReportMetric =
  | 'revenue'
  | 'expenses'
  | 'net_income'
  | 'occupancy_rate'
  | 'maintenance_costs'
  | 'rent_collection_rate'
  | 'vacancy_rate'
  | 'tenant_turnover'
  | 'average_rent'
  | 'total_units'
  | 'occupied_units'
  | 'vacant_units';

export type ReportGrouping = 'property' | 'month' | 'quarter' | 'year' | 'tenant' | 'unit_type';

export type ReportDateRange = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year' | 'year_to_date' | 'custom';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export type ComparisonType = 'year_over_year' | 'month_over_month' | 'quarter_over_quarter' | 'property_comparison';

export interface ReportField {
  id: string;
  label: string;
  metric: ReportMetric;
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max';
  format?: 'currency' | 'percentage' | 'number';
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
  value: string | number | [number, number];
}

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy: ReportGrouping[];
  dateRange: {
    type: ReportDateRange;
    startDate?: string;
    endDate?: string;
  };
  sortBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'table';
  includeComparison?: boolean;
  comparisonType?: ComparisonType;
  propertyIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

export interface ReportTemplate extends ReportConfig {
  id: string;
  isPublic: boolean;
  usageCount: number;
}

export interface ReportData {
  headers: string[];
  rows: Record<string, string | number>[];
  summary?: Record<string, number>;
  chartData?: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }[];
  };
}

export interface ComparativeData {
  current: ReportData;
  previous: ReportData;
  comparison: {
    metric: string;
    currentValue: number;
    previousValue: number;
    change: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface ReportSchedule {
  id: string;
  reportConfigId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  format: ExportFormat;
  nextRunDate: string;
  isActive: boolean;
}

export interface AvailableMetric {
  id: ReportMetric;
  label: string;
  description: string;
  category: 'financial' | 'occupancy' | 'maintenance' | 'tenant';
  defaultAggregation: 'sum' | 'average' | 'count';
  format: 'currency' | 'percentage' | 'number';
}