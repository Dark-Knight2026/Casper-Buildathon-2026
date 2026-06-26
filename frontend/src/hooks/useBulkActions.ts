import { useState } from 'react';

/**
 * Hook for managing bulk action state
 */
export function useBulkActions<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const isAllSelected = selectedIds.length === items.length && items.length > 0;

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.length,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
  };
}