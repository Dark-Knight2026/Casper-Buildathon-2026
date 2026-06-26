import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useTenantPreferences } from '@/hooks/useTenantPreferences';
import {
  EMPTY_PREFERENCES,
  clearStoredPreferences,
  setStoredPreferences,
} from '@/data/tenantPreferences';
import type { RentalPreferences } from '@/types/tenantPreferences';

const TENANT_A = 'tenant-A';
const TENANT_B = 'tenant-B';

const prefsA: RentalPreferences = {
  ...EMPTY_PREFERENCES,
  budgetMin: 1500,
  budgetMax: 2500,
  bedroomsMin: 2,
  propertyTypes: ['Apartment'],
};

const prefsB: RentalPreferences = {
  ...EMPTY_PREFERENCES,
  budgetMin: 3000,
  budgetMax: 4000,
};

afterEach(() => {
  clearStoredPreferences(TENANT_A);
  clearStoredPreferences(TENANT_B);
});

describe('useTenantPreferences', () => {
  it('returns EMPTY_PREFERENCES and hasExplicitPreferences=false for an unset tenant', () => {
    const { result } = renderHook(() => useTenantPreferences(TENANT_A));

    expect(
      result.current.preferences,
      'unset tenant must read EMPTY_PREFERENCES so RecommendedProperties falls through to the implicit-fallback branch'
    ).toEqual(EMPTY_PREFERENCES);
    expect(
      result.current.hasExplicitPreferences,
      'hasExplicitPreferences gates the B.3 implicit banner — must be false when nothing is stored'
    ).toBe(false);
  });

  it('loads previously stored preferences on mount', () => {
    setStoredPreferences(TENANT_A, prefsA);

    const { result } = renderHook(() => useTenantPreferences(TENANT_A));

    expect(
      result.current.preferences,
      'lazy initializer must read the in-memory store so a remount (e.g. route change) keeps prefs visible'
    ).toEqual(prefsA);
    expect(result.current.hasExplicitPreferences).toBe(true);
  });

  it('re-reads when tenantId changes (regression: Review #7 fix bedb0c0)', () => {
    setStoredPreferences(TENANT_A, prefsA);
    setStoredPreferences(TENANT_B, prefsB);

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useTenantPreferences(id),
      { initialProps: { id: TENANT_A } }
    );

    expect(result.current.preferences).toEqual(prefsA);

    rerender({ id: TENANT_B });

    expect(
      result.current.preferences,
      'switching tenantId (e.g. auth resolving from placeholder to real id) must surface the new tenant\'s prefs — without the [tenantId] effect this stays stuck on prefsA'
    ).toEqual(prefsB);
  });

  it('updatePreferences persists to the store and updates returned state', () => {
    const { result } = renderHook(() => useTenantPreferences(TENANT_A));

    act(() => {
      result.current.updatePreferences(prefsA);
    });

    expect(
      result.current.preferences,
      'state must reflect the saved payload immediately so the modal close doesn\'t flash the old value'
    ).toEqual(prefsA);
    expect(
      result.current.hasExplicitPreferences,
      'after a successful save hasExplicitPreferences must flip true so the B.3 banner hides'
    ).toBe(true);

    // Confirm round-trip via the store directly — a fresh hook instance must
    // read what was just written.
    const { result: fresh } = renderHook(() => useTenantPreferences(TENANT_A));
    expect(fresh.current.preferences).toEqual(prefsA);
  });
});
