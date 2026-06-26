import { useQueryStates } from 'nuqs';
import { dataTableParsers } from '@/lib/urlState';
import type { SortingState, ColumnFiltersState, VisibilityState, RowSelectionState, PaginationState, Updater } from '@tanstack/react-table';

/**
 * Hook for syncing DataTable state with URL
 * 
 * @example
 * const {
 *   pagination,
 *   sorting,
 *   columnFilters,
 *   columnVisibility,
 *   rowSelection,
 *   setPagination,
 *   setSorting,
 *   setColumnFilters,
 *   setColumnVisibility,
 *   setRowSelection,
 *   shareUrl,
 *   clearState,
 * } = useDataTableUrlState();
 */
export function useDataTableUrlState() {
  const [state, setState] = useQueryStates(dataTableParsers, {
    history: 'push', // Use 'push' for browser history, 'replace' to avoid history entries
  });

  // Convert URL state to TanStack Table state
  const pagination: PaginationState = {
    pageIndex: state.page - 1, // TanStack uses 0-based index
    pageSize: state.pageSize,
  };

  const sorting: SortingState = state.sortBy
    ? [{ id: state.sortBy, desc: state.sortOrder === 'desc' }]
    : [];

  const columnFilters: ColumnFiltersState = state.search
    ? [{ id: 'global', value: state.search }]
    : [];

  const columnVisibility: VisibilityState = state.hiddenColumns.reduce(
    (acc, col) => ({ ...acc, [col]: false }),
    {} as VisibilityState
  );

  const rowSelection: RowSelectionState = state.selectedIds.reduce(
    (acc, id) => ({ ...acc, [id]: true }),
    {} as RowSelectionState
  );

  // Setters that update URL
  const setPagination = (updater: Updater<PaginationState>) => {
    const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
    setState({
      page: newPagination.pageIndex + 1,
      pageSize: newPagination.pageSize,
    });
  };

  const setSorting = (updater: Updater<SortingState>) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    if (newSorting.length > 0) {
      setState({
        sortBy: newSorting[0].id,
        sortOrder: newSorting[0].desc ? 'desc' : 'asc',
      });
    } else {
      setState({ sortBy: '', sortOrder: 'asc' });
    }
  };

  const setColumnFilters = (updater: Updater<ColumnFiltersState>) => {
    const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
    const globalFilter = newFilters.find((f) => f.id === 'global');
    setState({ search: globalFilter?.value as string || '' });
  };

  const setColumnVisibility = (updater: Updater<VisibilityState>) => {
    const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
    const hidden = Object.entries(newVisibility)
      .filter(([, visible]) => !visible)
      .map(([col]) => col);
    setState({ hiddenColumns: hidden });
  };

  const setRowSelection = (updater: Updater<RowSelectionState>) => {
    const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
    const selected = Object.entries(newSelection)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
    setState({ selectedIds: selected });
  };

  // Utility functions
  const shareUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    return url;
  };

  const clearState = () => {
    setState({
      page: 1,
      pageSize: 10,
      sortBy: '',
      sortOrder: 'asc',
      search: '',
      hiddenColumns: [],
      selectedIds: [],
    });
  };

  return {
    // State
    pagination,
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
    
    // Setters
    setPagination,
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    setRowSelection,
    
    // Utilities
    shareUrl,
    clearState,
    
    // Raw URL state (for advanced use)
    urlState: state,
    setUrlState: setState,
  };
}