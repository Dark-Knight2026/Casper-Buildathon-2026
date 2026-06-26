import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  mobileLayout?: 'stack' | 'scroll' | 'grid';
  tabletLayout?: 'grid' | 'flex' | 'stack';
  desktopLayout?: 'grid' | 'flex';
}

/**
 * ResponsiveContainer - A wrapper component that adapts layout based on screen size
 * 
 * Breakpoints:
 * - Mobile: < 640px
 * - Tablet: 640px - 1024px
 * - Desktop: > 1024px
 */
function ResponsiveContainerComponent({
  children,
  className,
  mobileLayout = 'stack',
  tabletLayout = 'grid',
  desktopLayout = 'grid'
}: ResponsiveContainerProps) {
  const mobileClasses = {
    stack: 'flex flex-col space-y-4',
    scroll: 'flex overflow-x-auto space-x-4 pb-4 snap-x snap-mandatory',
    grid: 'grid grid-cols-1 gap-4'
  };

  const tabletClasses = {
    grid: 'sm:grid sm:grid-cols-2 sm:gap-6',
    flex: 'sm:flex sm:flex-row sm:space-x-6 sm:space-y-0',
    stack: 'sm:flex sm:flex-col sm:space-y-6'
  };

  const desktopClasses = {
    grid: 'lg:grid-cols-3 lg:gap-8',
    flex: 'lg:flex lg:flex-row lg:space-x-8'
  };

  return (
    <div
      className={cn(
        mobileClasses[mobileLayout],
        tabletClasses[tabletLayout],
        desktopClasses[desktopLayout],
        className
      )}
    >
      {children}
    </div>
  );
}

const ResponsiveContainer = memo(ResponsiveContainerComponent);
export default ResponsiveContainer;

/**
 * MobileCard - A card component optimized for mobile touch interactions
 */
interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  touchOptimized?: boolean;
}

function MobileCardComponent({
  children,
  className,
  onClick,
  touchOptimized = true
}: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border shadow-sm',
        touchOptimized && 'min-h-[44px] active:scale-[0.98] transition-transform',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

export const MobileCard = memo(MobileCardComponent);

/**
 * MobileStack - A vertical stack optimized for mobile scrolling
 */
interface MobileStackProps {
  children: ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
}

function MobileStackComponent({
  children,
  className,
  spacing = 'normal'
}: MobileStackProps) {
  const spacingClasses = {
    tight: 'space-y-2',
    normal: 'space-y-4',
    loose: 'space-y-6'
  };

  return (
    <div className={cn('flex flex-col', spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

export const MobileStack = memo(MobileStackComponent);

/**
 * MobileGrid - A responsive grid that adapts to screen size
 */
interface MobileGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    mobile?: 1 | 2;
    tablet?: 2 | 3 | 4;
    desktop?: 3 | 4 | 5 | 6;
  };
}

function MobileGridComponent({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 }
}: MobileGridProps) {
  const mobileColClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2'
  };

  const tabletColClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4'
  };

  const desktopColClasses = {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6'
  };

  return (
    <div
      className={cn(
        'grid gap-4',
        mobileColClasses[cols.mobile || 1],
        tabletColClasses[cols.tablet || 2],
        desktopColClasses[cols.desktop || 3],
        className
      )}
    >
      {children}
    </div>
  );
}

export const MobileGrid = memo(MobileGridComponent);

/**
 * TouchTarget - Ensures minimum touch target size (44x44px) for accessibility
 */
interface TouchTargetProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function TouchTargetComponent({ children, className, onClick }: TouchTargetProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-h-[44px] min-w-[44px] flex items-center justify-center',
        'active:bg-gray-100 rounded-lg transition-colors',
        className
      )}
      type="button"
    >
      {children}
    </button>
  );
}

export const TouchTarget = memo(TouchTargetComponent);

/**
 * MobileDrawer - A bottom drawer component for mobile devices
 */
interface MobileDrawerProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

function MobileDrawerComponent({ children, isOpen, onClose, title }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export const MobileDrawer = memo(MobileDrawerComponent);

/**
 * useResponsive - Hook to detect current breakpoint
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useResponsive() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: true };
  }

  const width = window.innerWidth;
  
  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024
  };
}