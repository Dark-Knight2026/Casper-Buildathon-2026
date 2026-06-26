import { parseAsInteger, parseAsString, parseAsArrayOf, parseAsJson } from 'nuqs';
import { logger } from '@/utils/logger';

/**
 * URL state parsers for DataTable
 */
export const dataTableParsers = {
  // Pagination
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(10),
  
  // Sorting
  sortBy: parseAsString.withDefault(''),
  sortOrder: parseAsString.withDefault('asc'),
  
  // Search
  search: parseAsString.withDefault(''),
  
  // Column visibility
  hiddenColumns: parseAsArrayOf(parseAsString).withDefault([]),
  
  // Selected rows
  selectedIds: parseAsArrayOf(parseAsString).withDefault([]),
};

/**
 * URL state parsers for FilterPanel
 */
export const filterParsers = {
  // Active filters as JSON
  filters: parseAsJson<Array<Record<string, unknown>>>().withDefault([]),
  
  // Active preset
  activePreset: parseAsString.withDefault(''),
  
  // Filter logic (AND/OR)
  filterLogic: parseAsString.withDefault('AND'),
};

/**
 * Combine multiple parsers
 */
export function combineParsers<T extends Record<string, unknown>>(
  ...parsers: Array<Record<string, unknown>>
): T {
  return Object.assign({}, ...parsers) as T;
}

/**
 * URL state utilities
 */
export const urlStateUtils = {
  /**
   * Build a shareable URL with current state
   */
  buildShareableUrl: (params: Record<string, unknown>): string => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          url.searchParams.set(key, JSON.stringify(value));
        } else if (typeof value === 'object') {
          url.searchParams.set(key, JSON.stringify(value));
        } else {
          url.searchParams.set(key, String(value));
        }
      } else {
        url.searchParams.delete(key);
      }
    });
    return url.toString();
  },

  /**
   * Copy current URL to clipboard
   */
  copyUrlToClipboard: async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch (error) {
      logger.error('Failed to copy URL:', error);
      return false;
    }
  },

  /**
   * Clear all URL parameters
   */
  clearUrlParams: (): void => {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  },

  /**
   * Get a specific URL parameter
   */
  getUrlParam: (key: string): string | null => {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  },
};