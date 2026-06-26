import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Home,
  DollarSign,
  Calendar,
  MapPin,
  AlertCircle,
  BarChart3,
  LineChart,
  Activity,
  Users,
  Building2,
  Sparkles,
  RefreshCw,
  Search,
  Info
} from 'lucide-react';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import ComparableSalesTable from './ComparableSalesTable';
import NeighborhoodInsightsCard from './NeighborhoodInsightsCard';
import { format } from 'date-fns';

export default function MarketIntelligencePanel() {
  const {
    marketStats,
    comparableSales,
    priceTrends,
    neighborhoodInsights,
    marketAlerts,
    loading,
    error,
    refreshData
  } = useMarketIntelligence();

  const [activeTab, setActiveTab] = useState('overview');

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getInventoryLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-red-600';
      case 'balanced': return 'text-green-600';
      case 'high': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p>Failed to load market data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Market Intelligence</h2>
          <p className="text-gray-600">Real-time market data and insights for {marketStats?.area_name}</p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Market Alerts */}
      {marketAlerts.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Sparkles className="h-5 w-5 mr-2" />
              Market Alerts ({marketAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="p-3 bg-white rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{alert.title}</h4>
                        <Badge className={getAlertSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        {alert.area}
                        <span className="mx-2">•</span>
                        {format(new Date(alert.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Market Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Median Price</p>
                <p className="text-2xl font-bold">${marketStats?.median_price.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(marketStats?.price_trend_30d || 0)}
                  <span className={`text-sm ml-1 ${getTrendColor(marketStats?.price_trend_30d || 0)}`}>
                    {marketStats?.price_trend_30d.toFixed(1)}% (30d)
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Days on Market</p>
                <p className="text-2xl font-bold">{marketStats?.avg_days_on_market}</p>
                <p className="text-sm text-gray-500 mt-1">days</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold">{marketStats?.active_listings}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {marketStats?.inventory_months.toFixed(1)} months supply
                </p>
              </div>
              <Home className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Price per Sq Ft</p>
                <p className="text-2xl font-bold">${marketStats?.price_per_sqft}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(marketStats?.price_trend_90d || 0)}
                  <span className={`text-sm ml-1 ${getTrendColor(marketStats?.price_trend_90d || 0)}`}>
                    {marketStats?.price_trend_90d.toFixed(1)}% (90d)
                  </span>
                </div>
              </div>
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Listings</span>
              <span className="font-semibold">{marketStats?.total_listings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active</span>
              <span className="font-semibold text-blue-600">{marketStats?.active_listings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">{marketStats?.pending_listings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sold (YTD)</span>
              <span className="font-semibold text-green-600">{marketStats?.sold_listings}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Price Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">30 Days</span>
              <div className="flex items-center">
                {getTrendIcon(marketStats?.price_trend_30d || 0)}
                <span className={`font-semibold ml-1 ${getTrendColor(marketStats?.price_trend_30d || 0)}`}>
                  {marketStats?.price_trend_30d.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">90 Days</span>
              <div className="flex items-center">
                {getTrendIcon(marketStats?.price_trend_90d || 0)}
                <span className={`font-semibold ml-1 ${getTrendColor(marketStats?.price_trend_90d || 0)}`}>
                  {marketStats?.price_trend_90d.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">1 Year</span>
              <div className="flex items-center">
                {getTrendIcon(marketStats?.price_trend_1y || 0)}
                <span className={`font-semibold ml-1 ${getTrendColor(marketStats?.price_trend_1y || 0)}`}>
                  {marketStats?.price_trend_1y.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Absorption Rate</span>
              <span className="font-semibold">{(marketStats?.absorption_rate || 0 * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Inventory Level</span>
              <Badge variant="outline" className={getInventoryLevelColor('low')}>
                {marketStats?.inventory_months && marketStats.inventory_months < 3 ? 'Low' : 
                 marketStats?.inventory_months && marketStats.inventory_months > 6 ? 'High' : 'Balanced'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Price</span>
              <span className="font-semibold">${marketStats?.avg_price.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Price Trends
          </TabsTrigger>
          <TabsTrigger value="comparables">
            <Home className="h-4 w-4 mr-2" />
            Comparable Sales
          </TabsTrigger>
          <TabsTrigger value="neighborhoods">
            <MapPin className="h-4 w-4 mr-2" />
            Neighborhoods
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>12-Month Price Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceTrends.map((trend, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {format(new Date(trend.date), 'MMM yyyy')}
                      </span>
                      <span className="text-gray-600">
                        ${trend.median_price.toLocaleString()} • {trend.total_sales} sales
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-600 h-3 rounded-full" 
                        style={{ width: `${(trend.median_price / 500000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparables" className="mt-6">
          <ComparableSalesTable comparables={comparableSales} />
        </TabsContent>

        <TabsContent value="neighborhoods" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {neighborhoodInsights.map((insight) => (
              <NeighborhoodInsightsCard key={insight.id} insight={insight} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}