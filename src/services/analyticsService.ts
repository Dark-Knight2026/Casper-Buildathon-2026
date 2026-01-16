import { supabase } from '@/lib/supabase/client';

export interface DateRange {
  from: string;
  to: string;
}

export interface FinancialAnalytics {
  overview: {
    totalRevenue: number;
    totalExpenses: number;
    netOperatingIncome: number;
    cashFlow: number;
    occupancyRate: number;
    averageRentPerUnit: number;
  };
  revenueVsExpenses: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
  revenueByProperty: Array<{
    propertyName: string;
    revenue: number;
  }>;
  expenseCategories: Array<{
    category: string;
    amount: number;
  }>;
  rentCollectionRate: Array<{
    month: string;
    rate: number;
  }>;
  latePaymentTrends: Array<{
    month: string;
    count: number;
  }>;
  metrics: {
    grossRentalYield: number;
    netRentalYield: number;
    capRate: number;
    cashOnCashReturn: number;
    dscr: number;
  };
}

export interface OccupancyAnalytics {
  overview: {
    currentOccupancyRate: number;
    vacantUnitsCount: number;
    averageLeaseDuration: number;
    tenantTurnoverRate: number;
    daysToLease: number;
  };
  occupancyOverTime: Array<{
    month: string;
    rate: number;
  }>;
  leaseExpirations: Array<{
    month: string;
    count: number;
  }>;
  moveInOutTrends: Array<{
    month: string;
    moveIns: number;
    moveOuts: number;
  }>;
  propertyOccupancy: Array<{
    propertyName: string;
    occupancyRate: number;
  }>;
  vacantUnits: Array<{
    propertyName: string;
    address: string;
    vacancyDuration: number;
    estimatedLostRevenue: number;
  }>;
  leaseRenewalRate: number;
}

export interface MaintenanceAnalytics {
  overview: {
    totalRequests: number;
    averageResolutionTime: number;
    totalCosts: number;
    pendingRequests: number;
    vendorPerformanceScore: number;
  };
  requestsOverTime: Array<{
    month: string;
    count: number;
  }>;
  requestTypes: Array<{
    type: string;
    count: number;
  }>;
  resolutionTimeByPriority: Array<{
    priority: string;
    hours: number;
  }>;
  costsByProperty: Array<{
    propertyName: string;
    cost: number;
  }>;
  vendorPerformance: Array<{
    vendorName: string;
    completedJobs: number;
    avgResolutionTime: number;
    rating: number;
  }>;
  insights: {
    mostCommonIssues: Array<{ issue: string; count: number }>;
    mostExpensiveRepairs: Array<{ description: string; cost: number }>;
    fastestVendors: Array<{ name: string; avgTime: number }>;
    propertiesWithMostRequests: Array<{ name: string; count: number }>;
  };
}

export interface TenantAnalytics {
  overview: {
    totalActiveTenants: number;
    averageTenantRating: number;
    onTimePaymentRate: number;
    leaseRenewalRate: number;
    averageTenantTenure: number;
  };
  paymentHistory: Array<{
    month: string;
    onTimeRate: number;
  }>;
  tenantSatisfaction: Array<{
    rating: number;
    count: number;
  }>;
  leaseRenewalVsTurnover: {
    renewals: number;
    turnovers: number;
  };
  insights: {
    topRatedTenants: Array<{
      name: string;
      rating: number;
      tenure: number;
    }>;
    paymentDelinquency: Array<{
      name: string;
      amountOwed: number;
      daysPastDue: number;
    }>;
    leaseExpirations: Array<{
      name: string;
      propertyName: string;
      expirationDate: string;
      daysUntilExpiration: number;
    }>;
  };
}

export interface PropertyComparison {
  properties: Array<{
    id: string;
    name: string;
    revenue: number;
    expenses: number;
    noi: number;
    occupancyRate: number;
    maintenanceCosts: number;
    tenantSatisfaction: number;
    daysToLease: number;
    performanceScore: number;
  }>;
  bestPerforming: string;
  worstPerforming: string;
  recommendations: Array<{
    propertyId: string;
    recommendation: string;
  }>;
}

export class AnalyticsService {
  /**
   * Get financial analytics
   */
  static async getFinancialAnalytics(
    landlordId: string,
    dateRange: DateRange,
    propertyId?: string
  ): Promise<FinancialAnalytics> {
    // Build query for financial summary
    let query = supabase
      .from('financial_summary')
      .select('*')
      .eq('landlord_id', landlordId)
      .gte('month', dateRange.from)
      .lte('month', dateRange.to);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: financialData, error } = await query;

    if (error) throw error;

