import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  description?: string;
  colorScheme?: ColorScheme;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

const colorSchemes: Record<ColorScheme, { bg: string; text: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-600 dark:text-green-400',
    icon: 'text-green-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'text-purple-500',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'text-orange-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-400',
    icon: 'text-red-500',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  description,
  colorScheme = 'blue',
  onClick,
  isLoading = false,
  className,
}) => {
  const colors = colorSchemes[colorScheme];
  const isPositiveTrend = trend !== undefined && trend > 0;
  const isNegativeTrend = trend !== undefined && trend < 0;

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'h-full transition-all hover:shadow-md',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend !== undefined && (
                <div
                  className={cn(
                    'flex items-center text-sm font-medium',
                    isPositiveTrend && 'text-green-600 dark:text-green-400',
                    isNegativeTrend && 'text-red-600 dark:text-red-400'
                  )}
                >
                  {isPositiveTrend && <TrendingUp className="mr-1 h-4 w-4" />}
                  {isNegativeTrend && <TrendingDown className="mr-1 h-4 w-4" />}
                  <span>{Math.abs(trend)}%</span>
                </div>
              )}
            </div>
            {(trendLabel || description) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {trendLabel || description}
              </p>
            )}
          </div>
          <div className={cn('rounded-full p-3', colors.bg)}>
            <Icon className={cn('h-6 w-6', colors.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};