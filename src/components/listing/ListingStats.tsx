import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useListings } from '@/contexts/ListingContext';
import {
  Home,
  DollarSign,
  TrendingUp,
  Calendar,
  Eye,
  MessageSquare,
  Users,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Award,
  Clock,
  Star
} from 'lucide-react';

interface ListingStatsProps {
  showDetailed?: boolean;
}

export default function ListingStats({ showDetailed = false }: ListingStatsProps) {
  const { stats } = useListings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'withdrawn': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPropertyType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${Math.round(stats.averagePrice).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Days on Market</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.averageDaysOnMarket)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showDetailed && (
        <>
          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Listing Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{stats.active}</div>
                  <div className="text-sm text-green-600">Active</div>
                  <Badge className="mt-2 bg-green-100 text-green-800">
                    {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                  </Badge>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
                  <div className="text-sm text-yellow-600">Pending</div>
                  <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                    {stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%
                  </Badge>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{stats.sold}</div>
                  <div className="text-sm text-blue-600">Sold</div>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    {stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0}%
                  </Badge>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{stats.withdrawn}</div>
                  <div className="text-sm text-red-600">Withdrawn</div>
                  <Badge className="mt-2 bg-red-100 text-red-800">
                    {stats.total > 0 ? Math.round((stats.withdrawn / stats.total) * 100) : 0}%
                  </Badge>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
                  <div className="text-sm text-gray-600">Draft</div>
                  <Badge className="mt-2 bg-gray-100 text-gray-800">
                    {stats.total > 0 ? Math.round((stats.draft / stats.total) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Property Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="font-medium">{formatPropertyType(type)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{count}</span>
                        <Badge variant="outline">
                          {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Price Range Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Under $200K</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{stats.byPriceRange.under_200k}</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((stats.byPriceRange.under_200k / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">$200K - $400K</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{stats.byPriceRange._200k_400k}</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((stats.byPriceRange._200k_400k / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">$400K - $600K</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{stats.byPriceRange._400k_600k}</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((stats.byPriceRange._400k_600k / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">$600K - $800K</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{stats.byPriceRange._600k_800k}</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((stats.byPriceRange._600k_800k / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">$800K - $1M</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{stats.byPriceRange._800k_1m}</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((stats.byPriceRange._800k_1m / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Over $1M</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{stats.byPriceRange.over_1m}</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((stats.byPriceRange.over_1m / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Portfolio Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Math.round(stats.totalValue).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg. Views</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(stats.averageViews)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg. Inquiries</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(stats.averageInquiries)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}