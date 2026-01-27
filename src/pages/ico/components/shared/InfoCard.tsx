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
        'grid grid-cols-1 bg-black rounded-xl md:grid-cols-4 z-20',
        className
      )}
    >
      {children}
    </div>
  );
}

export default InfoCard;
