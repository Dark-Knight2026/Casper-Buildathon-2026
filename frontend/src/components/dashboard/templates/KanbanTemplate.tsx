import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanTemplateProps {
  children: React.ReactNode;
  className?: string;
  columns?: number;
}

/**
 * Kanban Template - Column-based layout
 * Best for: Workflow dashboards with pipeline management
 * 
 * @example
 * <KanbanTemplate columns={4}>
 *   <KanbanColumn title="Leads">...</KanbanColumn>
 *   <KanbanColumn title="Qualified">...</KanbanColumn>
 *   <KanbanColumn title="Proposal">...</KanbanColumn>
 *   <KanbanColumn title="Closed">...</KanbanColumn>
 * </KanbanTemplate>
 */
export function KanbanTemplate({
  children,
  className,
  columns = 4,
}: KanbanTemplateProps) {
  return (
    <div className={cn('w-full h-full', className)}>
      {/* Desktop: Side-by-side columns */}
      <div className="hidden md:flex gap-4 h-full overflow-x-auto">
        {React.Children.map(children, (child) => (
          <div
            className="flex-shrink-0"
            style={{ width: `calc(${100 / columns}% - ${(columns - 1) * 16 / columns}px)` }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Mobile: Horizontal scroll */}
      <ScrollArea className="md:hidden w-full">
        <div className="flex gap-3 pb-4">
          {React.Children.map(children, (child) => (
            <div className="flex-shrink-0 w-[280px]">{child}</div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface KanbanColumnProps {
  children: React.ReactNode;
  className?: string;
  title: string;
  count?: number;
  color?: string;
}

/**
 * Kanban Column - Individual column in kanban layout
 */
export function KanbanColumn({
  children,
  className,
  title,
  count,
  color = 'bg-muted',
}: KanbanColumnProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Column Header */}
      <div className={cn('rounded-t-lg p-3 sm:p-4', color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          {count !== undefined && (
            <span className="text-xs sm:text-sm bg-background/50 px-2 py-1 rounded-full">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 border border-t-0 rounded-b-lg p-2 sm:p-3 bg-background">
        <div className="space-y-2 sm:space-y-3">{children}</div>
      </ScrollArea>
    </div>
  );
}

interface KanbanCardProps {
  children: React.ReactNode;
  className?: string;
  draggable?: boolean;
}

/**
 * Kanban Card - Individual card in kanban column
 */
export function KanbanCard({
  children,
  className,
  draggable = false,
}: KanbanCardProps) {
  return (
    <div
      className={cn(
        'p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow',
        draggable && 'cursor-move',
        className
      )}
      draggable={draggable}
    >
      {children}
    </div>
  );
}