    // Calculate overview metrics
    const totalRevenue = financialData?.reduce((sum, row) => sum + (row.total_revenue || 0), 0) || 0;
    const totalExpenses = financialData?.reduce((sum, row) => sum + (row.total_expense || 0), 0) || 0;
    const netOperatingIncome = totalRevenue - totalExpenses;

    // Get occupancy data
    const { data: occupancyData } = await supabase
      .from('occupancy_summary')
      .select('*')
      .eq('landlord_id', landlordId);

    const avgOccupancyRate = occupancyData?.reduce((sum, row) => sum + (row.occupancy_rate || 0), 0) / (occupancyData?.length || 1) || 0;
    const avgRentPerUnit = occupancyData?.reduce((sum, row) => sum + (row.avg_rent || 0), 0) / (occupancyData?.length || 1) || 0;

    // Revenue vs Expenses trend
    const monthlyData = new Map<string, { revenue: number; expenses: number }>();
    financialData?.forEach((row) => {
      const month = new Date(row.month).toISOString().slice(0, 7);
      const existing = monthlyData.get(month) || { revenue: 0, expenses: 0 };
      monthlyData.set(month, {
        revenue: existing.revenue + (row.total_revenue || 0),
        expenses: existing.expenses + (row.total_expense || 0),
      });
    });

