import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getListingAnalytics } from '@/lib/listingEnhancements';
import type { ListingAnalytics } from '@/types/listing-enhanced';
import {
  Eye,
  MessageSquare,
  Calendar,
  Heart,
  Share2,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  PieChart,
  RefreshCw,
} from 'lucide-react';

interface ListingAnalyticsDashboardProps {
  listingId: string;
}

export default function ListingAnalyticsDashboard({ listingId }: ListingAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<ListingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    const data = await getListingAnalytics(listingId);
    setAnalytics(data);
    setIsLoading(false);
  }, [listingId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-600">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const engagementRate = analytics.uniqueViews > 0 
    ? ((analytics.inquiries / analytics.uniqueViews) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Listing Performance</h2>
          <p className="text-sm text-gray-600">
            Last updated: {analytics.lastUpdated.toLocaleString()}
          </p>
        </div>
        <Button onClick={loadAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.uniqueViews.toLocaleString()} unique
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inquiries</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.inquiries}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {engagementRate}% conversion
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Showings</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.showingRequests}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Requested
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Favorites</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.favorites}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.shares} shares
                </p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="traffic">
            <Users className="h-4 w-4 mr-2" />
            Traffic
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <TrendingUp className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Views by Day */}
          <Card>
            <CardHeader>
              <CardTitle>Views Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.viewsByDay.slice(0, 7).map((day, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{day.date}</span>
                      <span className="text-gray-600">
                        {day.views} views ({day.uniqueViews} unique)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                        style={{ width: `${(day.views / Math.max(...analytics.viewsByDay.map(d => d.views))) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-900">
                    {Math.floor(analytics.averageTimeOnPage / 60)}:{(analytics.averageTimeOnPage % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="text-sm text-blue-700">Avg. Time on Page</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-900">
                    {analytics.engagementMetrics.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-green-700">Conversion Rate</p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-900">
                    {analytics.engagementMetrics.bounceRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-purple-700">Bounce Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6 mt-6">
          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Traffic Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.trafficSources.map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {source.source}
                        </Badge>
                        <span className="text-sm font-medium">{source.views} views</span>
                      </div>
                      <span className="text-sm text-gray-600">{source.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full"
                        style={{ width: `${source.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6 mt-6">
          {/* Photo Engagement */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.engagementMetrics.photoViews.slice(0, 5).map((photo, index) => (
                  <div key={photo.photoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Badge className="mr-3">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">Photo {photo.photoId.substring(0, 8)}</p>
                        <p className="text-sm text-gray-600">
                          {photo.views} views • {photo.averageViewTime}s avg
                        </p>
                      </div>
                    </div>
                    <Eye className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Viewed Section */}
          <Card>
            <CardHeader>
              <CardTitle>User Behavior</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-blue-900">Most Viewed Section</p>
                    <p className="text-sm text-blue-700">{analytics.engagementMetrics.mostViewedSection}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-green-900">Average Scroll Depth</p>
                    <p className="text-sm text-green-700">
                      {analytics.engagementMetrics.averageScrollDepth.toFixed(0)}%
                    </p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}