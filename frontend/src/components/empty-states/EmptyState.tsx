/**
 * Base Empty State Component
 * Reusable component for displaying empty states
 */

import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  heading,
  message,
  action,
  compact = false,
}: EmptyStateProps) {
  const padding = compact ? 'p-8' : 'p-16';
  const iconSize = compact ? 'h-12 w-12' : 'h-16 w-16';
  const headingSize = compact ? 'text-lg' : 'text-xl';

  return (
    <div 
      className={`flex flex-col items-center justify-center ${padding} text-center`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`${iconSize} text-muted-foreground mb-4`} aria-hidden="true" />
      <h3 className={`${headingSize} font-semibold mb-2`}>
        {heading}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {message}
      </p>
      {action && (
        <Button onClick={action.onClick} size={compact ? 'sm' : 'default'}>
          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}