import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  EMPTY_PREFERENCES,
  IMPLICIT_BUDGET_TOLERANCE,
  RECOMMENDATION_WINDOW_DAYS,
  clearStoredPreferences,
  daysUntil,
  derivePreferencesFromLease,
  firstOfLeaseEndMonth,
  getMockRecommendations,
  getStoredPreferences,
  isInRecommendationWindow,
  setStoredPreferences,
} from '@/data/tenantPreferences';
import { FEATURED_PROPERTIES } from '@/data/featuredProperties';
import type { Property } from '@/types/property';

const NOW = new Date('2026-05-05T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('daysUntil', () => {
  it('returns positive days for a future date', () => {
    const target = new Date('2026-05-15T12:00:00Z');
    expect(daysUntil(target), 'date 10 days ahead must report 10 days').toBe(10);
  });

  it('returns 0 or negative for a past date', () => {
    const target = new Date('2026-05-01T12:00:00Z');
    expect(daysUntil(target), 'date in the past should not be in the future').toBeLessThanOrEqual(0);
  });
});

describe('isInRecommendationWindow', () => {
  it('returns true exactly inside the 180-day window', () => {
    const inWindow = new Date(NOW.getTime() + 179 * 86400000);
    expect(
      isInRecommendationWindow(inWindow),
      'lease ending 179 days out must surface recommendations'
    ).toBe(true);
  });

  it('returns false beyond the window', () => {
    const outOfWindow = new Date(NOW.getTime() + (RECOMMENDATION_WINDOW_DAYS + 1) * 86400000);
    expect(
      isInRecommendationWindow(outOfWindow),
      'lease ending past 180 days must NOT surface recommendations — Task 6 is a near-end-of-lease feature'
    ).toBe(false);
  });

  it('returns false for a lease that already ended', () => {
    const past = new Date(NOW.getTime() - 86400000);
    expect(
      isInRecommendationWindow(past),
      'expired lease must not show recommendations — tenant is no longer in the window'
    ).toBe(false);
  });
});

describe('firstOfLeaseEndMonth', () => {
  it('snaps to the first day of the lease-end month', () => {
    const end = new Date(2026, 8, 30); // Sep 30 2026
    const first = firstOfLeaseEndMonth(end);
    expect(first.getFullYear(), 'year preserved').toBe(2026);
    expect(first.getMonth(), 'month preserved (Sep = 8)').toBe(8);
    expect(first.getDate(), 'day must be the 1st — boundary used by ?leaseId match filter').toBe(1);
  });
});

describe('derivePreferencesFromLease (B.3 implicit fallback)', () => {
  const sampleProperty: Property = FEATURED_PROPERTIES.find((p) => p.id === 'prop-2')!;

  it('budget brackets the current rent within ±15%', () => {
    const rent = 2000;
    const prefs = derivePreferencesFromLease(rent, sampleProperty);
    expect(
      prefs.budgetMin,
      'min must be 15% under current rent so similar inventory shows up, not just exact-rent matches'
    ).toBe(Math.round(rent * (1 - IMPLICIT_BUDGET_TOLERANCE)));
    expect(
      prefs.budgetMax,
      'max must be 15% over current rent for the same reason — the ±15% tolerance is the lever to retune later'
    ).toBe(Math.round(rent * (1 + IMPLICIT_BUDGET_TOLERANCE)));
  });

  it('copies bedrooms (as min), city, state, and property type from the current home', () => {
    const prefs = derivePreferencesFromLease(2000, sampleProperty);
    expect(
      prefs.bedroomsMin,
      'bedrooms is a hard human preference — copying as min keeps the suggestion realistic'
    ).toBe(sampleProperty.bedrooms);
    expect(prefs.locations).toEqual([
      { city: sampleProperty.city, state: sampleProperty.state },
    ]);
    expect(
      prefs.propertyTypes,
      'property type is a strong tenant signal — single-element list mirrors what they live in'
    ).toEqual([sampleProperty.propertyType]);
  });

  it('leaves bathrooms/sqft/amenities empty', () => {
    const prefs = derivePreferencesFromLease(2000, sampleProperty);
    // These three are too tenant-specific to guess; leaving them empty keeps
    // the implicit derivation conservative and lets the form fill in later.
    expect(prefs.bathroomsMin, 'bathrooms is too specific to infer').toBeNull();
    expect(prefs.squareFeetMin, 'sqft is too specific to infer').toBeNull();
    expect(prefs.amenities, 'amenities are tenant-specific — empty list is the safe default').toEqual([]);
  });
});

