// TODO(backend): replace the in-memory preference store with
//   GET /api/v1/users/me/preferences   → load on mount via useQuery
//   PUT /api/v1/users/me/preferences   → useMutation on save
// The hook contract stays the same; only the body needs swapping.

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_PREFERENCES,
  getStoredPreferences,
  setStoredPreferences,
} from '@/data/tenantPreferences';
import type { RentalPreferences } from '@/types/tenantPreferences';

interface UseTenantPreferencesReturn {
  preferences: RentalPreferences;
  hasExplicitPreferences: boolean;
  updatePreferences: (next: RentalPreferences) => void;
}

export function useTenantPreferences(tenantId: string): UseTenantPreferencesReturn {
  const [stored, setStored] = useState<RentalPreferences | null>(() =>
    getStoredPreferences(tenantId)
  );

  // Re-read when the tenant identity changes. The common case is
  // `authProfile?.id ?? ''` flipping from a placeholder to the real id once
  // auth resolves — the lazy initializer above only fires on mount, so
  // without this effect the hook keeps serving preferences keyed to the
  // placeholder id and the user sees their saved prefs as missing.
  useEffect(() => {
    setStored(getStoredPreferences(tenantId));
  }, [tenantId]);

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
