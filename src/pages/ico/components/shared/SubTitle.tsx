import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SubTitleProps {
  children: ReactNode;
  className?: string;
}

export function SubTitle({ children, className }: SubTitleProps) {
  return (
    <h2
      className={cn(
        'text-2xl pl-2 font-bold text-[hsl(var(--ico-text-primary))]',
        className
      )}
    >
      {children}
    </h2>
  );
}

