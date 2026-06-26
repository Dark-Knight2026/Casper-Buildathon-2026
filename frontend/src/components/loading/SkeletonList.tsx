/**
 * Skeleton List Component
 * Placeholder for list content while loading
 */

import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
}

export function SkeletonList({ items = 5, showAvatar = true }: SkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-start gap-4">
          {/* Avatar */}
          {showAvatar && (
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          )}
          
          {/* Content */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          
          {/* Action */}
          <Skeleton className="h-9 w-20 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}