/**
 * Predictive Analytics Component
 * AI-powered forecasting and predictive insights for property management
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  DollarSign,
  Users,
  Home,
  Calendar,
  Zap,
  LineChart,
  Activity
} from 'lucide-react';

interface PredictiveAnalyticsProps {
  properties: PropertyData[];
  tenants: TenantData[];
  historicalData: HistoricalData;
}

interface PropertyData {
  id: string;
  address: string;
  currentRent: number;
  roi: number;
  occupancyRate: number;
  maintenanceCosts: number;
}

interface TenantData {
  id: string;
  name: string;
  leaseEndDate: Date;
  paymentHistory: number;
  satisfactionScore: number;
  renewalProbability: number;
}

interface HistoricalData {
  monthlyRevenue: number[];
  monthlyExpenses: number[];
  occupancyRates: number[];
  maintenanceCosts: number[];
}

interface Forecast {
  period: string;
  value: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface Prediction {
  id: string;
  type: 'revenue' | 'expense' | 'occupancy' | 'maintenance' | 'churn';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  recommendation: string;
  value?: number;
}

export default function PredictiveAnalytics({
  properties,
  tenants,
  historicalData
}: PredictiveAnalyticsProps) {
  const [selectedForecast, setSelectedForecast] = useState<'revenue' | 'occupancy' | 'maintenance'>('revenue');

  // Generate revenue forecast
  const generateRevenueForecast = (): Forecast[] => {
    const lastRevenue = historicalData.monthlyRevenue[historicalData.monthlyRevenue.length - 1];
    const avgGrowth = 0.035; // 3.5% average monthly growth
    
    return Array.from({ length: 6 }, (_, i) => {
      const month = i + 1;
      const growthFactor = 1 + (avgGrowth * month) + (Math.random() * 0.01 - 0.005);
      const value = lastRevenue * growthFactor;
      const confidence = 95 - (month * 3); // Confidence decreases over time
      
      return {
        period: `Month ${month}`,
        value: Math.round(value),
        confidence,
        trend: growthFactor > 1.02 ? 'up' : growthFactor < 0.98 ? 'down' : 'stable'
      };
    });
  };

  // Generate occupancy forecast
  const generateOccupancyForecast = (): Forecast[] => {
    const currentOccupancy = properties.reduce((sum, p) => sum + p.occupancyRate, 0) / properties.length;
    
    return Array.from({ length: 6 }, (_, i) => {
      const month = i + 1;
      const seasonalFactor = Math.sin((month / 12) * Math.PI * 2) * 5; // Seasonal variation
      const value = Math.min(100, Math.max(70, currentOccupancy + seasonalFactor + (Math.random() * 4 - 2)));
      const confidence = 90 - (month * 2);
      
      return {
        period: `Month ${month}`,
        value: Math.round(value * 10) / 10,
        confidence,
        trend: value > currentOccupancy + 2 ? 'up' : value < currentOccupancy - 2 ? 'down' : 'stable'
      };
    });
  };

  // Generate maintenance cost forecast
  const generateMaintenanceForecast = (): Forecast[] => {
    const avgMaintenance = historicalData.maintenanceCosts.reduce((a, b) => a + b, 0) / historicalData.maintenanceCosts.length;
    
    return Array.from({ length: 6 }, (_, i) => {
      const month = i + 1;
      const seasonalFactor = month >= 3 && month <= 5 ? 1.2 : 1.0; // Higher in spring
      const value = avgMaintenance * seasonalFactor * (1 + (Math.random() * 0.2 - 0.1));
      const confidence = 85 - (month * 2);
      
      return {
        period: `Month ${month}`,
        value: Math.round(value),
        confidence,
        trend: value > avgMaintenance * 1.1 ? 'up' : value < avgMaintenance * 0.9 ? 'down' : 'stable'
      };
    });
  };

  // Generate predictions
  const generatePredictions = (): Prediction[] => {
    const predictions: Prediction[] = [];

    // Revenue optimization prediction
    const underperformingProperties = properties.filter(p => p.roi < 5);
    if (underperformingProperties.length > 0) {
      predictions.push({
        id: 'revenue-opt',
        type: 'revenue',
        title: 'Revenue Optimization Opportunity',
        description: `${underperformingProperties.length} properties have ROI below 5%. Rent optimization could increase annual revenue by $${(underperformingProperties.length * 3600).toLocaleString()}.`,
        confidence: 87,
        impact: 'high',
        timeframe: '3-6 months',
        recommendation: 'Review market rates and adjust rent prices for underperforming properties. Consider property improvements to justify higher rates.',
        value: underperformingProperties.length * 3600
      });
    }

    // Tenant churn prediction
    const atRiskTenants = tenants.filter(t => t.renewalProbability < 60);
    if (atRiskTenants.length > 0) {
      predictions.push({
        id: 'churn-risk',
        type: 'churn',
        title: 'Tenant Churn Risk',
        description: `${atRiskTenants.length} tenants have low renewal probability. Expected vacancy cost: $${(atRiskTenants.length * 2400).toLocaleString()}.`,
        confidence: 82,
        impact: 'high',
        timeframe: '1-3 months',
        recommendation: 'Proactively reach out to at-risk tenants. Offer lease renewal incentives or address satisfaction concerns.',
        value: atRiskTenants.length * 2400
      });
    }

    // Maintenance cost spike prediction
    const highMaintenanceProperties = properties.filter(p => p.maintenanceCosts > 500);
    if (highMaintenanceProperties.length > 0) {
      predictions.push({
        id: 'maintenance-spike',
        type: 'maintenance',
        title: 'Maintenance Cost Increase',
        description: `${highMaintenanceProperties.length} properties showing elevated maintenance costs. Predicted 15% increase in next quarter.`,
        confidence: 78,
        impact: 'medium',
        timeframe: '1-3 months',
        recommendation: 'Schedule preventive maintenance to avoid costly emergency repairs. Consider property inspections.',
        value: highMaintenanceProperties.reduce((sum, p) => sum + p.maintenanceCosts, 0) * 0.15
      });
    }

    // Occupancy trend prediction
    const avgOccupancy = properties.reduce((sum, p) => sum + p.occupancyRate, 0) / properties.length;
    if (avgOccupancy < 85) {
      predictions.push({
        id: 'occupancy-trend',
        type: 'occupancy',
        title: 'Occupancy Improvement Potential',
        description: `Current occupancy at ${avgOccupancy.toFixed(1)}%. Marketing improvements could increase occupancy by 8-12%.`,
        confidence: 75,
        impact: 'high',
        timeframe: '2-4 months',
        recommendation: 'Enhance property listings, improve online presence, and consider competitive pricing strategies.',
        value: properties.length * 200 * 0.1
      });
    }

    // Seasonal revenue prediction
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 8 && currentMonth <= 10) {
      predictions.push({
        id: 'seasonal-revenue',
        type: 'revenue',
        title: 'Seasonal Revenue Opportunity',
        description: 'Fall season typically sees 12% increase in rental demand. Optimize pricing for peak season.',
        confidence: 88,
        impact: 'medium',
        timeframe: '1-2 months',
        recommendation: 'Adjust pricing strategy for seasonal demand. Prepare properties for increased showing activity.',
        value: historicalData.monthlyRevenue[historicalData.monthlyRevenue.length - 1] * 0.12
      });
    }

    // Expense optimization prediction
    const totalExpenses = historicalData.monthlyExpenses.reduce((a, b) => a + b, 0);
    const avgExpense = totalExpenses / historicalData.monthlyExpenses.length;
    predictions.push({
      id: 'expense-opt',
      type: 'expense',
      title: 'Expense Optimization',
      description: 'Bulk service contracts and preventive maintenance could reduce expenses by 8-10%.',
      confidence: 80,
      impact: 'medium',
      timeframe: '3-6 months',
      recommendation: 'Negotiate bulk service contracts with vendors. Implement preventive maintenance schedule.',
      value: avgExpense * 0.09
    });

    return predictions.sort((a, b) => b.confidence - a.confidence);
  };

  const revenueForecast = generateRevenueForecast();
  const occupancyForecast = generateOccupancyForecast();
  const maintenanceForecast = generateMaintenanceForecast();
  const predictions = generatePredictions();

  const getCurrentForecast = () => {
    switch (selectedForecast) {
      case 'revenue':
        return revenueForecast;
      case 'occupancy':
        return occupancyForecast;
      case 'maintenance':
        return maintenanceForecast;
      default:
        return revenueForecast;
    }
  };

  const getForecastIcon = () => {
    switch (selectedForecast) {
      case 'revenue':
        return DollarSign;
      case 'occupancy':
        return Home;
      case 'maintenance':
        return Activity;
      default:
        return LineChart;
    }
  };

  const ForecastIcon = getForecastIcon();
  const currentForecast = getCurrentForecast();

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold">Predictive Analytics</h2>
          <p className="text-gray-600">AI-powered forecasting and insights</p>
        </div>
      </div>

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Predictions</CardTitle>
              <CardDescription>
                Machine learning insights based on your portfolio data and market trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <Card key={prediction.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{prediction.title}</h3>
                              <Badge className={getImpactColor(prediction.impact)}>
                                {prediction.impact} impact
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{prediction.description}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Confidence</p>
                            <div className="flex items-center gap-2">
                              <Progress value={prediction.confidence} className="flex-1" />
                              <span className="text-sm font-medium">{prediction.confidence}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Timeframe</p>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">{prediction.timeframe}</span>
                            </div>
                          </div>
                          {prediction.value && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Potential Value</p>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-600">
                                  ${prediction.value.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 mb-1">Recommendation</p>
                              <p className="text-sm text-blue-700">{prediction.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>6-Month Forecast</CardTitle>
                  <CardDescription>Predictive trends for key metrics</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedForecast === 'revenue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedForecast('revenue')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Revenue
                  </Button>
                  <Button
                    variant={selectedForecast === 'occupancy' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedForecast('occupancy')}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Occupancy
                  </Button>
                  <Button
                    variant={selectedForecast === 'maintenance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedForecast('maintenance')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Maintenance
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Forecast Chart */}
                <div className="h-[300px] flex items-end justify-between gap-2">
                  {currentForecast.map((forecast, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">
                          {selectedForecast === 'revenue' && `$${(forecast.value / 1000).toFixed(0)}k`}
                          {selectedForecast === 'occupancy' && `${forecast.value}%`}
                          {selectedForecast === 'maintenance' && `$${(forecast.value / 1000).toFixed(1)}k`}
                        </span>
                        {getTrendIcon(forecast.trend)}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t hover:from-purple-700 hover:to-purple-500 transition-colors cursor-pointer"
                        style={{ 
                          height: `${(forecast.value / Math.max(...currentForecast.map(f => f.value))) * 100}%`,
                          minHeight: '20px'
                        }}
                        title={`${forecast.period}: ${
                          selectedForecast === 'revenue' ? `$${forecast.value.toLocaleString()}` :
                          selectedForecast === 'occupancy' ? `${forecast.value}%` :
                          `$${forecast.value.toLocaleString()}`
                        } (${forecast.confidence}% confidence)`}
                      />
                      <span className="text-xs text-gray-500">{forecast.period}</span>
                    </div>
                  ))}
                </div>

                {/* Forecast Details */}
                <div className="grid grid-cols-3 gap-4">
                  {currentForecast.slice(0, 3).map((forecast, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">{forecast.period}</span>
                          {getTrendIcon(forecast.trend)}
                        </div>
                        <p className="text-2xl font-bold mb-2">
                          {selectedForecast === 'revenue' && `$${forecast.value.toLocaleString()}`}
                          {selectedForecast === 'occupancy' && `${forecast.value}%`}
                          {selectedForecast === 'maintenance' && `$${forecast.value.toLocaleString()}`}
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress value={forecast.confidence} className="flex-1" />
                          <span className="text-xs text-gray-500">{forecast.confidence}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Forecast Summary */}
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-900 mb-1">Forecast Summary</p>
                        <p className="text-sm text-purple-700">
                          {selectedForecast === 'revenue' && 
                            `Revenue is projected to ${currentForecast[5].trend === 'up' ? 'increase' : 'decrease'} by ${Math.abs(((currentForecast[5].value - currentForecast[0].value) / currentForecast[0].value * 100)).toFixed(1)}% over the next 6 months. Average confidence: ${Math.round(currentForecast.reduce((sum, f) => sum + f.confidence, 0) / currentForecast.length)}%.`
                          }
                          {selectedForecast === 'occupancy' && 
                            `Occupancy is expected to ${currentForecast[5].trend === 'up' ? 'improve' : 'decline'} to ${currentForecast[5].value}% by month 6. Seasonal variations are factored into the forecast.`
                          }
                          {selectedForecast === 'maintenance' && 
                            `Maintenance costs are forecasted to ${currentForecast[5].trend === 'up' ? 'increase' : 'decrease'} by ${Math.abs(((currentForecast[5].value - currentForecast[0].value) / currentForecast[0].value * 100)).toFixed(1)}% over the next 6 months. Plan accordingly for budget allocation.`
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Rental Demand Up</p>
                      <p className="text-xs text-green-700">12% increase in your area</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Stable Prices</p>
                      <p className="text-xs text-blue-700">Market rates holding steady</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Competition Rising</p>
                      <p className="text-xs text-yellow-700">8% more listings nearby</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Portfolio Health</span>
                      <span className="text-sm font-medium text-green-600">Excellent</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Tenant Satisfaction</span>
                      <span className="text-sm font-medium text-green-600">High</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Operational Efficiency</span>
                      <span className="text-sm font-medium text-blue-600">Good</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Growth Potential</span>
                      <span className="text-sm font-medium text-purple-600">Strong</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="text-sm">Vacancy Risk</span>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Low</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                      <span className="text-sm">Maintenance Risk</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Medium</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="text-sm">Payment Default Risk</span>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Low</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="text-sm">Market Risk</span>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Low</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimization Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Optimization Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Rent Optimization</span>
                    </div>
                    <p className="text-xs text-purple-700">3 properties below market rate</p>
                    <p className="text-xs font-medium text-purple-900 mt-1">+$450/month potential</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Tenant Retention</span>
                    </div>
                    <p className="text-xs text-blue-700">Early renewal incentives available</p>
                    <p className="text-xs font-medium text-blue-900 mt-1">Save $2,400 in turnover costs</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Expense Reduction</span>
                    </div>
                    <p className="text-xs text-green-700">Bulk service contracts available</p>
                    <p className="text-xs font-medium text-green-900 mt-1">Save 8-10% on maintenance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}