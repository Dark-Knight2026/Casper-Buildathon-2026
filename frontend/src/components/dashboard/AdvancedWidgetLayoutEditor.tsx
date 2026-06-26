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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDashboardPreferences, WidgetConfig, DashboardWidget } from '@/contexts/DashboardPreferencesContext';
import DraggableWidget from './DraggableWidget';
import WidgetSizeSelector from './WidgetSizeSelector';
import { Save, RotateCcw, Grid3x3, Grid2x2, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

const WIDGET_DESCRIPTIONS: Record<DashboardWidget, string> = {
  'quick-stats': 'Overview of properties, occupancy, income, and ROI',
  'properties-attention': 'Properties requiring immediate action',
  'top-properties': 'Best performing properties by ROI',
  'notifications': 'Recent alerts and updates',
  'financial-summary': 'Income, expenses, and profit overview',
  'maintenance-requests': 'Active maintenance tickets',
  'lease-expiring': 'Upcoming lease renewals',
  'tax-reminders': 'Tax deadlines and preparation tasks'
};

interface AdvancedWidgetLayoutEditorProps {
  onSave?: () => void;
}

export default function AdvancedWidgetLayoutEditor({ onSave }: AdvancedWidgetLayoutEditorProps) {
  const { preferences, reorderWidgets, updateLayout } = useDashboardPreferences();
  const { toast } = useToast();
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(preferences.layout.widgets);
  const [localColumns, setLocalColumns] = useState<1 | 2 | 3>(preferences.layout.columns);
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

  const handleSizeChange = (widgetId: DashboardWidget, size: 'small' | 'medium' | 'large') => {
    setLocalWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, size } : item
      )
    );
    setHasChanges(true);
  };

  const handleColumnsChange = (columns: 1 | 2 | 3) => {
    setLocalColumns(columns);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateLayout({
      widgets: localWidgets,
      columns: localColumns
    });
    setHasChanges(false);
    toast({
      title: 'Layout Saved',
      description: 'Your dashboard layout has been updated successfully.'
    });
    onSave?.();
  };

  const handleReset = () => {
    setLocalWidgets(preferences.layout.widgets);
    setLocalColumns(preferences.layout.columns);
    setHasChanges(false);
  };

  const getSizeColor = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'medium':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'large':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Advanced Layout Customization</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Drag to reorder, toggle visibility, adjust sizes, and configure grid columns
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

      {/* Grid Columns Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Dashboard Grid Columns</Label>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Choose how many columns to display on your dashboard
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={localColumns === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColumnsChange(1)}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                1 Column
              </Button>
              <Button
                variant={localColumns === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColumnsChange(2)}
              >
                <Grid2x2 className="h-4 w-4 mr-2" />
                2 Columns
              </Button>
              <Button
                variant={localColumns === 3 ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleColumnsChange(3)}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                3 Columns
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget List */}
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
                    <div className="flex items-start gap-4">
                      {/* Order Number */}
                      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold text-lg">
                        {widget.order + 1}
                      </div>

                      {/* Widget Info */}
                      <div className="flex-1 min-w-0 mr-12">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor={`toggle-${widget.id}`} className="cursor-pointer font-semibold text-base">
                            {WIDGET_LABELS[widget.id]}
                          </Label>
                          <Badge className={getSizeColor(widget.size)}>
                            {widget.size}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {WIDGET_DESCRIPTIONS[widget.id]}
                        </p>

                        {/* Size Selector */}
                        <WidgetSizeSelector
                          currentSize={widget.size}
                          onSizeChange={(size) => handleSizeChange(widget.id, size)}
                          disabled={!widget.enabled}
                        />
                      </div>

                      {/* Enable/Disable Toggle */}
                      <div className="flex flex-col items-end gap-2">
                        <Switch
                          id={`toggle-${widget.id}`}
                          checked={widget.enabled}
                          onCheckedChange={() => handleToggleWidget(widget.id)}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {widget.enabled ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Preview Info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Layout Preview
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>
                  <strong>Grid:</strong> {localColumns} column{localColumns > 1 ? 's' : ''} • 
                  <strong className="ml-2">Active Widgets:</strong> {localWidgets.filter(w => w.enabled).length}/{localWidgets.length}
                </p>
                <p>
                  <strong>Sizes:</strong> {' '}
                  {localWidgets.filter(w => w.enabled && w.size === 'small').length} small, {' '}
                  {localWidgets.filter(w => w.enabled && w.size === 'medium').length} medium, {' '}
                  {localWidgets.filter(w => w.enabled && w.size === 'large').length} large
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-900 dark:text-orange-100">
            ⚠️ You have unsaved changes. Click <strong>"Save Layout"</strong> to apply your new dashboard configuration.
          </p>
        </div>
      )}
    </div>
  );
}