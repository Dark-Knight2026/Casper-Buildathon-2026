import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AnalyticsService } from '@/services/analyticsService';
import FinancialSummaryCard from '@/components/analytics/FinancialSummaryCard';
import OccupancyCard from '@/components/analytics/OccupancyCard';
import PaymentTrendsChart from '@/components/analytics/PaymentTrendsChart';
import MaintenanceAnalyticsCard from '@/components/analytics/MaintenanceAnalyticsCard';
import { supabase } from '@/lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Download, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Legacy types for backward compatibility
interface FinancialReport {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
}

interface OccupancyMetrics {
  currentOccupancy: number;
  vacantUnits: number;
  totalUnits: number;
}

interface MaintenanceAnalytics {
  totalRequests: number;
  completedRequests: number;
  averageResolutionTime: number;
  totalCost: number;
}

interface PaymentTrends {
  onTimeRate: number;
  latePayments: number;
  totalPayments: number;
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [occupancyMetrics, setOccupancyMetrics] = useState<OccupancyMetrics | null>(null);
  const [maintenanceAnalytics, setMaintenanceAnalytics] = useState<MaintenanceAnalytics | null>(null);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrends | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      // Use new AnalyticsService
      const [financial, occupancy, maintenance] = await Promise.all([
        AnalyticsService.getFinancialAnalytics(user.id, { from: startDate, to: endDate }),
        AnalyticsService.getOccupancyAnalytics(user.id, { from: startDate, to: endDate }),
        AnalyticsService.getMaintenanceAnalytics(user.id, { from: startDate, to: endDate }),
      ]);

      // Map to legacy format
      setFinancialReport({
        totalRevenue: financial.overview.totalRevenue,
        totalExpenses: financial.overview.totalExpenses,
        netIncome: financial.overview.netOperatingIncome,
        collectionRate: financial.rentCollectionRate[financial.rentCollectionRate.length - 1]?.rate || 0,
      });

      setOccupancyMetrics({
        currentOccupancy: occupancy.overview.currentOccupancyRate,
        vacantUnits: occupancy.overview.vacantUnitsCount,
        totalUnits: occupancy.overview.vacantUnitsCount + Math.round(occupancy.overview.currentOccupancyRate),
      });

      setMaintenanceAnalytics({
        totalRequests: maintenance.overview.totalRequests,
        completedRequests: maintenance.requestsOverTime.reduce((sum, r) => sum + r.count, 0),
        averageResolutionTime: maintenance.overview.averageResolutionTime,
        totalCost: maintenance.overview.totalCosts,
      });

      setPaymentTrends({
        onTimeRate: financial.rentCollectionRate[financial.rentCollectionRate.length - 1]?.rate || 0,
        latePayments: financial.latePaymentTrends.reduce((sum, l) => sum + l.count, 0),
        totalPayments: 0,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    if (!financialReport || !occupancyMetrics || !paymentTrends) return;

    const exportData = [
      {
        metric: 'Total Revenue',
        value: financialReport.totalRevenue,
      },
      {
        metric: 'Total Expenses',
        value: financialReport.totalExpenses,
      },
      {
        metric: 'Net Income',
        value: financialReport.netIncome,
      },
      {
        metric: 'Collection Rate',
        value: `${financialReport.collectionRate.toFixed(1)}%`,
      },
      {
        metric: 'Occupancy Rate',
        value: `${occupancyMetrics.currentOccupancy.toFixed(1)}%`,
      },
      {
        metric: 'On-Time Payment Rate',
        value: `${paymentTrends.onTimeRate.toFixed(1)}%`,
      },
    ];

    AnalyticsService.exportToCSV(exportData, `analytics-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive property management insights</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {financialReport && <FinancialSummaryCard report={financialReport} />}
        {occupancyMetrics && <OccupancyCard metrics={occupancyMetrics} />}
      </div>

      {paymentTrends && <PaymentTrendsChart trends={paymentTrends} />}

      {maintenanceAnalytics && <MaintenanceAnalyticsCard analytics={maintenanceAnalytics} />}
    </div>
  );
}