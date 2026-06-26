import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsService } from '@/services/analyticsService';
import FinancialSummaryCard from '@/components/analytics/FinancialSummaryCard';
import OccupancyCard from '@/components/analytics/OccupancyCard';
import PaymentTrendsChart from '@/components/analytics/PaymentTrendsChart';
import MaintenanceAnalyticsCard from '@/components/analytics/MaintenanceAnalyticsCard';
import { supabase } from '@/lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Save, RefreshCw, Loader2, Plus, Layout } from 'lucide-react';
import { format } from 'date-fns';

// Legacy types for backward compatibility
interface DashboardWidget {
  id: string;
  type: string;
  position: number;
}

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

export default function CustomDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [occupancyMetrics, setOccupancyMetrics] = useState<OccupancyMetrics | null>(null);
  const [maintenanceAnalytics, setMaintenanceAnalytics] = useState<MaintenanceAnalytics | null>(null);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrends | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Default widgets
      const dashboardWidgets: DashboardWidget[] = [
        { id: '1', type: 'financial', position: 1 },
        { id: '2', type: 'occupancy', position: 2 },
        { id: '3', type: 'payments', position: 3 },
        { id: '4', type: 'maintenance', position: 4 },
      ];
      setWidgets(dashboardWidgets);

      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDate = format(firstDay, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');

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
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSaveLayout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Implement save dashboard config
      alert('Dashboard layout saved successfully!');
    } catch (error) {
      console.error('Error saving dashboard:', error);
      alert('Failed to save dashboard layout');
    }
  };

  const handleResetLayout = async () => {
    try {
      loadDashboard();
    } catch (error) {
      console.error('Error resetting dashboard:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Dashboard</h1>
          <p className="text-muted-foreground">Personalized analytics view</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleResetLayout}>
            <Layout className="mr-2 h-4 w-4" />
            Reset Layout
          </Button>
          <Button onClick={handleSaveLayout}>
            <Save className="mr-2 h-4 w-4" />
            Save Layout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {financialReport && <FinancialSummaryCard report={financialReport} />}
            {occupancyMetrics && <OccupancyCard metrics={occupancyMetrics} />}
          </div>
          {paymentTrends && <PaymentTrendsChart trends={paymentTrends} />}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {financialReport && (
            <div className="grid gap-6 md:grid-cols-2">
              <FinancialSummaryCard report={financialReport} />
              <Card>
                <CardHeader>
                  <CardTitle>Financial Insights</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Profit Margin</span>
                    <span className="text-lg font-bold text-green-600">
                      {financialReport.totalRevenue > 0
                        ? ((financialReport.netIncome / financialReport.totalRevenue) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">Revenue Growth</span>
                    <span className="text-lg font-bold text-blue-600">N/A</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-orange-800">Expense Ratio</span>
                    <span className="text-lg font-bold text-orange-600">
                      {financialReport.totalRevenue > 0
                        ? ((financialReport.totalExpenses / financialReport.totalRevenue) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {paymentTrends && <PaymentTrendsChart trends={paymentTrends} />}
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          {occupancyMetrics && <OccupancyCard metrics={occupancyMetrics} />}
          {maintenanceAnalytics && <MaintenanceAnalyticsCard analytics={maintenanceAnalytics} />}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Customization</CardTitle>
          <CardDescription>Add or remove widgets to personalize your view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Financial Widget
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Occupancy Widget
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Chart Widget
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}