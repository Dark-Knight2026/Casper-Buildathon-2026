/**
 * Lease Analytics Dashboard Component
 * Display lease portfolio analytics and insights
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  Users,
  Home,
  AlertCircle
} from 'lucide-react';
import { LeaseStatistics } from '@/services/leaseManagementService';

interface LeaseAnalyticsDashboardProps {
  statistics: LeaseStatistics;
}

export default function LeaseAnalyticsDashboard({
  statistics
}: LeaseAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Portfolio Analytics</CardTitle>
          <CardDescription>
            Overview of your lease portfolio performance
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Leases</p>
                <p className="text-3xl font-bold">{statistics.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {statistics.active} Active
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                {statistics.pending} Pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold">
                  ${statistics.totalMonthlyRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Rent</p>
                <p className="text-3xl font-bold">
                  ${Math.round(statistics.averageRent).toLocaleString()}
                </p>
              </div>
              <Home className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm text-gray-600">
              <span>Per property/month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Occupancy Rate</p>
                <p className="text-3xl font-bold">
                  {Math.round(statistics.occupancyRate)}%
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm text-gray-600">
              <span>{statistics.active} of {statistics.total} occupied</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiration Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Expiration Alerts
          </CardTitle>
          <CardDescription>
            Leases requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border-2 border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-800">Expired</p>
                <Badge className="bg-red-600">{statistics.expired}</Badge>
              </div>
              <p className="text-xs text-red-700">Immediate action required</p>
            </div>

            <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-800">30 Days</p>
                <Badge className="bg-orange-600">{statistics.expiringIn30Days}</Badge>
              </div>
              <p className="text-xs text-orange-700">Contact tenants soon</p>
            </div>

            <div className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-yellow-800">60 Days</p>
                <Badge className="bg-yellow-600">{statistics.expiringIn60Days}</Badge>
              </div>
              <p className="text-xs text-yellow-700">Start renewal process</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Revenue chart would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Trends</CardTitle>
              <CardDescription>Occupancy rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Occupancy chart would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Renewal Statistics</CardTitle>
              <CardDescription>Lease renewal performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Renewal statistics would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}