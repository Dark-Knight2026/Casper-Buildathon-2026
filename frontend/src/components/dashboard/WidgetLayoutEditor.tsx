import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardPreferences, WidgetConfig, DashboardWidget } from '@/contexts/DashboardPreferencesContext';
import DraggableWidget from './DraggableWidget';
import { Save, RotateCcw } from 'lucide-react';

const WIDGET_LABELS: Record<DashboardWidget, string> = {
  'quick-stats': 'Quick Stats',
  'properties-attention': 'Properties Needing Attention',
  'top-properties': 'Top Performing Properties',
  'notifications': 'Recent Notifications',
  'financial-summary': 'Financial Summary',
  'maintenance-requests': 'Maintenance Requests',
  'lease-expiring': 'Expiring Leases',
  'tax-reminders': 'Tax Reminders'
};

interface WidgetLayoutEditorProps {
  onSave?: () => void;
}

export default function WidgetLayoutEditor({ onSave }: WidgetLayoutEditorProps) {
  const { preferences, reorderWidgets, toggleWidget } = useDashboardPreferences();
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(preferences.layout.widgets);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update order property
        return newOrder.map((item, index) => ({
          ...item,
          order: index
        }));
      });
      setHasChanges(true);
    }
  };

  const handleToggleWidget = (widgetId: DashboardWidget) => {
    setLocalWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, enabled: !item.enabled } : item
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    reorderWidgets(localWidgets);
    setHasChanges(false);
    onSave?.();
  };

  const handleReset = () => {
    setLocalWidgets(preferences.layout.widgets);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customize Dashboard Layout</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Drag widgets to reorder them, toggle visibility, and save your custom layout
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Layout
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localWidgets.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localWidgets.map((widget) => (
              <DraggableWidget key={widget.id} id={widget.id}>
                <Card className={widget.enabled ? '' : 'opacity-50'}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 mr-12">
                        <div className="text-2xl">{widget.order + 1}</div>
                        <div>
                          <Label htmlFor={`toggle-${widget.id}`} className="cursor-pointer font-medium">
                            {WIDGET_LABELS[widget.id]}
                          </Label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {widget.enabled ? 'Visible on dashboard' : 'Hidden from dashboard'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={`toggle-${widget.id}`}
                        checked={widget.enabled}
                        onCheckedChange={() => handleToggleWidget(widget.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {hasChanges && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            You have unsaved changes. Click "Save Layout" to apply your new dashboard configuration.
          </p>
        </div>
      )}
    </div>
  );
}