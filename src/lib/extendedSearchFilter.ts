/**
 * DEMO-ONLY — Task 9: client-side filter for in-home amenities + surrounding
 * area. See docs/CLIENT_FEEDBACK_BACKLOG.md §"Task 9".
 *
 * TODO(backend): replace with a server call —
 *   GET /api/v1/properties/search
 *     ?amenity_in_home[]=Pool&amenity_in_home[]=Garage
 *     &amenity_nearby[hospital]=20&amenity_nearby[gym]=5
 * The server applies the same predicate against landlord-entered
 * property.surroundingArea (Task 11) using haversine / PostGIS ST_DWithin.
 */

import type { Property, SurroundingCategory } from '@/types/property';
import { MATCH_STRICTNESS } from '@/data/amenityCategories';

export interface ExtendedSearchInput {
  amenitiesInHome?: string[];
  amenitiesNearby?: Record<string, number>;
}

export interface ExtendedSearchMatch<T extends Property> {
  property: T;
  /** Nearest POI distance for each enabled surrounding-area category. */
  nearestByCategory: Partial<Record<SurroundingCategory, number>>;
  /** Categories satisfied by the property — for fuzzy ranking (future). */
  matchedCategories: SurroundingCategory[];
}

const isInHomeAmenitySatisfied = (
  property: Property,
  required: string[]
): boolean => {
  if (required.length === 0) return true;
  const have = new Set(property.amenities.map((a) => a.toLowerCase()));
  return required.every((a) => have.has(a.toLowerCase()));
};

const findNearest = (
  property: Property,
  category: SurroundingCategory
): number | undefined => {
  const pois = property.surroundingArea?.filter((p) => p.category === category);
  if (!pois || pois.length === 0) return undefined;
  return Math.min(...pois.map((p) => p.distanceMiles));
};

export function applyExtendedSearchFilters<T extends Property>(
  properties: T[],
  input: ExtendedSearchInput
): Array<ExtendedSearchMatch<T>> {
  const inHome = input.amenitiesInHome ?? [];
  const nearby = input.amenitiesNearby ?? {};
  const nearbyEntries = Object.entries(nearby) as Array<
    [SurroundingCategory, number]
  >;

  const matches: Array<ExtendedSearchMatch<T>> = [];

  for (const property of properties) {
    if (!isInHomeAmenitySatisfied(property, inHome)) continue;

    const nearestByCategory: Partial<Record<SurroundingCategory, number>> = {};
    const matchedCategories: SurroundingCategory[] = [];

    let satisfiesAll = true;
    for (const [category, maxMiles] of nearbyEntries) {
      const nearest = findNearest(property, category);
      if (nearest !== undefined) nearestByCategory[category] = nearest;
      const satisfied = nearest !== undefined && nearest <= maxMiles;
      if (satisfied) matchedCategories.push(category);
      else if (MATCH_STRICTNESS === 'strict') satisfiesAll = false;
    }

    if (MATCH_STRICTNESS === 'strict' && !satisfiesAll) continue;

    matches.push({ property, nearestByCategory, matchedCategories });
  }

  if (MATCH_STRICTNESS === 'fuzzy') {
    matches.sort(
      (a, b) => b.matchedCategories.length - a.matchedCategories.length
    );
  }

  return matches;
}
