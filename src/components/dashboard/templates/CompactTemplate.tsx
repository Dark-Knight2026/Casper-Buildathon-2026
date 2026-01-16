import React from 'react';
import { cn } from '@/lib/utils';

interface CompactTemplateProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Compact Template - Dense layout with tighter spacing
 * Best for: Power users who want more information on screen
 * 
 * @example
 * <CompactTemplate>
 *   <Card className="p-3">Compact Card 1</Card>
 *   <Card className="p-3">Compact Card 2</Card>
 * </CompactTemplate>
 */
export function CompactTemplate({ children, className }: CompactTemplateProps) {
  return (
    <div
      className={cn(
        'w-full space-y-2 sm:space-y-3',
        // Reduce all spacing globally within this template
        '[&_*]:leading-tight',
        '[&_.card]:p-3',
        '[&_.card-header]:p-3',
        '[&_.card-content]:p-3',
        '[&_.card-footer]:p-3',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CompactGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

/**
 * Compact Grid - Dense grid layout
 */
export function CompactGrid({
  children,
  className,
  columns = { mobile: 1, tablet: 3, desktop: 4 },
}: CompactGridProps) {
  return (
    <div
      className={cn('grid gap-2 sm:gap-3 w-full', className)}
      style={{
        gridTemplateColumns: `repeat(${columns.mobile}, minmax(0, 1fr))`,
      }}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          div {
            grid-template-columns: repeat(${columns.tablet}, minmax(0, 1fr)) !important;
          }
        }
        @media (min-width: 1024px) {
          div {
            grid-template-columns: repeat(${columns.desktop}, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}

interface CompactSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Compact Section - Section with minimal spacing
 */
export function CompactSection({
  children,
  className,
  title,
}: CompactSectionProps) {
  return (
    <section className={cn('w-full', className)}>
      {title && (
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}