import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface SplitTemplateProps {
  children: React.ReactNode;
  className?: string;
  sidebar: React.ReactNode;
  sidebarWidth?: string;
  defaultCollapsed?: boolean;
}

/**
 * Split Template - Two-panel layout
 * Best for: Comparison dashboards or master-detail views
 * 
 * @example
 * <SplitTemplate
 *   sidebar={<PropertyList />}
 *   sidebarWidth="30%"
 * >
 *   <PropertyDetails />
 * </SplitTemplate>
 */
export function SplitTemplate({
  children,
  className,
  sidebar,
  sidebarWidth = '30%',
  defaultCollapsed = false,
}: SplitTemplateProps) {
  const { isMobile } = useMobileDetection();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // On mobile, show as vertical stack
  if (isMobile) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <div className="w-full">{sidebar}</div>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-4 h-full', className)}>
      {/* Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed ? 'w-0' : ''
        )}
        style={{ width: isCollapsed ? '0' : sidebarWidth }}
      >
        <div className="h-full overflow-y-auto">{sidebar}</div>
      </div>

      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="flex-shrink-0 h-10 w-10"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}