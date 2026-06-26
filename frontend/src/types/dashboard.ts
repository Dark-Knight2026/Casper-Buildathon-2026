/**
 * Dashboard Types
 * Types for customizable dashboard system
 */

export type WidgetType =
  | 'property-summary'
  | 'recent-payments'
  | 'maintenance-requests'
  | 'lease-renewals'
  | 'financial-chart'
  | 'occupancy-chart'
  | 'recent-messages'
  | 'quick-actions';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
  minWidth: number;
  minHeight: number;
  defaultWidth: number;
  defaultHeight: number;
}

export interface LayoutItem {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardLayout {
  id: string;
  user_id: string;
  name: string;
  layout: LayoutItem[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardPreferences {
  user_id: string;
  active_layout_id: string;
  theme: 'light' | 'dark' | 'system';
  compact_mode: boolean;
  show_grid: boolean;
  auto_save: boolean;
}