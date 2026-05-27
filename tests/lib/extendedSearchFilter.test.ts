import { describe, it, expect } from 'vitest';

import { applyExtendedSearchFilters } from '@/lib/extendedSearchFilter';
import type { Property, SurroundingPOI } from '@/types/property';

// MATCH_STRICTNESS is 'strict' (src/data/amenityCategories.ts): a property
// must satisfy *every* requested nearby category to be returned, and a
// missing/empty category for a requested filter drops the property. These
// assertions assume that shipped mode.

const makeProperty = (over: Partial<Property> = {}): Property =>
  ({
    id: 'p1',
    title: 'Test property',
    amenities: [],
    surroundingArea: [],
    ...over,
  }) as unknown as Property;

const poi = (
  category: SurroundingPOI['category'],
  distanceMiles: number,
  name = `${category}-poi`,
): SurroundingPOI => ({ category, name, distanceMiles });

describe('applyExtendedSearchFilters — in-home amenities', () => {
  it('returns every property when no filters are supplied', () => {
    const props = [makeProperty({ id: 'a' }), makeProperty({ id: 'b' })];
    const result = applyExtendedSearchFilters(props, {});
    expect(result.map((m) => m.property.id)).toEqual(['a', 'b']);
    expect(result[0].matchedCategories).toEqual([]);
    expect(result[0].nearestByCategory).toEqual({});
  });

  it('matches required amenities case-insensitively', () => {
    const props = [makeProperty({ id: 'has', amenities: ['Pool', 'Garage'] })];
    const result = applyExtendedSearchFilters(props, {
      amenitiesInHome: ['pool'],
    });
    expect(result).toHaveLength(1);
  });

  it('excludes a property missing a required amenity', () => {
    const props = [makeProperty({ id: 'no', amenities: ['Garage'] })];
    const result = applyExtendedSearchFilters(props, {
      amenitiesInHome: ['Pool'],
    });
    expect(result).toHaveLength(0);
  });

  it('requires ALL listed amenities (AND semantics)', () => {
    const props = [
      makeProperty({ id: 'one', amenities: ['Pool'] }),
      makeProperty({ id: 'both', amenities: ['Pool', 'Gym'] }),
    ];
    const result = applyExtendedSearchFilters(props, {
      amenitiesInHome: ['Pool', 'Gym'],
    });
    expect(result.map((m) => m.property.id)).toEqual(['both']);
  });

  // NW-1 regression guard: real API responses may omit `amenities`.
  it('does not throw when amenities is undefined', () => {
    const props = [
      makeProperty({ id: 'x', amenities: undefined as unknown as string[] }),
    ];
    expect(() => applyExtendedSearchFilters(props, {})).not.toThrow();
    // Required amenity + no amenities field → excluded, not a crash.
    expect(
      applyExtendedSearchFilters(props, { amenitiesInHome: ['Pool'] }),
    ).toHaveLength(0);
    // No amenity filter → still passes through.
    expect(applyExtendedSearchFilters(props, {})).toHaveLength(1);
  });
});

describe('applyExtendedSearchFilters — nearby distances (strict)', () => {
  it('includes a property with a POI in range and reports the distance', () => {
    const props = [makeProperty({ id: 'near', surroundingArea: [poi('gym', 3)] })];
    const result = applyExtendedSearchFilters(props, {
      amenitiesNearby: { gym: 5 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].nearestByCategory).toEqual({ gym: 3 });
    expect(result[0].matchedCategories).toEqual(['gym']);
  });

  it('uses the nearest POI when several share a category', () => {
    const props = [
      makeProperty({
        id: 'multi',
        surroundingArea: [poi('gym', 8), poi('gym', 2), poi('gym', 5)],
      }),
    ];
    const result = applyExtendedSearchFilters(props, {
      amenitiesNearby: { gym: 10 },
    });
    expect(result[0].nearestByCategory.gym).toBe(2);
  });

  it('excludes a property whose nearest POI is beyond the max miles', () => {
    const props = [
      makeProperty({ id: 'far', surroundingArea: [poi('gym', 12)] }),
    ];
    const result = applyExtendedSearchFilters(props, {
      amenitiesNearby: { gym: 5 },
    });
    expect(result).toHaveLength(0);
  });

  it('excludes a property with no POIs for the requested category', () => {
    const props = [makeProperty({ id: 'empty', surroundingArea: [] })];
    const result = applyExtendedSearchFilters(props, {
      amenitiesNearby: { park: 20 },
    });
    expect(result).toHaveLength(0);
  });

  it('requires every requested category to be satisfied', () => {
    const props = [
      makeProperty({ id: 'gymOnly', surroundingArea: [poi('gym', 1)] }),
      makeProperty({
        id: 'gymAndPark',
        surroundingArea: [poi('gym', 1), poi('park', 4)],
      }),
    ];
    const result = applyExtendedSearchFilters(props, {
      amenitiesNearby: { gym: 5, park: 20 },
    });
    expect(result.map((m) => m.property.id)).toEqual(['gymAndPark']);
    expect(result[0].nearestByCategory).toEqual({ gym: 1, park: 4 });
  });
});

describe('applyExtendedSearchFilters — combined', () => {
  it('passes only when both the in-home and nearby predicates hold', () => {
    const props = [
      makeProperty({
        id: 'full',
        amenities: ['Pool'],
        surroundingArea: [poi('gym', 2)],
      }),
      makeProperty({
        id: 'noAmenity',
        amenities: [],
        surroundingArea: [poi('gym', 2)],
      }),
      makeProperty({
        id: 'noNearby',
        amenities: ['Pool'],
        surroundingArea: [],
      }),
    ];
    const result = applyExtendedSearchFilters(props, {
      amenitiesInHome: ['Pool'],
      amenitiesNearby: { gym: 5 },
    });
    expect(result.map((m) => m.property.id)).toEqual(['full']);
  });
});
