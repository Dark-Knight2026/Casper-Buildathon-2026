/**
 * Skeleton Table Component
 * Placeholder for table content while loading
 */

import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  showHeader = true 
}: SkeletonTableProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 pb-3 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton 
              key={`header-${i}`} 
              className="h-5 flex-1" 
            />
          ))}
        </div>
      )}
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, colIndex) => {
            // Vary the width for more realistic look
            const widthClass = colIndex === columns - 1 
              ? 'w-24' // Actions column
              : 'flex-1';
            
            return (
              <Skeleton 
                key={`cell-${rowIndex}-${colIndex}`} 
                className={`h-12 ${widthClass}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}