// TODO(backend): replace the in-memory preference store with
//   GET /api/v1/users/me/preferences   → load on mount via useQuery
//   PUT /api/v1/users/me/preferences   → useMutation on save
// The hook contract stays the same; only the body needs swapping.

import { useCallback, useState } from 'react';
import {
  EMPTY_PREFERENCES,
  getStoredPreferences,
  setStoredPreferences,
} from '@/data/tenantPreferences';
import type { RentalPreferences } from '@/types/tenantPreferences';

interface UseTenantPreferencesResult {
  preferences: RentalPreferences;
  hasExplicitPreferences: boolean;
  updatePreferences: (next: RentalPreferences) => void;
}

export function useTenantPreferences(tenantId: string): UseTenantPreferencesResult {
  const [stored, setStored] = useState<RentalPreferences | null>(() =>
    getStoredPreferences(tenantId)
  );

  const updatePreferences = useCallback(
    (next: RentalPreferences) => {
      setStoredPreferences(tenantId, next);
      setStored(next);
    },
    [tenantId]
  );

  return {
    preferences: stored ?? EMPTY_PREFERENCES,
    hasExplicitPreferences: stored !== null,
    updatePreferences,
  };
}
