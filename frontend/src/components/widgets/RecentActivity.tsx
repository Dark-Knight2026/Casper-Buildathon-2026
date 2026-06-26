import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: LucideIcon;
  metadata?: Record<string, unknown>;
  onClick?: () => void;
}

interface RecentActivityProps {
  items: RecentItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  onItemClick?: (item: RecentItem) => void;
  className?: string;
}

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center justify-between space-x-4 py-3">
        <div className="flex items-center space-x-3 flex-1">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    ))}
  </div>
);

const RecentItemComponent: React.FC<{
  item: RecentItem;
  onClick?: (item: RecentItem) => void;
}> = ({ item, onClick }) => {
  const Icon = item.icon;
  const handleClick = () => {
    if (item.onClick) {
      item.onClick();
    } else if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between space-x-4 rounded-lg py-3 px-2 transition-colors',
        (item.onClick || onClick) && 'cursor-pointer hover:bg-accent'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {Icon && (
          <div className="rounded-full bg-muted p-2 flex-shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-none truncate">{item.title}</p>
          {item.subtitle && (
            <p className="text-sm text-muted-foreground mt-1 truncate">{item.subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {item.status && (
          <Badge variant={item.statusVariant || 'secondary'} className="text-xs">
            {item.status}
          </Badge>
        )}
        {(item.onClick || onClick) && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

export const RecentActivity: React.FC<RecentActivityProps> = ({
  items,
  isLoading = false,
  emptyMessage = 'No recent activity',
  onItemClick,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-center', className)}>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-[400px]', className)}>
      <div className="space-y-1">
        {items.map((item) => (
          <RecentItemComponent key={item.id} item={item} onClick={onItemClick} />
        ))}
      </div>
    </ScrollArea>
  );
};