import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Clock,
  Star,
  Users,
  Calendar,
  Target,
  Award,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PerformanceMetrics {
  totalSales: number;
  averageSalePrice: number;
  averageDaysOnMarket: number;
  listToSaleRatio: number;
  clientSatisfaction: number;
  responseRate: number;
  closingRate: number;
  repeatClientRate: number;
}

interface MonthlyData {
  month: string;
  sales: number;
  revenue: number;
  listings: number;
}

interface PropertyTypeData {
  type: string;
  count: number;
  percentage: number;
  avgPrice: number;
}

interface AgentPerformanceAnalyticsProps {
  agentId: string;
  agentName: string;
  metrics: PerformanceMetrics;
  monthlyData: MonthlyData[];
  propertyTypes: PropertyTypeData[];
  yearsExperience: number;
  totalReviews: number;
}

export default function AgentPerformanceAnalytics({
  agentId,
  agentName,
  metrics,
  monthlyData,
  propertyTypes,
  yearsExperience,
  totalReviews,
}: AgentPerformanceAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('12months');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPerformanceColor = (value: number, threshold: number) => {
    return value >= threshold ? 'text-green-600' : 'text-red-600';
  };

  const getPerformanceIcon = (value: number, threshold: number) => {
    return value >= threshold ? TrendingUp : TrendingDown;
  };

  // Calculate total revenue from monthly data
  const totalRevenue = monthlyData.reduce((sum, month) => sum + month.revenue, 0);
  const avgMonthlySales = monthlyData.reduce((sum, month) => sum + month.sales, 0) / monthlyData.length;

  // Performance score calculation (0-100)
  const performanceScore = Math.round(
    (metrics.clientSatisfaction * 0.3 +
      metrics.closingRate * 0.25 +
      metrics.responseRate * 0.2 +
      metrics.listToSaleRatio * 0.15 +
      metrics.repeatClientRate * 0.1) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-gray-600 mt-1">{agentName}</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
            <SelectItem value="24months">Last 24 Months</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Score Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Overall Performance Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">{performanceScore}</span>
                <span className="text-xl text-gray-600">/100</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={performanceScore >= 80 ? 'default' : performanceScore >= 60 ? 'secondary' : 'destructive'}>
                  {performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Needs Improvement'}
                </Badge>
                <span className="text-sm text-gray-600">
                  Top {Math.round((100 - performanceScore) / 2)}% in market
                </span>
              </div>
            </div>
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - performanceScore / 100)}`}
                  className="text-blue-600 transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <Badge variant="outline">{timeRange}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {formatCurrency(totalRevenue / monthlyData.length)}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Home className="h-5 w-5 text-blue-600" />
              <Badge variant="outline">{timeRange}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Properties Sold</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalSales}</p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {avgMonthlySales.toFixed(1)}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <Badge variant="outline">Rate</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Closing Rate</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.closingRate)}</p>
            <div className="flex items-center gap-1 mt-1">
              {metrics.closingRate >= 0.7 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${getPerformanceColor(metrics.closingRate, 0.7)}`}>
                {metrics.closingRate >= 0.7 ? 'Above' : 'Below'} average
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <Badge variant="outline">Score</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Client Satisfaction</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.clientSatisfaction)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Based on {totalReviews} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Trends</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="market">Market Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">List-to-Sale Ratio</span>
                      <span className="text-sm font-bold">{formatPercentage(metrics.listToSaleRatio)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${metrics.listToSaleRatio * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Response Rate</span>
                      <span className="text-sm font-bold">{formatPercentage(metrics.responseRate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${metrics.responseRate * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Repeat Client Rate</span>
                      <span className="text-sm font-bold">{formatPercentage(metrics.repeatClientRate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${metrics.repeatClientRate * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Closing Rate</span>
                      <span className="text-sm font-bold">{formatPercentage(metrics.closingRate)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${metrics.closingRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Property Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {propertyTypes.map((type, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{type.type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{type.count} sales</span>
                          <Badge variant="outline">{formatPercentage(type.percentage / 100)}</Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            index === 0 ? 'bg-blue-600' :
                            index === 1 ? 'bg-green-600' :
                            index === 2 ? 'bg-purple-600' : 'bg-orange-600'
                          }`}
                          style={{ width: `${type.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Avg Price: {formatCurrency(type.avgPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Trends Tab */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Monthly Sales Performance
              </CardTitle>
              <CardDescription>Sales volume and revenue trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Sales Chart */}
                <div>
                  <p className="text-sm font-medium mb-4">Sales Volume</p>
                  <div className="space-y-2">
                    {monthlyData.map((month, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-16 text-gray-600">{month.month}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-blue-400 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${(month.sales / Math.max(...monthlyData.map(m => m.sales))) * 100}%` }}
                          >
                            <span className="text-xs font-medium text-white">{month.sales}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Chart */}
                <div>
                  <p className="text-sm font-medium mb-4">Revenue</p>
                  <div className="space-y-2">
                    {monthlyData.map((month, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-16 text-gray-600">{month.month}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div
                            className="bg-gradient-to-r from-green-600 to-green-400 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${(month.revenue / Math.max(...monthlyData.map(m => m.revenue))) * 100}%` }}
                          >
                            <span className="text-xs font-medium text-white">
                              {formatCurrency(month.revenue / 1000)}K
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Avg Days on Market</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.averageDaysOnMarket}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Market Average</span>
                    <span className="text-sm font-medium">45 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Your Performance</span>
                    <span className="text-sm font-medium text-green-600">
                      {metrics.averageDaysOnMarket < 45 ? '↓' : '↑'} {Math.abs(45 - metrics.averageDaysOnMarket)} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Repeat Client Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.repeatClientRate)}</p>
                  </div>
                  <Award className="h-8 w-8 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Industry Average</span>
                    <span className="text-sm font-medium">25%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Your Performance</span>
                    <span className={`text-sm font-medium ${metrics.repeatClientRate >= 0.25 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.repeatClientRate >= 0.25 ? '↑' : '↓'} {Math.abs(metrics.repeatClientRate * 100 - 25).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Market Analysis Tab */}
        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Market Position Analysis
              </CardTitle>
              <CardDescription>How you compare to market averages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Average Sale Price</p>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.averageSalePrice)}</p>
                    <p className="text-xs text-gray-500 mt-1">Market: {formatCurrency(425000)}</p>
                    <Badge variant="outline" className="mt-2">
                      {((metrics.averageSalePrice / 425000 - 1) * 100).toFixed(1)}% above market
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">List-to-Sale Ratio</p>
                      {metrics.listToSaleRatio >= 0.95 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-2xl font-bold">{formatPercentage(metrics.listToSaleRatio)}</p>
                    <p className="text-xs text-gray-500 mt-1">Market: 96.5%</p>
                    <Badge variant="outline" className="mt-2">
                      {metrics.listToSaleRatio >= 0.965 ? 'Above' : 'Below'} market
                    </Badge>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Experience Level</p>
                      <Award className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold">{yearsExperience} years</p>
                    <p className="text-xs text-gray-500 mt-1">Market avg: 8 years</p>
                    <Badge variant="outline" className="mt-2">
                      {yearsExperience >= 8 ? 'Experienced' : 'Growing'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2">Market Insights</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Your average sale price is {((metrics.averageSalePrice / 425000 - 1) * 100).toFixed(1)}% above market average, indicating strong negotiation skills.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Properties sell {45 - metrics.averageDaysOnMarket} days faster than market average, showing effective marketing strategies.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Client satisfaction rate of {formatPercentage(metrics.clientSatisfaction)} exceeds industry standard of 85%.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}