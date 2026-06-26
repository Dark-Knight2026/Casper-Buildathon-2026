/**
 * useDashboardLayout Hook
 * Hook for managing dashboard layout state
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboardService';
import { DashboardLayout, LayoutItem } from '@/types/dashboard';
import { Layout } from 'react-grid-layout';

export function useDashboardLayout() {
  const { user } = useAuth();
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [activeLayout, setActiveLayout] = useState<DashboardLayout | null>(null);
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load layouts
  const loadLayouts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const [layoutsData, activeLayoutData] = await Promise.all([
        dashboardService.getLayouts(user.id),
        dashboardService.getActiveLayout(user.id),
      ]);

      setLayouts(layoutsData);
      
      if (activeLayoutData) {
        setActiveLayout(activeLayoutData);
        setLayout(activeLayoutData.layout);
      } else {
        // Create default layout
        const defaultLayout = await dashboardService.createDefaultLayout(
          user.id,
          user.role || 'tenant'
        );
        setActiveLayout(defaultLayout);
        setLayout(defaultLayout.layout);
        setLayouts([defaultLayout]);
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  // Load on mount
  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  // Switch layout
  const switchLayout = useCallback(
    async (layoutId: string) => {
      if (!user?.id) return;

      try {
        await dashboardService.setActiveLayout(user.id, layoutId);
        const newLayout = layouts.find((l) => l.id === layoutId);
        if (newLayout) {
          setActiveLayout(newLayout);
          setLayout(newLayout.layout);
        }
      } catch (error) {
        console.error('Error switching layout:', error);
        throw error;
      }
    },
    [user?.id, layouts]
  );

  // Save layout
  const saveLayout = useCallback(
    async (newLayout: Layout[], name?: string) => {
      if (!user?.id || !activeLayout) return;

      try {
        setIsSaving(true);

        // Convert react-grid-layout Layout to LayoutItem
        const layoutItems: LayoutItem[] = newLayout.map((item) => ({
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

        if (name) {
          // Save as new layout
          const saved = await dashboardService.saveLayout(
            user.id,
            name,
            layoutItems,
            false
          );
          setLayouts((prev) => [saved, ...prev]);
          await switchLayout(saved.id);
        } else {
          // Update current layout
          await dashboardService.updateLayout(activeLayout.id, {
            layout: layoutItems,
          });
          setLayout(layoutItems);
          setActiveLayout((prev) => (prev ? { ...prev, layout: layoutItems } : null));
        }
      } catch (error) {
        console.error('Error saving layout:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id, activeLayout, switchLayout]
  );

  // Delete layout
  const deleteLayout = useCallback(
    async (layoutId: string) => {
      try {
        await dashboardService.deleteLayout(layoutId);
        setLayouts((prev) => prev.filter((l) => l.id !== layoutId));
        
        // If deleted layout was active, switch to first available
        if (activeLayout?.id === layoutId && layouts.length > 1) {
          const nextLayout = layouts.find((l) => l.id !== layoutId);
          if (nextLayout) {
            await switchLayout(nextLayout.id);
          }
        }
      } catch (error) {
        console.error('Error deleting layout:', error);
        throw error;
      }
    },
    [activeLayout, layouts, switchLayout]
  );

  // Reset to default
  const resetToDefault = useCallback(async () => {
    if (!user?.id || !user?.role) return;

    try {
      setIsLoading(true);
      const defaultLayout = await dashboardService.resetToDefault(
        user.id,
        user.role
      );
      setActiveLayout(defaultLayout);
      setLayout(defaultLayout.layout);
      await loadLayouts();
    } catch (error) {
      console.error('Error resetting to default:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role, loadLayouts]);

  // Handle layout change
  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      // Convert to LayoutItem format
      const layoutItems: LayoutItem[] = newLayout.map((item) => ({
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
      
      setLayout(layoutItems);
    },
    []
  );

  return {
    layout,
    activeLayout,
    layouts,
    isLoading,
    isSaving,
    saveLayout,
    switchLayout,
    deleteLayout,
    resetToDefault,
    handleLayoutChange,
    refreshLayouts: loadLayouts,
  };
}