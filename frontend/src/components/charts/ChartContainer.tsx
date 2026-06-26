import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  height?: number;
  action?: React.ReactNode;
}

/**
 * Responsive container for charts with loading and empty states
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  className,
  height = 300,
  action,
}) => {
  return (
    <Card className={cn('h-full', className)}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
            {description && <CardDescription className="text-sm">{description}</CardDescription>}
          </div>
          {action && <div className="flex items-center">{action}</div>}
        </CardHeader>
      )}
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-end justify-between space-x-2" style={{ height: `${height}px` }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="w-full" 
                  style={{ height: `${Math.random() * 60 + 40}%` }}
                />
              ))}
            </div>
          </div>
        ) : isEmpty ? (
          <div 
            className="flex items-center justify-center text-center text-muted-foreground"
            style={{ height: `${height}px` }}
          >
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {children}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};