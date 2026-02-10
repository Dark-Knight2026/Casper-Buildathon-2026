import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 items-center justify-center rounded-md overflow-hidden',
        'bg-[hsl(var(--ico-bg-card))] border border-[hsl(var(--ico-border-color))]',
        'shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export default Card;
