import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

const LoadingSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <div
    className={cn(
      'grid gap-4',
      columns === 2 && 'grid-cols-1 sm:grid-cols-2',
      columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    )}
  >
    {Array.from({ length: columns * 2 }).map((_, i) => (
      <Skeleton key={i} className="h-24 w-full" />
    ))}
  </div>
);

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  isLoading = false,
  columns = 4,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSkeleton columns={columns} />
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">No actions available</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            disabled={action.disabled || action.isLoading}
            className={cn(
              'h-auto flex-col space-y-2 py-6',
              'hover:scale-105 transition-transform'
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
};