/**
 * Dashboard Grid Component
 * Customizable grid layout for dashboard widgets
 */

import { useState } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { DashboardWidget } from './DashboardWidget';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { Settings, Save, RotateCcw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardGridProps {
  editable?: boolean;
}

export function DashboardGrid({ editable = false }: DashboardGridProps) {
  const {
    layout,
    isLoading,
    isSaving,
    saveLayout,
    resetToDefault,
    handleLayoutChange,
  } = useDashboardLayout();

  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    try {
      const gridLayout: Layout[] = layout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
        maxW: item.maxW,
        maxH: item.maxH,
        static: item.static,
      }));
      
      await saveLayout(gridLayout);
      setHasChanges(false);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset to the default layout?')) {
      try {
        await resetToDefault();
        setHasChanges(false);
        setIsEditMode(false);
      } catch (error) {
        console.error('Error resetting layout:', error);
      }
    }
  };

  const onLayoutChange = (newLayout: Layout[]) => {
    handleLayoutChange(newLayout);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Dashboard Customization</span>
            {isEditMode && (
              <span className="text-sm text-muted-foreground">
                (Drag and resize widgets)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setHasChanges(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  loading={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Layout'}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditMode(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Customize
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <GridLayout
        className={cn('layout', isEditMode && 'edit-mode')}
        layout={layout}
        cols={12}
        rowHeight={80}
        width={1200}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={onLayoutChange}
        draggableHandle=".drag-handle"
        compactType="vertical"
        preventCollision={false}
      >
        {layout.map((item) => (
          <div key={item.i} className="dashboard-widget-container">
            <DashboardWidget
              widgetId={item.i}
              isEditMode={isEditMode}
            />
          </div>
        ))}
      </GridLayout>

      {/* Add Widget Button (in edit mode) */}
      {isEditMode && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      )}
    </div>
  );
}