/**
 * Comparative Analytics Component
 * Year-over-year and period-over-period comparisons
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
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
import type { ReportConfig, ComparativeData, ComparisonType } from '@/types/report';
import { reportService } from '@/services/reportService';

interface ComparativeAnalyticsProps {
  config: ReportConfig;
}

export function ComparativeAnalytics({ config }: ComparativeAnalyticsProps) {
  const [comparisonType, setComparisonType] = useState<ComparisonType>('year_over_year');
  const [data, setData] = useState<ComparativeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const configWithComparison = {
        ...config,
        includeComparison: true,
        comparisonType,
      };
      const result = await reportService.generateComparativeReport(configWithComparison);
      setData(result);
    } catch (error) {
      console.error('Error loading comparative data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [config, comparisonType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading comparative data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-600">No comparative data available</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isPositive: boolean = true) => {
    if (trend === 'stable') return 'text-gray-600';
    if ((trend === 'up' && isPositive) || (trend === 'down' && !isPositive)) {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  // Prepare chart data
  const chartData = data.current.rows.map((currentRow, index) => {
    const previousRow = data.previous.rows[index];
    const result: Record<string, string | number> = {
      name: currentRow[data.current.headers[0].toLowerCase().replace(/ /g, '_')] as string,
    };

    data.current.headers.slice(1).forEach((header) => {
      const key = header.toLowerCase().replace(/ /g, '_');
      result[`current_${key}`] = currentRow[key] as number;
      result[`previous_${key}`] = previousRow[key] as number;
    });

    return result;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparative Analytics</CardTitle>
              <CardDescription>Compare performance across different time periods</CardDescription>
            </div>
            <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year_over_year">Year over Year</SelectItem>
                <SelectItem value="month_over_month">Month over Month</SelectItem>
                <SelectItem value="quarter_over_quarter">Quarter over Quarter</SelectItem>
                <SelectItem value="property_comparison">Property Comparison</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.comparison.map((item) => {
              const isPositiveMetric = !item.metric.toLowerCase().includes('expense');
              return (
                <Card key={item.metric}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">{item.metric}</p>
                      {getTrendIcon(item.trend)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-2xl font-bold">{item.currentValue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Current</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">{item.previousValue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Previous</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${getTrendColor(item.trend, isPositiveMetric)}`}>
                        <span className="text-lg font-semibold">
                          {item.changePercentage > 0 ? '+' : ''}
                          {item.changePercentage.toFixed(1)}%
                        </span>
                        <Badge
                          variant={item.trend === 'up' ? 'default' : item.trend === 'down' ? 'destructive' : 'secondary'}
                        >
                          {item.change > 0 ? '+' : ''}
                          {item.change.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trend Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="line">
            <TabsList>
              <TabsTrigger value="line">Line Chart</TabsTrigger>
              <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            </TabsList>

            <TabsContent value="line" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {data.current.headers.slice(1).map((header, index) => {
                    const key = header.toLowerCase().replace(/ /g, '_');
                    return (
                      <>
                        <Line
                          key={`current_${key}`}
                          type="monotone"
                          dataKey={`current_${key}`}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name={`Current ${header}`}
                        />
                        <Line
                          key={`previous_${key}`}
                          type="monotone"
                          dataKey={`previous_${key}`}
                          stroke="#94a3b8"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name={`Previous ${header}`}
                        />
                      </>
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="bar" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {data.current.headers.slice(1).map((header, index) => {
                    const key = header.toLowerCase().replace(/ /g, '_');
                    return (
                      <>
                        <Bar key={`current_${key}`} dataKey={`current_${key}`} fill="#3b82f6" name={`Current ${header}`} />
                        <Bar key={`previous_${key}`} dataKey={`previous_${key}`} fill="#94a3b8" name={`Previous ${header}`} />
                      </>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}