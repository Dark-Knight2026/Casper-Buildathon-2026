import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface InfoCardProps {
  children: ReactNode;
  className?: string;
}

export function InfoCard({ children, className }: InfoCardProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 bg-[hsl(var(--ico-bg-card))] rounded-md md:grid-cols-4 z-20 border border-[hsl(var(--ico-border-color))]',
        className
      )}
    >
      {children}
    </div>
  );
}