    const revenueVsExpenses = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expenses: data.expenses,
    }));

    // Revenue by property
    const propertyRevenue = new Map<string, number>();
    financialData?.forEach((row) => {
      const existing = propertyRevenue.get(row.property_name) || 0;
      propertyRevenue.set(row.property_name, existing + (row.total_revenue || 0));
    });

    const revenueByProperty = Array.from(propertyRevenue.entries()).map(([propertyName, revenue]) => ({
      propertyName,
      revenue,
    }));

    // Expense categories
    const expenseCategories = [
      { category: 'Maintenance', amount: financialData?.reduce((sum, row) => sum + (row.maintenance_expense || 0), 0) || 0 },
      { category: 'Utilities', amount: financialData?.reduce((sum, row) => sum + (row.utility_expense || 0), 0) || 0 },
      { category: 'Insurance', amount: financialData?.reduce((sum, row) => sum + (row.insurance_expense || 0), 0) || 0 },
      { category: 'Tax', amount: financialData?.reduce((sum, row) => sum + (row.tax_expense || 0), 0) || 0 },
    ];

    // Rent collection rate
    const rentCollectionRate = Array.from(monthlyData.entries()).map(([month, _]) => {
      const monthData = financialData?.filter((row) => new Date(row.month).toISOString().slice(0, 7) === month);
      const completed = monthData?.reduce((sum, row) => sum + (row.completed_payments || 0), 0) || 0;
      const total = completed + (monthData?.reduce((sum, row) => sum + (row.late_payments || 0), 0) || 0);
      return {
        month,
        rate: total > 0 ? (completed / total) * 100 : 100,
      };
    });

    // Late payment trends
    const latePaymentTrends = Array.from(monthlyData.entries()).map(([month, _]) => {
      const monthData = financialData?.filter((row) => new Date(row.month).toISOString().slice(0, 7) === month);
      return {
        month,
        count: monthData?.reduce((sum, row) => sum + (row.late_payments || 0), 0) || 0,
      };
    });

    // Calculate financial metrics
    const { data: propertyData } = await supabase
      .from('properties')
      .select('purchase_price')
      .eq('landlord_id', landlordId);

    const totalPurchasePrice = propertyData?.reduce((sum, p) => sum + (p.purchase_price || 0), 0) || 1;
    const annualRevenue = totalRevenue * 12;
    const annualExpenses = totalExpenses * 12;

    return {
      overview: {
        totalRevenue,
        totalExpenses,
        netOperatingIncome,
        cashFlow: netOperatingIncome,
        occupancyRate: avgOccupancyRate,
        averageRentPerUnit: avgRentPerUnit,
      },
      revenueVsExpenses,
      revenueByProperty,
      expenseCategories,
      rentCollectionRate,
      latePaymentTrends,
      metrics: {
        grossRentalYield: totalPurchasePrice > 0 ? (annualRevenue / totalPurchasePrice) * 100 : 0,
        netRentalYield: totalPurchasePrice > 0 ? ((annualRevenue - annualExpenses) / totalPurchasePrice) * 100 : 0,
        capRate: totalPurchasePrice > 0 ? (netOperatingIncome * 12 / totalPurchasePrice) * 100 : 0,
        cashOnCashReturn: totalPurchasePrice > 0 ? (netOperatingIncome * 12 / totalPurchasePrice) * 100 : 0,
        dscr: annualExpenses > 0 ? annualRevenue / annualExpenses : 0,
      },
    };
  }

  /**
   * Get occupancy analytics
   */
  static async getOccupancyAnalytics(
    landlordId: string,
    dateRange: DateRange,
    propertyId?: string
  ): Promise<OccupancyAnalytics> {
    let query = supabase
      .from('occupancy_summary')
      .select('*')
      .eq('landlord_id', landlordId);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate overview
    const totalUnits = data?.reduce((sum, row) => sum + (row.total_units || 0), 0) || 0;
    const occupiedUnits = data?.reduce((sum, row) => sum + (row.occupied_units || 0), 0) || 0;
    const vacantUnits = data?.reduce((sum, row) => sum + (row.vacant_units || 0), 0) || 0;
    const currentOccupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    const averageLeaseDuration = data?.reduce((sum, row) => sum + (row.avg_lease_duration_days || 0), 0) / (data?.length || 1) || 0;

    // Get lease data for turnover calculation
    const { data: leaseData } = await supabase
      .from('leases')
      .select('*')
      .eq('landlord_id', landlordId)
      .gte('end_date', dateRange.from)
      .lte('end_date', dateRange.to);

    const completedLeases = leaseData?.filter((l) => l.status === 'completed').length || 0;
    const totalLeases = leaseData?.length || 1;
    const tenantTurnoverRate = (completedLeases / totalLeases) * 100;

    // Vacant units details
    const vacantUnitsList = data?.filter((row) => row.vacant_units > 0).map((row) => ({
      propertyName: row.property_name,
      address: row.address,
      vacancyDuration: 30, // TODO: Calculate actual vacancy duration
      estimatedLostRevenue: row.avg_rent * (row.vacant_units || 0),
    })) || [];

    return {
      overview: {
        currentOccupancyRate,
        vacantUnitsCount: vacantUnits,
        averageLeaseDuration,
        tenantTurnoverRate,
        daysToLease: 15, // TODO: Calculate from actual data
      },
      occupancyOverTime: [
        { month: '2024-01', rate: 95 },
        { month: '2024-02', rate: 93 },
        { month: '2024-03', rate: currentOccupancyRate },
      ],
      leaseExpirations: [
        { month: '2024-04', count: 2 },
        { month: '2024-05', count: 3 },
        { month: '2024-06', count: 1 },
      ],
      moveInOutTrends: [
        { month: '2024-01', moveIns: 2, moveOuts: 1 },
        { month: '2024-02', moveIns: 1, moveOuts: 2 },
        { month: '2024-03', moveIns: 3, moveOuts: 1 },
      ],
      propertyOccupancy: data?.map((row) => ({
        propertyName: row.property_name,
        occupancyRate: row.occupancy_rate || 0,
      })) || [],
      vacantUnits: vacantUnitsList,
      leaseRenewalRate: 75, // TODO: Calculate from actual data
    };
  }

  /**
   * Get maintenance analytics
   */
  static async getMaintenanceAnalytics(
    landlordId: string,
    dateRange: DateRange,
    propertyId?: string
  ): Promise<MaintenanceAnalytics> {
    let query = supabase
      .from('maintenance_summary')
      .select('*')
      .eq('landlord_id', landlordId)
      .gte('month', dateRange.from)
      .lte('month', dateRange.to);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate overview
    const totalRequests = data?.reduce((sum, row) => sum + (row.total_requests || 0), 0) || 0;
    const completedRequests = data?.reduce((sum, row) => sum + (row.completed_requests || 0), 0) || 0;
    const pendingRequests = data?.reduce((sum, row) => sum + (row.pending_requests || 0), 0) || 0;
    const totalCosts = data?.reduce((sum, row) => sum + (row.total_cost || 0), 0) || 0;
    const avgResolutionTime = data?.reduce((sum, row) => sum + (row.avg_resolution_hours || 0), 0) / (data?.length || 1) || 0;

    // Requests over time
    const monthlyRequests = new Map<string, number>();
    data?.forEach((row) => {
      const month = new Date(row.month).toISOString().slice(0, 7);
      monthlyRequests.set(month, (monthlyRequests.get(month) || 0) + (row.total_requests || 0));
    });

    const requestsOverTime = Array.from(monthlyRequests.entries()).map(([month, count]) => ({
      month,
      count,
    }));

    // Request types
    const requestTypes = new Map<string, number>();
    data?.forEach((row) => {
      requestTypes.set(row.request_category, (requestTypes.get(row.request_category) || 0) + (row.total_requests || 0));
    });

    const requestTypesArray = Array.from(requestTypes.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    // Costs by property
    const propertyCosts = new Map<string, number>();
    data?.forEach((row) => {
      propertyCosts.set(row.property_name, (propertyCosts.get(row.property_name) || 0) + (row.total_cost || 0));
    });

    const costsByProperty = Array.from(propertyCosts.entries()).map(([propertyName, cost]) => ({
      propertyName,
      cost,
    }));

    return {
      overview: {
        totalRequests,
        averageResolutionTime: avgResolutionTime,
        totalCosts,
        pendingRequests,
        vendorPerformanceScore: 85, // TODO: Calculate from vendor data
      },
      requestsOverTime,
      requestTypes: requestTypesArray,
      resolutionTimeByPriority: [
        { priority: 'Emergency', hours: 4 },
        { priority: 'High', hours: 24 },
        { priority: 'Medium', hours: 72 },
        { priority: 'Low', hours: 168 },
      ],
      costsByProperty,
      vendorPerformance: [],
      insights: {
        mostCommonIssues: requestTypesArray.slice(0, 5),
        mostExpensiveRepairs: [],
        fastestVendors: [],
        propertiesWithMostRequests: costsByProperty.slice(0, 5).map((p) => ({ name: p.propertyName, count: 0 })),
      },
    };
  }

  /**
   * Get tenant analytics
   */
  static async getTenantAnalytics(
    landlordId: string,
    dateRange: DateRange,
    propertyId?: string
  ): Promise<TenantAnalytics> {
    const { data, error } = await supabase
      .from('tenant_summary')
      .select('*')
      .eq('landlord_id', landlordId);

    if (error) throw error;

    // Calculate overview
    const totalActiveTenants = data?.filter((t) => t.active_leases > 0).length || 0;
    const averageTenantRating = data?.reduce((sum, t) => sum + (t.avg_rating || 0), 0) / (data?.length || 1) || 0;
    const avgOnTimePaymentRate = data?.reduce((sum, t) => sum + (t.on_time_payment_rate || 0), 0) / (data?.length || 1) || 0;
    const avgTenantTenure = data?.reduce((sum, t) => sum + (t.total_tenure_days || 0), 0) / (data?.length || 1) || 0;

    return {
      overview: {
        totalActiveTenants,
        averageTenantRating,
        onTimePaymentRate: avgOnTimePaymentRate,
        leaseRenewalRate: 75,
        averageTenantTenure: avgTenantTenure,
      },
      paymentHistory: [
        { month: '2024-01', onTimeRate: 95 },
        { month: '2024-02', onTimeRate: 93 },
        { month: '2024-03', onTimeRate: avgOnTimePaymentRate },
      ],
      tenantSatisfaction: [
        { rating: 5, count: 10 },
        { rating: 4, count: 5 },
        { rating: 3, count: 2 },
        { rating: 2, count: 1 },
        { rating: 1, count: 0 },
      ],
      leaseRenewalVsTurnover: {
        renewals: 15,
        turnovers: 5,
      },
      insights: {
        topRatedTenants: data?.filter((t) => t.avg_rating >= 4).slice(0, 5).map((t) => ({
          name: `${t.first_name} ${t.last_name}`,
          rating: t.avg_rating || 0,
          tenure: t.total_tenure_days || 0,
        })) || [],
        paymentDelinquency: data?.filter((t) => t.late_payments > 0).slice(0, 5).map((t) => ({
          name: `${t.first_name} ${t.last_name}`,
          amountOwed: 0,
          daysPastDue: 0,
        })) || [],
        leaseExpirations: [],
      },
    };
  }

  /**
   * Get property comparison
   */
  static async getPropertyComparison(
    landlordId: string,
    dateRange: DateRange
  ): Promise<PropertyComparison> {
    const { data, error } = await supabase
      .from('property_performance')
      .select('*')
      .eq('landlord_id', landlordId)
      .order('performance_score', { ascending: false });

    if (error) throw error;

    const properties = data?.map((p) => ({
      id: p.property_id,
      name: p.property_name,
      revenue: p.total_revenue || 0,
      expenses: p.total_expense || 0,
      noi: p.net_operating_income || 0,
      occupancyRate: p.occupancy_rate || 0,
      maintenanceCosts: p.maintenance_cost || 0,
      tenantSatisfaction: 4.5,
      daysToLease: 15,
      performanceScore: p.performance_score || 0,
    })) || [];

    return {
      properties,
      bestPerforming: properties[0]?.name || '',
      worstPerforming: properties[properties.length - 1]?.name || '',
      recommendations: properties.map((p) => ({
        propertyId: p.id,
        recommendation: p.performanceScore < 50 ? 'Consider improving maintenance response time and occupancy rate' : 'Performing well',
      })),
    };
  }

  /**
   * Export to CSV
   */
  static exportToCSV(data: unknown[], filename: string): void {
    // Simple CSV export implementation
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: unknown[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((row) =>
      headers.map((header) => {
        const value = (row as Record<string, unknown>)[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}