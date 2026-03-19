import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface TitleProps {
  children: ReactNode;
  className?: string;
}

export function Title({ children, className }: TitleProps) {
  return (
    <h1
      className={cn(
        'text-3xl md:text-4xl lg:text-5xl font-bold text-[hsl(var(--ico-text-primary))]',
        className
      )}
    >
      {children}
    </h1>
  );
}

