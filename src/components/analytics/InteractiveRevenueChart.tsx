import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Home, ArrowLeft } from 'lucide-react';

interface RevenueData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  properties: PropertyRevenue[];
}

interface PropertyRevenue {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  occupancy: number;
}

// Mock data generator
const generateMonthlyData = (): RevenueData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map((month) => ({
    month,
    revenue: 45000 + Math.random() * 15000,
    expenses: 25000 + Math.random() * 8000,
    profit: 20000 + Math.random() * 7000,
    properties: [
      {
        id: '1',
        name: 'Sunset Apartments',
        revenue: 15000 + Math.random() * 5000,
        expenses: 8000 + Math.random() * 3000,
        profit: 7000 + Math.random() * 2000,
        occupancy: 85 + Math.random() * 15
      },
      {
        id: '2',
        name: 'Downtown Lofts',
        revenue: 18000 + Math.random() * 6000,
        expenses: 10000 + Math.random() * 3500,
        profit: 8000 + Math.random() * 2500,
        occupancy: 90 + Math.random() * 10
      },
      {
        id: '3',
        name: 'Riverside Complex',
        revenue: 12000 + Math.random() * 4000,
        expenses: 7000 + Math.random() * 2500,
        profit: 5000 + Math.random() * 1500,
        occupancy: 80 + Math.random() * 15
      }
    ]
  }));
};

type ChartType = 'line' | 'bar' | 'area';
type ViewMode = 'overview' | 'property-detail';

export default function InteractiveRevenueChart() {
  const [data] = useState<RevenueData[]>(generateMonthlyData());
  const [chartType, setChartType] = useState<ChartType>('area');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedMonth, setSelectedMonth] = useState<RevenueData | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRevenue | null>(null);

  const handleMonthClick = (data: { activePayload?: Array<{ payload: RevenueData }> }) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const monthData = data.activePayload[0].payload;
      setSelectedMonth(monthData);
      setViewMode('property-detail');
    }
  };

  const handlePropertyClick = (property: PropertyRevenue) => {
    setSelectedProperty(property);
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedMonth(null);
    setSelectedProperty(null);
  };

  const calculateTrend = () => {
    if (data.length < 2) return { value: 0, isPositive: true };
    const lastMonth = data[data.length - 1].revenue;
    const previousMonth = data[data.length - 2].revenue;
    const change = ((lastMonth - previousMonth) / previousMonth) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const trend = calculateTrend();
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold mb-2">{payload[0].payload.month}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value?.toLocaleString()}
            </p>
          ))}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Click to view property breakdown
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: handleMonthClick,
      className: "cursor-pointer"
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
            <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
            <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
            <Area type="monotone" dataKey="profit" stackId="3" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Profit" />
          </AreaChart>
        );
    }
  };

  const renderPropertyDetail = () => {
    if (!selectedMonth) return null;

    const propertyData = selectedMonth.properties.map(p => ({
      name: p.name,
      revenue: p.revenue,
      expenses: p.expenses,
      profit: p.profit
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleBackToOverview}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div>
              <h3 className="text-lg font-semibold">{selectedMonth.month} Property Breakdown</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click on a property for detailed analysis
              </p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={propertyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedMonth.properties.map((property) => (
            <Card
              key={property.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handlePropertyClick(property)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <Badge variant={property.occupancy >= 90 ? 'default' : 'secondary'}>
                    {property.occupancy.toFixed(0)}% Occupied
                  </Badge>
                </div>
                <CardTitle className="text-base">{property.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${property.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Expenses</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      ${property.expenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-semibold">Net Profit</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      ${property.profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedProperty && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">
                {selectedProperty.name} - Detailed Analysis
              </CardTitle>
              <CardDescription className="text-blue-800 dark:text-blue-200">
                Performance metrics for {selectedMonth.month}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Revenue</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${selectedProperty.revenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Expenses</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${selectedProperty.expenses.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Profit</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ${selectedProperty.profit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Profit Margin</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {((selectedProperty.profit / selectedProperty.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Trends & Analysis
            </CardTitle>
            <CardDescription>
              {viewMode === 'overview' 
                ? 'Interactive revenue, expenses, and profit visualization. Click any month to drill down.'
                : `Detailed breakdown for ${selectedMonth?.month}`
              }
            </CardDescription>
          </div>
          {viewMode === 'overview' && (
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                Area
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'overview' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  ${totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">Net Profit</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${totalProfit.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-200">Trend</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {trend.value.toFixed(1)}%
                  </p>
                  {trend.isPositive ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              {renderChart()}
            </ResponsiveContainer>

            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Interactive Chart</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click on any month in the chart to view property-level breakdown and detailed analysis.
                    Switch between chart types using the buttons above.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          renderPropertyDetail()
        )}
      </CardContent>
    </Card>
  );
}