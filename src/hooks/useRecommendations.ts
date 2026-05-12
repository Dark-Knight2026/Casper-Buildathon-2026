// TODO(backend): replace the local mock pipeline with
//   GET /api/v1/properties/recommended?leaseId=…&limit=…
// The endpoint returns a pre-ranked, pre-scored RecommendedProperty[];
// FE only renders. Today, getMockRecommendations stands in for that.

import { useMemo } from 'react';
import {
  getMockRecommendations,
  isInRecommendationWindow,
} from '@/data/tenantPreferences';
import type { Property } from '@/types/property';
import type { RecommendedProperty } from '@/types/tenantPreferences';
import { useTenantPreferences } from './useTenantPreferences';

interface UseRecommendationsArgs {
  tenantId: string;
  leaseEndDate: Date;
  currentProperty: Property;
  limit?: number;
}

interface UseRecommendationsReturn {
  recommendations: RecommendedProperty[];
  isInWindow: boolean;
  hasExplicitPreferences: boolean;
}

export function useRecommendations({
  tenantId,
  leaseEndDate,
  currentProperty,
  limit,
}: UseRecommendationsArgs): UseRecommendationsReturn {
  const { hasExplicitPreferences } = useTenantPreferences(tenantId);

  // Primitive timestamp instead of the Date object: a caller that constructs
  // `new Date(...)` inline on each render would otherwise hand us a fresh
  // reference every time and bust the memo even when the underlying day
  // hasn't changed.
  const leaseEndTimestamp = leaseEndDate.getTime();

  const { recommendations, isInWindow } = useMemo(() => {
    const inWindow = isInRecommendationWindow(leaseEndDate);
    if (!inWindow) return { recommendations: [] as RecommendedProperty[], isInWindow: false };
    const all = getMockRecommendations(
      leaseEndDate,
      currentProperty.id,
      hasExplicitPreferences ? 'preferences' : 'implicit-current-lease'
    );
    const sliced = typeof limit === 'number' ? all.slice(0, limit) : all;
    return { recommendations: sliced, isInWindow: true };
    // leaseEndDate intentionally excluded — leaseEndTimestamp is the primitive
    // mirror that drives reactivity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseEndTimestamp, currentProperty.id, hasExplicitPreferences, limit]);

  return { recommendations, isInWindow, hasExplicitPreferences };
}
