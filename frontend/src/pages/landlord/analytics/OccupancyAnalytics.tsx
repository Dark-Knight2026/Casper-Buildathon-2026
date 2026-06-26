import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AnalyticsService, type OccupancyAnalytics as OccupancyAnalyticsType } from '@/services/analyticsService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Home, Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function OccupancyAnalytics() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<OccupancyAnalyticsType | null>(null);
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
      const data = await AnalyticsService.getOccupancyAnalytics(
        user.id,
        range,
        propertyFilter === 'all' ? undefined : propertyFilter
      );
      setAnalytics(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load occupancy analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, propertyFilter, user, getDateRange, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-gray-500">Loading occupancy analytics...</p>
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
          <h1 className="text-3xl font-bold">Occupancy Analytics</h1>
          <p className="text-gray-600 mt-1">Track occupancy rates, vacancies, and lease trends</p>
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
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(analytics.overview.currentOccupancyRate)}</div>
            <p className="text-xs text-gray-600 mt-1">Current occupancy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vacant Units</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.vacantUnitsCount}</div>
            <p className="text-xs text-gray-600 mt-1">Currently vacant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Lease Duration</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.overview.averageLeaseDuration)}</div>
            <p className="text-xs text-gray-600 mt-1">Days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(analytics.overview.tenantTurnoverRate)}</div>
            <p className="text-xs text-gray-600 mt-1">Tenant turnover</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Days to Lease</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.daysToLease}</div>
            <p className="text-xs text-gray-600 mt-1">Avg time to fill</p>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Over Time */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Occupancy Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.occupancyOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="Occupancy Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lease Expirations & Move-In/Out Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Lease Expirations Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.leaseExpirations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Expiring Leases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Move-In/Move-Out Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.moveInOutTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="moveIns" stroke="#10b981" strokeWidth={2} name="Move-Ins" />
                <Line type="monotone" dataKey="moveOuts" stroke="#ef4444" strokeWidth={2} name="Move-Outs" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Property Occupancy Comparison */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Property Occupancy Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.propertyOccupancy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="propertyName" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
              <Bar dataKey="occupancyRate" fill="#3b82f6" name="Occupancy Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vacant Units Analysis */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Vacant Units Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.vacantUnits.length === 0 ? (
            <div className="text-center py-8">
              <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No vacant units - all properties are fully occupied!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-3">Property</th>
                    <th className="text-left p-3">Address</th>
                    <th className="text-right p-3">Vacancy Duration</th>
                    <th className="text-right p-3">Lost Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.vacantUnits.map((unit, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{unit.propertyName}</td>
                      <td className="p-3 text-gray-600">{unit.address}</td>
                      <td className="p-3 text-right">{unit.vacancyDuration} days</td>
                      <td className="p-3 text-right text-red-600 font-medium">
                        {formatCurrency(unit.estimatedLostRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lease Renewal Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Renewal Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {formatPercent(analytics.leaseRenewalRate)}
              </div>
              <p className="text-gray-600">Lease Renewal Rate</p>
              <p className="text-sm text-gray-500 mt-2">
                {analytics.leaseRenewalRate >= 75 ? 'Excellent retention!' : 'Consider tenant retention strategies'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}