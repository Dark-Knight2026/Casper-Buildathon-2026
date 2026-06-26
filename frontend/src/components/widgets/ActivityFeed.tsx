import React from 'react';
import { LucideIcon, Calendar, MessageSquare, FileText, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type ActivityType = 'transaction' | 'appointment' | 'message' | 'update';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

const activityIcons: Record<ActivityType, LucideIcon> = {
  transaction: TrendingUp,
  appointment: Calendar,
  message: MessageSquare,
  update: FileText,
};

const activityColors: Record<ActivityType, string> = {
  transaction: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  appointment: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  message: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  update: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
};

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const Icon = activityIcons[activity.type];
  const colorClass = activityColors[activity.type];

  return (
    <div className="flex items-start space-x-3 py-3">
      <div className={cn('rounded-full p-2', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{activity.title}</p>
        {activity.description && (
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-start space-x-3 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-center', className)}>
        <div className="text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 opacity-50" />
          <p className="mt-2 text-sm">No activities yet</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-[400px]', className)}>
      <div className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
        {hasMore && onLoadMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Load more
          </button>
        )}
      </div>
    </ScrollArea>
  );
};