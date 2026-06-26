/**
 * Sortable Field Component
 * Draggable field item for report builder
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportField } from '@/types/report';

interface SortableFieldProps {
  field: ReportField;
  onRemove: (fieldId: string) => void;
}

export function SortableField({ field, onRemove }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border rounded-lg bg-white hover:bg-gray-50"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{field.label}</p>
        <p className="text-xs text-gray-600">
          {field.aggregation} • {field.format}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRemove(field.id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}