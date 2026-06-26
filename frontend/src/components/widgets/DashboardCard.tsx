import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon: Icon,
  action,
  children,
  isLoading = false,
  isEmpty = false,
  emptyState,
  className,
  headerClassName,
  contentClassName,
}) => {
  return (
    <Card className={cn('h-full', className)}>
      {(title || description || Icon || action) && (
        <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-4', headerClassName)}>
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            <div>
              {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
              {description && <CardDescription className="text-sm">{description}</CardDescription>}
            </div>
          </div>
          {action && <div className="flex items-center">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(contentClassName)}>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isEmpty && emptyState ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {emptyState}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};