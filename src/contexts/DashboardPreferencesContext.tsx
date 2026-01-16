import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DashboardWidget = 
  | 'quick-stats'
  | 'properties-attention'
  | 'top-properties'
  | 'notifications'
  | 'financial-summary'
  | 'maintenance-requests'
  | 'lease-expiring'
  | 'tax-reminders';

export interface WidgetConfig {
  id: DashboardWidget;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
  columns: 1 | 2 | 3;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: string;
}

export interface DashboardPreferences {
  theme: 'light' | 'dark' | 'system';
  layout: DashboardLayout;
  keyboardShortcutsEnabled: boolean;
  showOnboarding: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
}

interface DashboardPreferencesContextType {
  preferences: DashboardPreferences;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateLayout: (layout: DashboardLayout) => void;
  toggleWidget: (widgetId: DashboardWidget) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;
  toggleKeyboardShortcuts: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  toggleCompactMode: () => void;
  toggleAnimations: () => void;
  resetToDefaults: () => void;
  keyboardShortcuts: KeyboardShortcut[];
}

const DashboardPreferencesContext = createContext<DashboardPreferencesContextType | undefined>(undefined);

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'quick-stats', enabled: true, order: 0, size: 'large' },
  { id: 'properties-attention', enabled: true, order: 1, size: 'large' },
  { id: 'top-properties', enabled: true, order: 2, size: 'medium' },
  { id: 'notifications', enabled: true, order: 3, size: 'medium' },
  { id: 'financial-summary', enabled: true, order: 4, size: 'medium' },
  { id: 'maintenance-requests', enabled: false, order: 5, size: 'small' },
  { id: 'lease-expiring', enabled: false, order: 6, size: 'small' },
  { id: 'tax-reminders', enabled: false, order: 7, size: 'small' }
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  theme: 'system',
  layout: {
    widgets: DEFAULT_WIDGETS,
    columns: 2
  },
  keyboardShortcutsEnabled: true,
  showOnboarding: true,
  compactMode: false,
  animationsEnabled: true
};

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'h', ctrl: true, description: 'Go to Home/Overview', action: 'navigate-home' },
  { key: 'p', ctrl: true, description: 'Go to Properties', action: 'navigate-properties' },
  { key: 't', ctrl: true, description: 'Go to Tenants', action: 'navigate-tenants' },
  { key: 'f', ctrl: true, description: 'Go to Financials', action: 'navigate-financials' },
  { key: 'a', ctrl: true, description: 'Go to Analytics', action: 'navigate-analytics' },
  { key: 'x', ctrl: true, description: 'Go to Tax Prep', action: 'navigate-tax' },
  { key: 'n', ctrl: true, description: 'Add New Property', action: 'add-property' },
  { key: 'i', ctrl: true, description: 'Invite Tenant', action: 'invite-tenant' },
  { key: 'k', ctrl: true, description: 'Show Keyboard Shortcuts', action: 'show-shortcuts' },
  { key: '/', ctrl: true, description: 'Search', action: 'focus-search' },
  { key: 'Escape', description: 'Close Dialog/Modal', action: 'close-dialog' }
];

export function DashboardPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    const stored = localStorage.getItem('landlord-dashboard-preferences');
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('landlord-dashboard-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const theme = preferences.theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preferences.theme;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const root = document.documentElement;
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [preferences.theme]);

  const updateTheme = (theme: 'light' | 'dark' | 'system') => {
    setPreferences(prev => ({ ...prev, theme }));
  };

  const updateLayout = (layout: DashboardLayout) => {
    setPreferences(prev => ({ ...prev, layout }));
  };

  const toggleWidget = (widgetId: DashboardWidget) => {
    setPreferences(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        widgets: prev.layout.widgets.map(w =>
          w.id === widgetId ? { ...w, enabled: !w.enabled } : w
        )
      }
    }));
  };

  const reorderWidgets = (widgets: WidgetConfig[]) => {
    setPreferences(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        widgets
      }
    }));
  };

  const toggleKeyboardShortcuts = () => {
    setPreferences(prev => ({
      ...prev,
      keyboardShortcutsEnabled: !prev.keyboardShortcutsEnabled
    }));
  };

  const completeOnboarding = () => {
    setPreferences(prev => ({ ...prev, showOnboarding: false }));
  };

  const resetOnboarding = () => {
    setPreferences(prev => ({ ...prev, showOnboarding: true }));
  };

  const toggleCompactMode = () => {
    setPreferences(prev => ({ ...prev, compactMode: !prev.compactMode }));
  };

  const toggleAnimations = () => {
    setPreferences(prev => ({ ...prev, animationsEnabled: !prev.animationsEnabled }));
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const value: DashboardPreferencesContextType = {
    preferences,
    updateTheme,
    updateLayout,
    toggleWidget,
    reorderWidgets,
    toggleKeyboardShortcuts,
    completeOnboarding,
    resetOnboarding,
    toggleCompactMode,
    toggleAnimations,
    resetToDefaults,
    keyboardShortcuts: KEYBOARD_SHORTCUTS
  };

  return (
    <DashboardPreferencesContext.Provider value={value}>
      {children}
    </DashboardPreferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDashboardPreferences = () => {
  const context = useContext(DashboardPreferencesContext);
  if (context === undefined) {
    throw new Error('useDashboardPreferences must be used within a DashboardPreferencesProvider');
  }
  return context;
};