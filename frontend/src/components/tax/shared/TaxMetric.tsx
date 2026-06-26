import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TaxMetricProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export const TaxMetric: React.FC<TaxMetricProps> = ({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
  className,
  valueClassName,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            {icon && (
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className={cn("text-2xl font-bold tracking-tight", valueClassName)}>
                  {value}
                </h3>
                {subValue && (
                  <span className="text-sm text-muted-foreground">{subValue}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        {(trend || trendValue) && (
          <div className="mt-4 flex items-center text-xs">
            {getTrendIcon()}
            <span className={cn("ml-1 font-medium", getTrendColor())}>
              {trendValue}
            </span>
            {trend && <span className="ml-1 text-muted-foreground">vs last period</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};