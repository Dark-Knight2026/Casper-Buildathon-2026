import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Target,
  ArrowDown,
  Home,
} from 'lucide-react';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';

export default function SellerAnalytics() {
  const { 
    performanceMetrics, 
    monthlyData, 
    priceAnalysis, 
    marketInsights,
    marketAnalytics
  } = useSellerDashboard();

  const getChangeIcon = (change: string) => {
    if (change.startsWith('+')) return <ArrowDown className="h-4 w-4 text-green-500 rotate-180" />; // Up arrow for positive
    if (change.startsWith('-')) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics & Insights</h1>
      
      {/* Enhanced Performance Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.totalViews}</p>
                </div>
                <div className="flex items-center">
                  {getChangeIcon(performanceMetrics.viewsChange!)}
                  <span className="text-sm text-green-600 ml-1">{performanceMetrics.viewsChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inquiry Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.inquiryRate}%</p>
                </div>
                <div className="flex items-center">
                  {getChangeIcon(performanceMetrics.inquiryChange!)}
                  <span className="text-sm text-green-600 ml-1">{performanceMetrics.inquiryChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.conversionRate}%</p>
                </div>
                <div className="flex items-center">
                  {getChangeIcon(performanceMetrics.conversionChange!)}
                  <span className="text-sm text-red-600 ml-1">{performanceMetrics.conversionChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Time on Market</p>
                  <p className="text-2xl font-bold text-gray-900">{performanceMetrics.averageTimeOnMarket} days</p>
                </div>
                <div className="flex items-center">
                  <ArrowDown className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 ml-1">{performanceMetrics.timeChange}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Monthly Activity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((month) => (
                <div key={month.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-gray-600">{month.views} views, {month.inquiries} inquiries</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(month.views / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Market Positioning
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priceAnalysis && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Your Listing Price</p>
                    <p className="text-sm text-gray-600">${priceAnalysis.listPrice.toLocaleString()}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Market Value Estimate</p>
                    <p className="text-sm text-gray-600">${priceAnalysis.marketValue.toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">Estimated</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Price per Sq Ft</p>
                    <p className="text-sm text-gray-600">${priceAnalysis.pricePerSqft}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Competitive</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Market Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketInsights.map((insight, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <Badge 
                    variant="outline" 
                    className={getImpactColor(insight.impact)}
                  >
                    {insight.impact}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-2">{insight.description}</p>
                <p className="text-sm font-medium text-blue-600">
                  💡 {insight.recommendation}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparable Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Recent Comparable Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {priceAnalysis && (
            <div className="space-y-4">
              {priceAnalysis.comparablesSold.map((comp, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{comp.address}</p>
                    <p className="text-sm text-gray-600">{comp.sqft.toLocaleString()} sq ft</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${comp.price.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{comp.daysOnMarket} days on market</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Conditions */}
      {marketAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Market Avg Price</p>
                  <p className="text-2xl font-bold text-gray-900">${marketAnalytics.averagePrice.toLocaleString()}</p>
                  <p className="text-sm text-green-600">{marketAnalytics.priceChange}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Days on Market</p>
                  <p className="text-2xl font-bold text-gray-900">{marketAnalytics.daysOnMarket}</p>
                  <p className="text-sm text-blue-600">Market Average</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Competitive Listings</p>
                  <p className="text-2xl font-bold text-gray-900">{marketAnalytics.competitiveListings}</p>
                  <p className="text-sm text-orange-600">In Your Area</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}