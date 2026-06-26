/**
 * Skeleton Card Component
 * Placeholder for card content while loading
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface SkeletonCardProps {
  showImage?: boolean;
  showFooter?: boolean;
}

export function SkeletonCard({ showImage = true, showFooter = true }: SkeletonCardProps) {
  return (
    <Card>
      {showImage && (
        <CardHeader className="p-0">
          <Skeleton className="h-48 w-full rounded-t-lg rounded-b-none" />
        </CardHeader>
      )}
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
      {showFooter && (
        <CardFooter className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      )}
    </Card>
  );
}