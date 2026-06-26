/**
 * Enhanced Dashboard UX Component
 * Provides comprehensive UX improvements including:
 * - Interactive data visualizations
 * - Real-time updates with smooth animations
 * - Contextual tooltips and help
 * - Responsive design optimizations
 * - Accessibility improvements
 * - Smart data filtering and sorting
 */

import { useState, useEffect, type ElementType } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  HelpCircle,
  Zap,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: ElementType;
  color: string;
  bgColor: string;
  trend: 'up' | 'down' | 'neutral';
  description: string;
  target?: number;
  unit?: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export default function EnhancedDashboardUX() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['all']);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set());

  // Mock metrics data with enhanced information
  const metrics: DashboardMetric[] = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: '$89,420',
      change: 8.2,
      changeLabel: 'vs last month',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: 'up',
      description: 'Total revenue from all properties including rent, fees, and other income',
      target: 95000,
      unit: '$'
    },
    {
      id: 'occupancy',
      title: 'Occupancy Rate',
      value: '94.2%',
      change: 2.5,
      changeLabel: 'vs last month',
      icon: Home,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: 'up',
      description: 'Percentage of occupied units across all properties',
      target: 95,
      unit: '%'
    },
    {
      id: 'tenants',
      title: 'Active Tenants',
      value: 156,
      change: 7.7,
      changeLabel: 'vs last month',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: 'up',
      description: 'Number of tenants with active lease agreements',
      target: 160
    },
    {
      id: 'performance',
      title: 'Portfolio Performance',
      value: '92.5%',
      change: -1.2,
      changeLabel: 'vs last month',
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: 'down',
      description: 'Overall health score based on occupancy, revenue, and maintenance',
      target: 95,
      unit: '%'
    }
  ];

  // Chart data for visualizations
  const revenueChartData: ChartDataPoint[] = [
    { label: 'Jan', value: 75000, color: 'bg-blue-500' },
    { label: 'Feb', value: 82000, color: 'bg-blue-500' },
    { label: 'Mar', value: 78000, color: 'bg-blue-500' },
    { label: 'Apr', value: 85000, color: 'bg-blue-500' },
    { label: 'May', value: 89420, color: 'bg-green-500' }
  ];

  const propertyDistribution: ChartDataPoint[] = [
    { label: 'Residential', value: 65, color: 'bg-blue-500' },
    { label: 'Commercial', value: 25, color: 'bg-purple-500' },
    { label: 'Mixed-Use', value: 10, color: 'bg-orange-500' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const toggleMetricVisibility = (metricId: string) => {
    const newHidden = new Set(hiddenMetrics);
    if (newHidden.has(metricId)) {
      newHidden.delete(metricId);
    } else {
      newHidden.add(metricId);
    }
    setHiddenMetrics(newHidden);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral', change: number) => {
    if (trend === 'neutral') return null;
    const Icon = trend === 'up' ? TrendingUp : TrendingDown;
    const colorClass = trend === 'up' ? 'text-green-600' : 'text-red-600';
    return <Icon className={`h-4 w-4 ${colorClass}`} />;
  };

  const getProgressColor = (current: number, target?: number) => {
    if (!target) return 'bg-blue-600';
    const percentage = (current / target) * 100;
    if (percentage >= 95) return 'bg-green-600';
    if (percentage >= 80) return 'bg-blue-600';
    if (percentage >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const filteredMetrics = metrics.filter(metric => 
    !hiddenMetrics.has(metric.id) &&
    (searchQuery === '' || 
     metric.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     metric.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-8 overflow-auto' : ''}`}>
        {/* Enhanced Header with Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">Real-time insights and analytics for your portfolio</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[200px]"
              />
            </div>

            {/* Time Range Selector */}
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7d' | '30d' | '90d' | '1y')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Data</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Help</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Help Banner */}
        {showHelp && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Dashboard Guide</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Click on any metric card to view detailed analytics</li>
                    <li>• Use the eye icon to hide/show specific metrics</li>
                    <li>• Hover over charts for detailed information</li>
                    <li>• Use the time range selector to adjust the data period</li>
                    <li>• Export data using the download button</li>
                  </ul>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(false)}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMetrics.map((metric) => (
            <Card
              key={metric.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden"
            >
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <div className="flex items-center gap-2 flex-1">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {metric.description}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-md ${metric.bgColor}`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMetricVisibility(metric.id);
                    }}
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(metric.trend, metric.change)}
                  <span className={`text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}% {metric.changeLabel}
                  </span>
                </div>

                {/* Progress Bar for Target Metrics */}
                {metric.target && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress to target</span>
                      <span>{typeof metric.value === 'number' ? metric.value : parseFloat(metric.value.replace(/[^0-9.]/g, ''))} / {metric.target}{metric.unit || ''}</span>
                    </div>
                    <Progress
                      value={typeof metric.value === 'number' 
                        ? (metric.value / metric.target) * 100 
                        : (parseFloat(metric.value.replace(/[^0-9.]/g, '')) / metric.target) * 100}
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Hidden Metrics Indicator */}
        {hiddenMetrics.size > 0 && (
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {hiddenMetrics.size} metric{hiddenMetrics.size > 1 ? 's' : ''} hidden
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHiddenMetrics(new Set())}
                >
                  Show All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-600" />
                    Revenue Trend
                  </CardTitle>
                  <CardDescription>Monthly revenue over the past 5 months</CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  +12.3% Growth
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-end justify-between gap-2">
                {revenueChartData.map((point, index) => {
                  const maxValue = Math.max(...revenueChartData.map(p => p.value));
                  const height = (point.value / maxValue) * 100;
                  const isHighest = point.value === maxValue;
                  
                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                          <div className="relative w-full">
                            <div
                              className={`w-full ${point.color} rounded-t transition-all duration-300 group-hover:opacity-80 ${
                                isHighest ? 'ring-2 ring-green-500 ring-offset-2' : ''
                              }`}
                              style={{ height: `${height}%`, minHeight: '20px' }}
                            />
                            {isHighest && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                <Badge className="bg-green-600 text-xs">Peak</Badge>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-600 font-medium">{point.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <div className="font-semibold">${point.value.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{point.label} 2024</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Property Distribution */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-600" />
                    Property Distribution
                  </CardTitle>
                  <CardDescription>Portfolio breakdown by property type</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyDistribution.map((item, index) => (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold">{item.value}%</span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`${item.color} h-3 rounded-full transition-all duration-500 group-hover:opacity-80`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">24</div>
                    <div className="text-xs text-gray-500">Total Properties</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">$2.4M</div>
                    <div className="text-xs text-gray-500">Portfolio Value</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">94.2%</div>
                    <div className="text-xs text-gray-500">Avg Occupancy</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions with Enhanced UX */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>Frequently used actions for efficient management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Home, label: 'Add Property', color: 'blue', description: 'Register new property' },
                { icon: Users, label: 'New Tenant', color: 'green', description: 'Onboard tenant' },
                { icon: DollarSign, label: 'Record Payment', color: 'purple', description: 'Log transaction' },
                { icon: Calendar, label: 'Schedule', color: 'orange', description: 'Book appointment' }
              ].map((action, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-3 hover:shadow-md transition-all group"
                    >
                      <div className={`p-3 rounded-full bg-${action.color}-100 group-hover:bg-${action.color}-200 transition-colors`}>
                        <action.icon className={`h-6 w-6 text-${action.color}-600`} />
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-gray-500">{action.description}</div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Click to {action.description.toLowerCase()}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Performance Insights
            </CardTitle>
            <CardDescription>AI-powered recommendations for optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  type: 'success',
                  icon: CheckCircle,
                  title: 'Strong Performance',
                  message: 'Your occupancy rate is 4.2% above market average',
                  action: 'View Details'
                },
                {
                  type: 'warning',
                  icon: AlertCircle,
                  title: 'Attention Needed',
                  message: '3 properties have maintenance requests pending over 48 hours',
                  action: 'Review Now'
                },
                {
                  type: 'info',
                  icon: Info,
                  title: 'Opportunity',
                  message: 'Consider raising rent by 3-5% based on market trends',
                  action: 'Analyze'
                }
              ].map((insight, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-4 rounded-lg ${
                    insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                    insight.type === 'warning' ? 'bg-orange-50 border border-orange-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <insight.icon className={`h-5 w-5 mt-0.5 ${
                    insight.type === 'success' ? 'text-green-600' :
                    insight.type === 'warning' ? 'text-orange-600' :
                    'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-700">{insight.message}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {insight.action}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}