import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface DraggableWidgetProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export default function DraggableWidget({ id, children, disabled }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </div>
      )}
      {children}
    </div>
  );
}