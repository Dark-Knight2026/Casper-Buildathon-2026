/**
 * Dashboard Service
 * Service for managing dashboard layouts and preferences
 */

import { supabase } from '@/lib/supabase/client';
import { DashboardLayout, DashboardPreferences, LayoutItem } from '@/types/dashboard';

class DashboardService {
  /**
   * Get user's dashboard layouts
   */
  async getLayouts(userId: string): Promise<DashboardLayout[]> {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get active layout
   */
  async getActiveLayout(userId: string): Promise<DashboardLayout | null> {
    // Get user preferences
    const { data: prefs } = await supabase
      .from('dashboard_preferences')
      .select('active_layout_id')
      .eq('user_id', userId)
      .single();

    if (prefs?.active_layout_id) {
      const { data, error } = await supabase
        .from('dashboard_layouts')
        .select('*')
        .eq('id', prefs.active_layout_id)
        .single();

      if (error) throw error;
      return data;
    }

    // Get default layout
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Save layout
   */
  async saveLayout(
    userId: string,
    name: string,
    layout: LayoutItem[],
    isDefault: boolean = false
  ): Promise<DashboardLayout> {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .insert({
        user_id: userId,
        name,
        layout,
        is_default: isDefault,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update layout
   */
  async updateLayout(
    layoutId: string,
    updates: Partial<DashboardLayout>
  ): Promise<DashboardLayout> {
    const { data, error } = await supabase
      .from('dashboard_layouts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', layoutId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete layout
   */
  async deleteLayout(layoutId: string): Promise<void> {
    const { error } = await supabase
      .from('dashboard_layouts')
      .delete()
      .eq('id', layoutId);

    if (error) throw error;
  }

  /**
   * Set active layout
   */
  async setActiveLayout(userId: string, layoutId: string): Promise<void> {
    const { error } = await supabase
      .from('dashboard_preferences')
      .upsert({
        user_id: userId,
        active_layout_id: layoutId,
      });

    if (error) throw error;
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<DashboardPreferences | null> {
    const { data, error } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<DashboardPreferences>
  ): Promise<DashboardPreferences> {
    const { data, error } = await supabase
      .from('dashboard_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create default layout for new user
   */
  async createDefaultLayout(userId: string, role: string): Promise<DashboardLayout> {
    const defaultLayout: LayoutItem[] = this.getDefaultLayoutForRole(role);

    return this.saveLayout(userId, 'Default Layout', defaultLayout, true);
  }

  /**
   * Get default layout based on user role
   */
  private getDefaultLayoutForRole(role: string): LayoutItem[] {
    if (role === 'landlord') {
      return [
        { i: 'property-summary', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'financial-chart', x: 4, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'recent-payments', x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'maintenance-requests', x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
        { i: 'lease-renewals', x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 3 },
        { i: 'recent-messages', x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 3 },
        { i: 'quick-actions', x: 6, y: 6, w: 6, h: 3, minW: 3, minH: 2 },
      ];
    } else {
      // Tenant default layout
      return [
        { i: 'recent-payments', x: 0, y: 0, w: 6, h: 3, minW: 4, minH: 3 },
        { i: 'maintenance-requests', x: 6, y: 0, w: 6, h: 3, minW: 4, minH: 3 },
        { i: 'recent-messages', x: 0, y: 3, w: 8, h: 3, minW: 4, minH: 3 },
        { i: 'quick-actions', x: 8, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
      ];
    }
  }

  /**
   * Reset to default layout
   */
  async resetToDefault(userId: string, role: string): Promise<DashboardLayout> {
    const defaultLayout = this.getDefaultLayoutForRole(role);
    
    // Find existing default layout
    const { data: existing } = await supabase
      .from('dashboard_layouts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (existing) {
      return this.updateLayout(existing.id, { layout: defaultLayout });
    } else {
      return this.createDefaultLayout(userId, role);
    }
  }
}

export const dashboardService = new DashboardService();