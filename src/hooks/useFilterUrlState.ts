import { useQueryStates } from 'nuqs';
import { filterParsers } from '@/lib/urlState';
import type { FilterCondition } from '@/lib/filterUtils';

/**
 * Hook for syncing FilterPanel state with URL
 * 
 * @example
 * const {
 *   filters,
 *   activePreset,
 *   filterLogic,
 *   setFilters,
 *   setActivePreset,
 *   setFilterLogic,
 *   shareUrl,
 *   clearFilters,
 * } = useFilterUrlState();
 */
export function useFilterUrlState() {
  const [state, setState] = useQueryStates(filterParsers, {
    history: 'push',
  });

  const setFilters = (filters: FilterCondition[]) => {
    setState({ filters });
  };

  const setActivePreset = (presetName: string) => {
    setState({ activePreset: presetName });
  };

  const setFilterLogic = (logic: 'AND' | 'OR') => {
    setState({ filterLogic: logic });
  };

  const shareUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    return url;
  };

  const clearFilters = () => {
    setState({
      filters: [],
      activePreset: '',
      filterLogic: 'AND',
    });
  };

  return {
    // State
    filters: state.filters as FilterCondition[],
    activePreset: state.activePreset,
    filterLogic: state.filterLogic as 'AND' | 'OR',
    
    // Setters
    setFilters,
    setActivePreset,
    setFilterLogic,
    
    // Utilities
    shareUrl,
    clearFilters,
    
    // Raw URL state
    urlState: state,
    setUrlState: setState,
  };
}