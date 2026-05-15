import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useTenantScore } from '@/hooks/useTenantScore';
import { setActiveScenario, getActiveScenario } from '@/data/tenantScore';
import type { ScoreScenarioKey } from '@/data/tenantScore';

// useTenantScore reads the scenario via the module-level selector. Restore
// whatever was active before each test so we don't leak state between files.
let originalScenario: ScoreScenarioKey;

describe('useTenantScore', () => {
  afterEach(() => {
    setActiveScenario(originalScenario);
  });

  it('returns score and events for the active scenario', () => {
    originalScenario = getActiveScenario();
    setActiveScenario('excellent');

    const { result } = renderHook(() => useTenantScore());

    expect(result.current.score.status, 'excellent scenario must produce a scored tenant').toBe('scored');
    expect(
      result.current.score.overall,
      'overall score for excellent must be a number, not null — UI depends on this for the badge'
    ).not.toBeNull();
    expect(
      result.current.events.length,
      'excellent scenario seeds a non-empty events feed — the /tenant/score page needs items to render'
    ).toBeGreaterThan(0);
  });

  it('returns a null overall and band for an unscored tenant', () => {
    originalScenario = getActiveScenario();
    setActiveScenario('unscored');

    const { result } = renderHook(() => useTenantScore());

    expect(
      result.current.score.status,
      'unscored scenario must surface status=unscored so the card switches to the placeholder copy'
    ).toBe('unscored');
    expect(
      result.current.score.overall,
      'unscored tenants must have null overall — UI checks status before reading this field'
    ).toBeNull();
    expect(
      result.current.score.band,
      'unscored tenants must have null band — bandFromScore returns null for null input'
    ).toBeNull();
  });

  it('returns the same object reference across re-renders (memoization)', () => {
    originalScenario = getActiveScenario();
    setActiveScenario('average');

    const { result, rerender } = renderHook(() => useTenantScore());
    const first = result.current;

    rerender();

    expect(
      result.current,
      'useMemo with [] deps must return the same reference on re-render — keeps downstream useMemo/useEffect stable'
    ).toBe(first);
  });
});
