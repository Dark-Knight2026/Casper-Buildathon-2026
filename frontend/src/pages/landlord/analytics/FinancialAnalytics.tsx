import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AnalyticsService, type FinancialAnalytics as FinancialAnalyticsType } from '@/services/analyticsService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Home, Download } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function FinancialAnalytics() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<FinancialAnalyticsType | null>(null);
  const [dateRange, setDateRange] = useState('12months');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  const getDateRange = useCallback((range: string) => {
    const now = new Date();
    let from: Date;

    switch (range) {
      case '30days':
        from = subMonths(now, 1);
        break;
      case '3months':
        from = subMonths(now, 3);
        break;
      case '6months':
        from = subMonths(now, 6);
        break;
      case '12months':
        from = subMonths(now, 12);
        break;
      default:
        from = subMonths(now, 12);
    }

    return {
      from: startOfMonth(from).toISOString(),
      to: endOfMonth(now).toISOString(),
    };
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const range = getDateRange(dateRange);
      const data = await AnalyticsService.getFinancialAnalytics(
        user.id,
        range,
        propertyFilter === 'all' ? undefined : propertyFilter
      );
      setAnalytics(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load financial analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, propertyFilter, user, getDateRange, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportPDF = () => {
    toast({
      title: 'Export to PDF',
      description: 'PDF export functionality coming soon',
    });
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    const csvData = analytics.revenueVsExpenses.map((item) => ({
      Month: item.month,
      Revenue: item.revenue,
      Expenses: item.expenses,
      'Net Income': item.revenue - item.expenses,
    }));

    AnalyticsService.exportToCSV(csvData, 'financial-analytics');

    toast({
      title: 'Success',
      description: 'Financial data exported to CSV',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view financial analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">Loading financial analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Analytics</h1>
          <p className="text-gray-600 mt-1">Track revenue, expenses, and financial performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</div>
            <p className="text-xs text-gray-600 mt-1">
              <TrendingUp className="inline h-3 w-3 text-green-600 mr-1" />
              Revenue for selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalExpenses)}</div>
            <p className="text-xs text-gray-600 mt-1">
              <TrendingDown className="inline h-3 w-3 text-red-600 mr-1" />
              Expenses for selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Operating Income</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.netOperatingIncome)}</div>
            <p className="text-xs text-gray-600 mt-1">
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.cashFlow)}</div>
            <p className="text-xs text-gray-600 mt-1">
              Net cash flow
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(analytics.overview.occupancyRate)}</div>
            <p className="text-xs text-gray-600 mt-1">
              Current occupancy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Rent Per Unit</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.averageRentPerUnit)}</div>
            <p className="text-xs text-gray-600 mt-1">
              Average monthly rent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Revenue vs. Expenses Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.revenueVsExpenses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue by Property & Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.revenueByProperty}
                  dataKey="revenue"
                  nameKey="propertyName"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.propertyName}: ${formatCurrency(entry.revenue)}`}
                >
                  {analytics.revenueByProperty.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.expenseCategories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="amount" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rent Collection & Late Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Rent Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.rentCollectionRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} name="Collection Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Late Payment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.latePaymentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Late Payments" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Gross Rental Yield</p>
              <p className="text-2xl font-bold">{formatPercent(analytics.metrics.grossRentalYield)}</p>
              <p className="text-xs text-gray-500 mt-1">Annual revenue / property value</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Rental Yield</p>
              <p className="text-2xl font-bold">{formatPercent(analytics.metrics.netRentalYield)}</p>
              <p className="text-xs text-gray-500 mt-1">Net income / property value</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Cap Rate</p>
              <p className="text-2xl font-bold">{formatPercent(analytics.metrics.capRate)}</p>
              <p className="text-xs text-gray-500 mt-1">NOI / property value</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Cash-on-Cash Return</p>
              <p className="text-2xl font-bold">{formatPercent(analytics.metrics.cashOnCashReturn)}</p>
              <p className="text-xs text-gray-500 mt-1">Annual cash flow / investment</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">DSCR</p>
              <p className="text-2xl font-bold">{analytics.metrics.dscr.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Debt service coverage ratio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}