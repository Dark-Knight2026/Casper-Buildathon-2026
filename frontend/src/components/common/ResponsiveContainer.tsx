import React from 'react';
import { cn } from '@/lib/utils';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  tabletClassName?: string;
  desktopClassName?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Responsive container that applies different classes based on device type
 * 
 * @example
 * <ResponsiveContainer
 *   className="p-4"
 *   mobileClassName="p-2"
 *   tabletClassName="p-3"
 *   desktopClassName="p-6"
 * >
 *   <Content />
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  children,
  className,
  mobileClassName,
  tabletClassName,
  desktopClassName,
  as: Component = 'div',
}: ResponsiveContainerProps) {
  const { isMobile, isTablet, isDesktop } = useMobileDetection();

  const responsiveClass = cn(
    className,
    isMobile && mobileClassName,
    isTablet && tabletClassName,
    isDesktop && desktopClassName
  );

  return <Component className={responsiveClass}>{children}</Component>;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  mobileCols?: number;
  tabletCols?: number;
  desktopCols?: number;
  gap?: number;
}

/**
 * Responsive grid that adjusts columns based on device type
 * 
 * @example
 * <ResponsiveGrid
 *   mobileCols={1}
 *   tabletCols={2}
 *   desktopCols={4}
 *   gap={4}
 * >
 *   {items.map(item => <Card key={item.id}>{item.content}</Card>)}
 * </ResponsiveGrid>
 */
export function ResponsiveGrid({
  children,
  className,
  mobileCols = 1,
  tabletCols = 2,
  desktopCols = 3,
  gap = 4,
}: ResponsiveGridProps) {
  const { isMobile, isTablet } = useMobileDetection();

  const cols = isMobile ? mobileCols : isTablet ? tabletCols : desktopCols;

  return (
    <div
      className={cn(
        'grid',
        `grid-cols-${cols}`,
        `gap-${gap}`,
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'horizontal' | 'vertical';
  mobileDirection?: 'horizontal' | 'vertical';
  gap?: number;
}

/**
 * Responsive stack that changes direction based on device type
 * 
 * @example
 * <ResponsiveStack
 *   direction="horizontal"
 *   mobileDirection="vertical"
 *   gap={4}
 * >
 *   <Button>Action 1</Button>
 *   <Button>Action 2</Button>
 * </ResponsiveStack>
 */
export function ResponsiveStack({
  children,
  className,
  direction = 'horizontal',
  mobileDirection = 'vertical',
  gap = 2,
}: ResponsiveStackProps) {
  const { isMobile } = useMobileDetection();

  const currentDirection = isMobile ? mobileDirection : direction;
  const flexDirection = currentDirection === 'horizontal' ? 'row' : 'column';

  return (
    <div
      className={cn(
        'flex',
        `gap-${gap}`,
        className
      )}
      style={{
        flexDirection,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {children}
    </div>
  );
}