import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import KPIGrid from '@/components/financial/KPIGrid';
import RevenueTrendChart from '@/components/financial/charts/RevenueTrendChart';
import ExpenseBreakdownChart from '@/components/financial/charts/ExpenseBreakdownChart';
import CashFlowChart from '@/components/financial/charts/CashFlowChart';
import OccupancyTrendChart from '@/components/financial/charts/OccupancyTrendChart';
import PropertyPerformanceChart from '@/components/financial/charts/PropertyPerformanceChart';
import { financialDataService } from '@/services/financialDataService';
import type { KPIData, DateRangeFilter } from '@/types/financial';

export default function FinancialDashboard() {
  const [dateRange] = useState<DateRangeFilter>({
    startDate: startOfMonth(subMonths(new Date(), 11)),
    endDate: endOfMonth(new Date()),
  });

  // Fetch financial metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['financial-metrics', dateRange],
    queryFn: () => financialDataService.getFinancialMetrics(dateRange),
  });

  // Fetch revenue trend
  const { data: revenueTrend, isLoading: revenueTrendLoading } = useQuery({
    queryKey: ['revenue-trend', dateRange],
    queryFn: () => financialDataService.getRevenueTrend(dateRange),
  });

  // Fetch expense breakdown
  const { data: expenseBreakdown, isLoading: expenseBreakdownLoading } = useQuery({
    queryKey: ['expense-breakdown', dateRange],
    queryFn: () => financialDataService.getExpenseBreakdown(dateRange),
  });

  // Fetch cash flow data
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['cash-flow', dateRange],
    queryFn: () => financialDataService.getCashFlowData(dateRange),
  });

  // Fetch occupancy trend
  const { data: occupancyTrend, isLoading: occupancyTrendLoading } = useQuery({
    queryKey: ['occupancy-trend', dateRange],
    queryFn: () => financialDataService.getOccupancyTrend(dateRange),
  });

  // Fetch property performance
  const { data: propertyPerformance, isLoading: propertyPerformanceLoading } = useQuery({
    queryKey: ['property-performance', dateRange],
    queryFn: () => financialDataService.getPropertyPerformance(dateRange),
  });

  // Prepare KPI data
  const kpis: KPIData[] = metrics ? [
    {
      label: 'Total Revenue',
      value: metrics.totalRevenue,
      trend: financialDataService.calculateTrend(
        metrics.totalRevenue,
        metrics.totalRevenue / (1 + metrics.revenueGrowth / 100)
      ),
      format: 'currency',
    },
    {
      label: 'Net Income',
      value: metrics.netIncome,
      trend: financialDataService.calculateTrend(
        metrics.netIncome,
        metrics.netIncome * 0.92
      ),
      format: 'currency',
    },
    {
      label: 'Occupancy Rate',
      value: metrics.occupancyRate,
      trend: financialDataService.calculateTrend(
        metrics.occupancyRate,
        metrics.occupancyRate - 2
      ),
      format: 'percentage',
    },
    {
      label: 'Collection Rate',
      value: metrics.collectionRate,
      trend: financialDataService.calculateTrend(
        metrics.collectionRate,
        metrics.collectionRate - 1
      ),
      format: 'percentage',
    },
  ] : [];

  const handleRefresh = () => {
    refetchMetrics();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financial Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Overview of your property portfolio's financial performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <KPIGrid kpis={kpis} loading={metricsLoading} />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueTrendChart data={revenueTrend || []} loading={revenueTrendLoading} />
          <ExpenseBreakdownChart data={expenseBreakdown || []} loading={expenseBreakdownLoading} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashFlowChart data={cashFlowData || []} loading={cashFlowLoading} />
          <OccupancyTrendChart data={occupancyTrend || []} loading={occupancyTrendLoading} />
        </div>

        {/* Property Performance */}
        <PropertyPerformanceChart
          data={propertyPerformance || []}
          loading={propertyPerformanceLoading}
        />
      </div>
    </div>
  );
}