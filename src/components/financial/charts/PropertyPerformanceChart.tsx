import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PropertyPerformance } from '@/types/financial';

interface PropertyPerformanceChartProps {
  data: PropertyPerformance[];
  loading?: boolean;
}

export default function PropertyPerformanceChart({ data, loading }: PropertyPerformanceChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-gray-500">No property data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Truncate long property names
  const chartData = data.map(item => ({
    ...item,
    shortName: item.propertyName.length > 30 
      ? item.propertyName.substring(0, 27) + '...' 
      : item.propertyName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(320, data.length * 60)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 150 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label: string) => {
                const item = data.find(d => d.propertyName.startsWith(label.replace('...', '')));
                return item?.propertyName || label;
              }}
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}