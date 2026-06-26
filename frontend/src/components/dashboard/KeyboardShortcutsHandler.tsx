import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';

interface KeyboardShortcutsHandlerProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onShowShortcuts: () => void;
  onAddProperty: () => void;
  onInviteTenant: () => void;
}

export default function KeyboardShortcutsHandler({
  activeTab,
  setActiveTab,
  onShowShortcuts,
  onAddProperty,
  onInviteTenant
}: KeyboardShortcutsHandlerProps) {
  const { preferences } = useDashboardPreferences();

  useEffect(() => {
    if (!preferences.keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Ctrl/Cmd + Key combinations
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        switch (key) {
          case 'h':
            e.preventDefault();
            setActiveTab('overview');
            break;
          case 'p':
            e.preventDefault();
            setActiveTab('properties');
            break;
          case 't':
            e.preventDefault();
            setActiveTab('tenants');
            break;
          case 'f':
            e.preventDefault();
            setActiveTab('financials');
            break;
          case 'a':
            e.preventDefault();
            setActiveTab('analytics');
            break;
          case 'x':
            e.preventDefault();
            setActiveTab('tax-prep');
            break;
          case 'n':
            e.preventDefault();
            onAddProperty();
            break;
          case 'i':
            e.preventDefault();
            onInviteTenant();
            break;
          case 'k':
            e.preventDefault();
            onShowShortcuts();
            break;
          case '/': {
            e.preventDefault();
            // Focus search input if it exists
            const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
          }
          default:
            break;
        }
      }

      // Escape key to close dialogs
      if (e.key === 'Escape') {
        // Let the dialog components handle this
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    preferences.keyboardShortcutsEnabled,
    setActiveTab,
    onShowShortcuts,
    onAddProperty,
    onInviteTenant
  ]);

  return null;
}