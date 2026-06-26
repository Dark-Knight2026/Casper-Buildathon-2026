import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * Loading fallback component for Suspense boundaries
 * Used during code splitting lazy loading
 */
export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'Loading...',
  fullScreen = false,
  className,
}) => {
  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

/**
 * Page-level loading fallback
 */
export const PageLoadingFallback: React.FC = () => (
  <LoadingFallback message="Loading page..." fullScreen />
);

/**
 * Component-level loading fallback
 */
export const ComponentLoadingFallback: React.FC = () => (
  <LoadingFallback message="Loading component..." />
);