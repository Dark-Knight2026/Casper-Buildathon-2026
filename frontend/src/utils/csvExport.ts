/**
 * CSV Export Utility
 * Provides functions to export data to CSV format
 */

import Papa from 'papaparse';
import { logger } from '@/utils/logger';

export interface CSVExportOptions {
  filename?: string;
  headers?: string[];
  delimiter?: string;
  includeTimestamp?: boolean;
}

/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param options - Export options
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: CSVExportOptions = {}
): void {
  try {
    const {
      filename = 'export',
      headers,
      delimiter = ',',
      includeTimestamp = true,
    } = options;

    if (!data || data.length === 0) {
      logger.warn('No data to export');
      return;
    }

    // Configure Papa Parse options
    const config: Papa.UnparseConfig = {
      delimiter,
      header: true,
      ...(headers && { columns: headers }),
    };

    // Convert data to CSV
    const csv = Papa.unparse(data, config);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename with timestamp if requested
    const timestamp = includeTimestamp
      ? `_${new Date().toISOString().split('T')[0]}`
      : '';
    const finalFilename = `${filename}${timestamp}.csv`;
    
    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    logger.info('CSV export successful', { filename: finalFilename, rows: data.length });
  } catch (error) {
    logger.error('Failed to export CSV', error);
    throw new Error('Failed to export data to CSV');
  }
}

/**
 * Export analytics data to CSV with proper formatting
 */
export function exportAnalyticsToCSV(
  data: Record<string, unknown>[],
  filename: string,
  formatters?: Record<string, (value: unknown) => string>
): void {
  try {
    // Apply formatters if provided
    const formattedData = formatters
      ? data.map(row => {
          const formatted: Record<string, unknown> = {};
          Object.keys(row).forEach(key => {
            formatted[key] = formatters[key] ? formatters[key](row[key]) : row[key];
          });
          return formatted;
        })
      : data;

    exportToCSV(formattedData, { filename, includeTimestamp: true });
  } catch (error) {
    logger.error('Failed to export analytics CSV', error);
    throw error;
  }
}

/**
 * Format currency values for CSV export
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage values for CSV export
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format date values for CSV export
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format datetime values for CSV export
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Export financial analytics data
 */
export function exportFinancialData(data: {
  revenueVsExpenses: Record<string, unknown>[];
  revenueByProperty: Record<string, unknown>[];
  expenseCategories: Record<string, unknown>[];
}): void {
  const formatters = {
    revenue: formatCurrency,
    expenses: formatCurrency,
    amount: formatCurrency,
  };

  // Export revenue vs expenses
  exportAnalyticsToCSV(
    data.revenueVsExpenses,
    'financial-revenue-expenses',
    formatters
  );

  // Export revenue by property
  exportAnalyticsToCSV(
    data.revenueByProperty,
    'financial-revenue-by-property',
    formatters
  );

  // Export expense categories
  exportAnalyticsToCSV(
    data.expenseCategories,
    'financial-expense-categories',
    formatters
  );
}

/**
 * Export occupancy analytics data
 */
export function exportOccupancyData(data: {
  occupancyOverTime: Record<string, unknown>[];
  propertyOccupancy: Record<string, unknown>[];
  vacantUnits: Record<string, unknown>[];
}): void {
  const formatters = {
    rate: formatPercentage,
    occupancyRate: formatPercentage,
    estimatedLostRevenue: formatCurrency,
  };

  // Export occupancy over time
  exportAnalyticsToCSV(
    data.occupancyOverTime,
    'occupancy-over-time',
    formatters
  );

  // Export property occupancy
  exportAnalyticsToCSV(
    data.propertyOccupancy,
    'occupancy-by-property',
    formatters
  );

  // Export vacant units
  exportAnalyticsToCSV(
    data.vacantUnits,
    'vacant-units',
    formatters
  );
}

/**
 * Export maintenance analytics data
 */
export function exportMaintenanceData(data: {
  requestsByStatus: Record<string, unknown>[];
  requestsByCategory: Record<string, unknown>[];
  averageResolutionTime: Record<string, unknown>[];
}): void {
  // Export all maintenance data
  exportAnalyticsToCSV(
    data.requestsByStatus,
    'maintenance-by-status'
  );

  exportAnalyticsToCSV(
    data.requestsByCategory,
    'maintenance-by-category'
  );

  exportAnalyticsToCSV(
    data.averageResolutionTime,
    'maintenance-resolution-time'
  );
}

/**
 * Export tenant analytics data
 */
export function exportTenantData(data: {
  tenantsByProperty: Record<string, unknown>[];
  leaseExpirations: Record<string, unknown>[];
  paymentHistory: Record<string, unknown>[];
}): void {
  const formatters = {
    monthlyRent: formatCurrency,
    amount: formatCurrency,
    leaseStartDate: formatDate,
    leaseEndDate: formatDate,
  };

  // Export all tenant data
  exportAnalyticsToCSV(
    data.tenantsByProperty,
    'tenants-by-property',
    formatters
  );

  exportAnalyticsToCSV(
    data.leaseExpirations,
    'lease-expirations',
    formatters
  );

  exportAnalyticsToCSV(
    data.paymentHistory,
    'payment-history',
    formatters
  );
}