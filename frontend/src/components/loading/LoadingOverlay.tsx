/**
 * Loading Overlay Component
 * Full-screen loading indicator with optional message
 */

import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

export function LoadingOverlay({ 
  message = 'Loading...', 
  transparent = false 
}: LoadingOverlayProps) {
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-background/60' : 'bg-background/80'
      } backdrop-blur-sm`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        {message && (
          <p className="text-sm text-muted-foreground font-medium">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}