// TODO(backend): replace the mock fetchers with
//   GET /api/v1/tenants/me/score                 → TenantScore
//   GET /api/v1/tenants/me/score/history?limit=… → ScoreEvent[]
// The hook contract stays the same; only the body needs swapping.

import { useMemo } from 'react';
import {
  getMockScore,
  getMockScoreEvents,
} from '@/data/tenantScore';
import type { ScoreEvent, TenantScore } from '@/types/tenantScore';

interface UseTenantScoreResult {
  score: TenantScore;
  events: ScoreEvent[];
}

export function useTenantScore(): UseTenantScoreResult {
  // useMemo is a lightweight stand-in for useQuery — keeps callers stable
  // and removes the temptation to compute the score on every render once
  // the BE swap lands.
  return useMemo(
    () => ({
      score: getMockScore(),
      events: getMockScoreEvents(),
    }),
    []
  );
}
