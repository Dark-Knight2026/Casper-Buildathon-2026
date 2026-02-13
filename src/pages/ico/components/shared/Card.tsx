import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'relative flex flex-col gap-2 items-center justify-center rounded-xl overflow-hidden',
        'bg-[hsl(var(--ico-bg-secondary))] border border-sky-800/70',
        'shadow-2xl shadow-sky-500/20',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-tl from-white/15 via-transparent to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

export default Card;
