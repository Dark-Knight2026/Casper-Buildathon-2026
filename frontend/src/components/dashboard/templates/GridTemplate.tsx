import React from 'react';
import { cn } from '@/lib/utils';

interface GridTemplateProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
}

/**
 * Grid Template - Card-based grid layout
 * Best for: Overview dashboards with metrics and charts
 * 
 * @example
 * <GridTemplate columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
 *   <Card>Metric 1</Card>
 *   <Card>Metric 2</Card>
 *   <Card>Metric 3</Card>
 * </GridTemplate>
 */
export function GridTemplate({
  children,
  className,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 4,
}: GridTemplateProps) {
  return (
    <div
      className={cn(
        'grid w-full',
        `gap-${gap}`,
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns.mobile}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`,
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

interface GridItemProps {
  children: React.ReactNode;
  className?: string;
  span?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

/**
 * Grid Item - Individual item in grid layout
 * Can span multiple columns
 */
export function GridItem({
  children,
  className,
  span = { mobile: 1, tablet: 1, desktop: 1 },
}: GridItemProps) {
  return (
    <div
      className={cn('w-full', className)}
      style={{
        gridColumn: `span ${span.mobile}`,
      }}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          div {
            grid-column: span ${span.tablet} !important;
          }
        }
        @media (min-width: 1024px) {
          div {
            grid-column: span ${span.desktop} !important;
          }
        }
      `}</style>
      {children}
    </div>
  );
}