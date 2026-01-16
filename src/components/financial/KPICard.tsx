import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/types/financial';

interface KPICardProps {
  data: KPIData;
  loading?: boolean;
}

export default function KPICard({ data, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (value: number, format: 'currency' | 'percentage' | 'number') => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return value.toString();
    }
  };

  const getTrendIcon = () => {
    switch (data.trend.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    // For revenue-like metrics, up is good
    if (data.label.includes('Revenue') || data.label.includes('Income') || data.label.includes('Occupancy') || data.label.includes('Collection')) {
      return data.trend.trend === 'up' ? 'text-green-600' : data.trend.trend === 'down' ? 'text-red-600' : 'text-gray-600';
    }
    // For expense-like metrics, down is good
    if (data.label.includes('Expense') || data.label.includes('Vacancy')) {
      return data.trend.trend === 'down' ? 'text-green-600' : data.trend.trend === 'up' ? 'text-red-600' : 'text-gray-600';
    }
    // Default
    return data.trend.trend === 'up' ? 'text-green-600' : data.trend.trend === 'down' ? 'text-red-600' : 'text-gray-600';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-600">{data.label}</p>
        </div>
        
        <div className="flex items-baseline justify-between">
          <h3 className="text-3xl font-bold">
            {formatValue(data.trend.current, data.format)}
          </h3>
        </div>

        <div className={cn('flex items-center gap-1 mt-2 text-sm font-medium', getTrendColor())}>
          {getTrendIcon()}
          <span>
            {data.trend.changePercentage > 0 ? '+' : ''}
            {data.trend.changePercentage.toFixed(1)}%
          </span>
          <span className="text-gray-500 font-normal ml-1">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}