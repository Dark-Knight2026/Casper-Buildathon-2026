/**
 * Selection state for the "compare listings" flow.
 *
 * Holds the set of listing ids the user has marked to compare, capped at
 * `MAX_COMPARE`, and persists it to localStorage so the selection survives
 * navigating into a listing and back. Shared by the compare toggle on each
 * card and the sticky "Compare (N)" tray.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'leasefi_compare_ids';
export const MAX_COMPARE = 4;

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .filter((id): id is string => typeof id === 'string')
          .slice(0, MAX_COMPARE)
      : [];
  } catch {
    // localStorage disabled (private mode) or malformed JSON — start empty.
    return [];
  }
}

function writeStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Best-effort: a failed write just means the selection won't persist.
  }
}

export function useCompareSelection() {
  const [ids, setIds] = useState<string[]>(readStorage);

  useEffect(() => {
    writeStorage(ids);
  }, [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev; // cap reached — ignore adds
      return [...prev, id];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => setIds([]), []);

  const isSelected = useCallback((id: string) => ids.includes(id), [ids]);

  return {
    ids,
    toggle,
    remove,
    clear,
    isSelected,
    isFull: ids.length >= MAX_COMPARE,
    max: MAX_COMPARE,
  };
}
