import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { LeaseAgreement } from '@/types/lease';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  leases: LeaseAgreement[];
  color?: string;
  onEdit?: (lease: LeaseAgreement) => void;
  onAIAssist?: (lease: LeaseAgreement) => void;
  onCheckCompliance?: (lease: LeaseAgreement) => void;
}

export function KanbanColumn({ 
  id, 
  title, 
  leases, 
  color,
  onEdit,
  onAIAssist,
  onCheckCompliance
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full min-w-[280px] w-full bg-muted/50 rounded-lg border border-border/50">
      <div className={cn("p-3 border-b flex items-center justify-between rounded-t-lg", color)}>
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs font-medium bg-background/50 px-2 py-0.5 rounded-full">
          {leases.length}
        </span>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div ref={setNodeRef} className="min-h-[150px]">
          <SortableContext 
            items={leases.map(l => l.id)} 
            strategy={verticalListSortingStrategy}
          >
            {leases.map((lease) => (
              <KanbanCard 
                key={lease.id} 
                lease={lease} 
                onEdit={onEdit}
                onAIAssist={onAIAssist}
                onCheckCompliance={onCheckCompliance}
              />
            ))}
          </SortableContext>
          {leases.length === 0 && (
            <div className="h-24 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
              No leases
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}