describe('getMockRecommendations', () => {
  // A lease ending Sep 30 puts the eligibility cutoff at Sep 1 — most
  // FEATURED_PROPERTIES are available in spring 2026, so they all qualify.
  const leaseEnd = new Date('2026-09-30T12:00:00Z');

  it('excludes the tenant\'s current property from the pool', () => {
    const recs = getMockRecommendations(leaseEnd, 'prop-2', 'preferences');
    expect(
      recs.find((r) => r.property.id === 'prop-2'),
      'current home must never appear in its own recommendations list'
    ).toBeUndefined();
  });

  it('returns the rest of the pool unchanged regardless of lease end date', () => {
    // FE demo intentionally drops the strict "availableDate ≥ leaseEnd month"
    // filter — the data file documents why (real inventory uses availableDate
    // as "available since", so the strict reading empties the demo pool).
    // BE owns the proper window logic; this test pins down the FE contract.
    const farFuture = new Date('2030-01-31T12:00:00Z');
    const recs = getMockRecommendations(farFuture, 'prop-1', 'preferences');
    expect(
      recs.length,
      'FE demo must keep recommendations populated; backend applies the move-in window filter'
    ).toBe(FEATURED_PROPERTIES.length - 1);
  });

  it('tags every item with the source flag the caller passed', () => {
    const explicit = getMockRecommendations(leaseEnd, 'prop-2', 'preferences');
    const implicit = getMockRecommendations(leaseEnd, 'prop-2', 'implicit-current-lease');
    expect(
      explicit.every((r) => r.source === 'preferences'),
      'caller-supplied source must propagate so the UI can render the right banner copy'
    ).toBe(true);
    expect(
      implicit.every((r) => r.source === 'implicit-current-lease'),
      'implicit fallback source must reach the UI for the B.3 banner gate'
    ).toBe(true);
  });

  it('attaches a non-empty matchedCategories list to every item', () => {
    const recs = getMockRecommendations(leaseEnd, 'prop-2', 'preferences');
    expect(recs.length, 'expect at least one match in the demo dataset').toBeGreaterThan(0);
    for (const rec of recs) {
      expect(
        rec.matchedCategories.length,
        `${rec.property.id} must surface ≥1 matched category — drives the "Matches X/Y" badge`
      ).toBeGreaterThan(0);
    }
  });
});

describe('preferenceStore', () => {
  const tenantId = 'tenant-test';

  afterEach(() => {
    clearStoredPreferences(tenantId);
  });

  it('returns null for an unset tenant', () => {
    expect(
      getStoredPreferences(tenantId),
      'untouched tenant must report null so callers can switch to the implicit fallback path'
    ).toBeNull();
  });

  it('round-trips through set/get', () => {
    const prefs = { ...EMPTY_PREFERENCES, budgetMin: 1500, budgetMax: 2500 };
    setStoredPreferences(tenantId, prefs);
    expect(getStoredPreferences(tenantId)).toEqual(prefs);
  });

  it('clears on demand', () => {
    setStoredPreferences(tenantId, EMPTY_PREFERENCES);
    clearStoredPreferences(tenantId);
    expect(
      getStoredPreferences(tenantId),
      'clear must reset the slot — backend replacement uses DELETE for the same effect'
    ).toBeNull();
  });
});
