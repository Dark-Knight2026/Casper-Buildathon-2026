import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  keys: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'editing' | 'general';
  global?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts({
 *   onSearch: () => openSearchModal(),
 *   onSave: () => saveForm(),
 *   onCancel: () => closeModal(),
 * });
 */
export function useKeyboardShortcuts(options?: {
  onSearch?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  onHelp?: () => void;
  enabled?: boolean;
}) {
  const navigate = useNavigate();
  const enabled = options?.enabled !== false;

  // Global shortcuts
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onSearch) {
        options.onSearch();
      }
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    'mod+s',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onSave) {
        options.onSave();
      }
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    'esc',
    (e) => {
      if (enabled && options?.onCancel) {
        e.preventDefault();
        options.onCancel();
      }
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    'mod+n',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onNew) {
        options.onNew();
      }
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+e',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onEdit) {
        options.onEdit();
      }
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+backspace',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onDelete) {
        options.onDelete();
      }
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+r',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onRefresh) {
        options.onRefresh();
      }
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    'mod+/',
    (e) => {
      e.preventDefault();
      if (enabled && options?.onHelp) {
        options.onHelp();
      }
    },
    { enableOnFormTags: true }
  );

  // Navigation shortcuts
  useHotkeys('g d', () => enabled && navigate('/dashboard'), { enableOnFormTags: false });
  useHotkeys('g p', () => enabled && navigate('/dashboard/portfolio'), { enableOnFormTags: false });
  useHotkeys('g c', () => enabled && navigate('/dashboard/clients'), { enableOnFormTags: false });
  useHotkeys('g l', () => enabled && navigate('/dashboard/leasing'), { enableOnFormTags: false });
  useHotkeys('g i', () => enabled && navigate('/dashboard/insights'), { enableOnFormTags: false });
  useHotkeys('g s', () => enabled && navigate('/dashboard/settings'), { enableOnFormTags: false });
}

/**
 * Get all available keyboard shortcuts
 */
export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    // General
    {
      keys: 'Cmd/Ctrl + K',
      description: 'Open search',
      action: () => {},
      category: 'general',
      global: true,
    },
    {
      keys: 'Cmd/Ctrl + /',
      description: 'Show keyboard shortcuts',
      action: () => {},
      category: 'general',
      global: true,
    },
    {
      keys: 'Esc',
      description: 'Close modal or cancel',
      action: () => {},
      category: 'general',
      global: true,
    },

    // Navigation
    {
      keys: 'G then D',
      description: 'Go to Dashboard',
      action: () => {},
      category: 'navigation',
    },
    {
      keys: 'G then P',
      description: 'Go to Portfolio',
      action: () => {},
      category: 'navigation',
    },
    {
      keys: 'G then C',
      description: 'Go to Clients',
      action: () => {},
      category: 'navigation',
    },
    {
      keys: 'G then L',
      description: 'Go to Leasing',
      action: () => {},
      category: 'navigation',
    },
    {
      keys: 'G then I',
      description: 'Go to Insights',
      action: () => {},
      category: 'navigation',
    },
    {
      keys: 'G then S',
      description: 'Go to Settings',
      action: () => {},
      category: 'navigation',
    },

    // Actions
    {
      keys: 'Cmd/Ctrl + N',
      description: 'Create new item',
      action: () => {},
      category: 'actions',
    },
    {
      keys: 'Cmd/Ctrl + S',
      description: 'Save changes',
      action: () => {},
      category: 'actions',
      global: true,
    },
    {
      keys: 'Cmd/Ctrl + E',
      description: 'Edit selected item',
      action: () => {},
      category: 'actions',
    },
    {
      keys: 'Cmd/Ctrl + Backspace',
      description: 'Delete selected item',
      action: () => {},
      category: 'actions',
    },
    {
      keys: 'Cmd/Ctrl + R',
      description: 'Refresh data',
      action: () => {},
      category: 'actions',
    },

    // Editing
    {
      keys: 'Cmd/Ctrl + Z',
      description: 'Undo',
      action: () => {},
      category: 'editing',
    },
    {
      keys: 'Cmd/Ctrl + Shift + Z',
      description: 'Redo',
      action: () => {},
      category: 'editing',
    },
    {
      keys: 'Cmd/Ctrl + A',
      description: 'Select all',
      action: () => {},
      category: 'editing',
    },
  ];
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(keys: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return keys
    .replace(/mod/gi, isMac ? '⌘' : 'Ctrl')
    .replace(/cmd/gi, '⌘')
    .replace(/ctrl/gi, 'Ctrl')
    .replace(/shift/gi, '⇧')
    .replace(/alt/gi, isMac ? '⌥' : 'Alt')
    .replace(/option/gi, '⌥')
    .replace(/backspace/gi, '⌫')
    .replace(/enter/gi, '↵')
    .replace(/\+/g, ' + ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}