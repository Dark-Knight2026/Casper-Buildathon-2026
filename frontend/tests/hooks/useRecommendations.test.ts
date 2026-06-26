import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useRecommendations } from '@/hooks/useRecommendations';
import {
  RECOMMENDATION_WINDOW_DAYS,
  clearStoredPreferences,
} from '@/data/tenantPreferences';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import type { Property } from '@/types/property';

const NOW = new Date('2026-05-05T12:00:00Z');
const TENANT_ID = 'tenant-rec-test';

// Use prop-2 as the tenant's current home — it's excluded from the pool.
const CURRENT_PROPERTY: Property = FEATURED_PROPERTIES.find((p) => p.id === 'prop-2')!;

// Inside the 180-day window: 60 days out.
const LEASE_END_IN_WINDOW = new Date(NOW.getTime() + 60 * 86400000);
// Beyond the window: 1 day past the cutoff.
const LEASE_END_OUT_OF_WINDOW = new Date(
  NOW.getTime() + (RECOMMENDATION_WINDOW_DAYS + 1) * 86400000
);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  clearStoredPreferences(TENANT_ID);
});

describe('useRecommendations', () => {
  it('returns isInWindow=false and an empty list when the lease is outside the window', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        tenantId: TENANT_ID,
        leaseEndDate: LEASE_END_OUT_OF_WINDOW,
        currentProperty: CURRENT_PROPERTY,
      })
    );

    expect(
      result.current.isInWindow,
      'Task 6 only fires within 180 days of lease end — outside, the section must stay hidden'
    ).toBe(false);
    expect(
      result.current.recommendations,
      'no recommendations outside the window — UI must not surface listings yet'
    ).toEqual([]);
  });

  it('returns recommendations when the lease is inside the window', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        tenantId: TENANT_ID,
        leaseEndDate: LEASE_END_IN_WINDOW,
        currentProperty: CURRENT_PROPERTY,
      })
    );

    expect(result.current.isInWindow).toBe(true);
    expect(
      result.current.recommendations.length,
      'in-window leases must surface the FEATURED_PROPERTIES pool minus the current home'
    ).toBe(FEATURED_PROPERTIES.length - 1);
    expect(
      result.current.recommendations.find((r) => r.property.id === CURRENT_PROPERTY.id),
      'current home must never appear in its own recommendations'
    ).toBeUndefined();
  });

  it('respects the limit argument', () => {
    const { result } = renderHook(() =>
      useRecommendations({
        tenantId: TENANT_ID,
        leaseEndDate: LEASE_END_IN_WINDOW,
        currentProperty: CURRENT_PROPERTY,
        limit: 3,
      })
    );

    expect(
      result.current.recommendations.length,
      'TenantDashboard caps the dashboard widget at 3 — the hook must enforce that slice'
    ).toBe(3);
  });

  it('returns the same recommendations reference on re-render when inputs are unchanged', () => {
    const { result, rerender } = renderHook(
      ({ leaseEndDate }: { leaseEndDate: Date }) =>
        useRecommendations({
          tenantId: TENANT_ID,
          leaseEndDate,
          currentProperty: CURRENT_PROPERTY,
          limit: 3,
        }),
      { initialProps: { leaseEndDate: LEASE_END_IN_WINDOW } }
    );

    const first = result.current.recommendations;

    // Pass a fresh Date instance with the same timestamp — the timestamp-primitive
    // memo key in useRecommendations is the whole point of b1d35cd; without it,
    // a new Date reference would bust the memo on every render.
    rerender({ leaseEndDate: new Date(LEASE_END_IN_WINDOW.getTime()) });

    expect(
      result.current.recommendations,
      'reference stability under stable inputs — downstream useMemo/key={prop.id} mounts depend on this'
    ).toBe(first);
  });

  it('busts the memo when the lease-end timestamp changes', () => {
    const { result, rerender } = renderHook(
      ({ leaseEndDate }: { leaseEndDate: Date }) =>
        useRecommendations({
          tenantId: TENANT_ID,
          leaseEndDate,
          currentProperty: CURRENT_PROPERTY,
        }),
      { initialProps: { leaseEndDate: LEASE_END_IN_WINDOW } }
    );

    const inWindowFirst = result.current.recommendations;
    expect(inWindowFirst.length).toBeGreaterThan(0);

    rerender({ leaseEndDate: LEASE_END_OUT_OF_WINDOW });

    expect(
      result.current.isInWindow,
      'lease moving outside the window must flip isInWindow false and clear the list'
    ).toBe(false);
    expect(result.current.recommendations).toEqual([]);
  });
});
