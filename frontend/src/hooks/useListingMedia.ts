import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Listing,
  MediaRef,
  MediaReorderBody,
} from '@/types/listingContract';

/**
 * Diffs the original media order against the current working order and returns
 * the `PUT /listings/{id}/media` body — or `null` when nothing changed. Pure, so
 * the remove/reorder logic is unit-testable in isolation.
 */
export function diffMediaOrder(
  originalIds: string[],
  currentIds: string[]
): MediaReorderBody | null {
  const removed = originalIds.filter((id) => !currentIds.includes(id));
  const orderChanged =
    currentIds.length !== originalIds.length ||
    currentIds.some((id, i) => id !== originalIds[i]);
  if (!removed.length && !orderChanged) return null;
  return {
    order: currentIds.length ? currentIds : undefined,
    remove: removed.length ? removed : undefined,
  };
}

/**
 * Local working copy of a listing's existing photos for the edit form. Owns the
 * media state + remove/reorder, and builds the commit body on save (applied via
 * `updateMedia` alongside the rest of the form). New uploads are handled
 * separately by the page (they don't have ids yet).
 */
export function useListingMedia(listing?: Listing | null) {
  // Sorted snapshot of the server state — the baseline for the diff.
  const original = useMemo(
    () =>
      listing ? [...listing.media].sort((a, b) => a.position - b.position) : [],
    [listing]
  );

  const [media, setMedia] = useState<MediaRef[]>(original);
  useEffect(() => setMedia(original), [original]);

  const remove = useCallback((mediaId: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
  }, []);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setMedia((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const buildUpdate = useCallback(
    (): MediaReorderBody | null =>
      diffMediaOrder(
        original.map((m) => m.id),
        media.map((m) => m.id)
      ),
    [original, media]
  );

  return { media, remove, move, buildUpdate };
}
