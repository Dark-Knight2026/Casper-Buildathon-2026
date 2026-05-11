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
  const isInWindow = isInRecommendationWindow(leaseEndDate);

  const recommendations = useMemo(() => {
    if (!isInWindow) return [];
    const all = getMockRecommendations(
      leaseEndDate,
      currentProperty.id,
      hasExplicitPreferences ? 'preferences' : 'implicit-current-lease'
    );
    return typeof limit === 'number' ? all.slice(0, limit) : all;
  }, [isInWindow, leaseEndDate, currentProperty.id, hasExplicitPreferences, limit]);

  return { recommendations, isInWindow, hasExplicitPreferences };
}
