import type { Property, PropertyType, SurroundingCategory } from '@/types/property';

// Profile-level rental preferences. All fields optional (nullable) so a
// half-filled form is valid — tenant can save what they know and refine later.
export interface RentalPreferences {
  budgetMin: number | null;
  budgetMax: number | null;
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  squareFeetMin: number | null;
  locations: PreferredLocation[];
  propertyTypes: PropertyType[];
  amenities: string[];
  // Task 9 — must-have surrounding-area POIs.
  // Key = SurroundingCategory; value = max distance in miles.
  // Empty/undefined = no constraint.
  // TODO(backend, Task 6 matcher): when this is non-empty, the
  // GET /api/v1/properties/recommended matcher must also rank/filter by POI
  // distance. Until that lands, recommendations ignore this field; only the
  // PropertySearch page applies it client-side.
  surroundingArea?: Partial<Record<SurroundingCategory, number>>;
}

export interface PreferredLocation {
  city: string;
  state: string;
}

// One item from the recommendation feed. The matching/ranking is owned by the
// backend (`GET /api/v1/properties/recommended`); FE only renders. The
// `matchedCategories` array drives the "Matches X/Y" badge — its length is
// the X, the count of preference categories the tenant has set is the Y.
//
// `source` tells the UI whether the recommendations came from the tenant's
// explicit preferences or from the implicit fallback (derived from the
// current lease). The B.3 banner reads this flag.
export interface RecommendedProperty {
  property: Property;
  matchedCategories: MatchCategory[];
  source: RecommendationSource;
}

export type MatchCategory =
  | 'budget'
  | 'bedrooms'
  | 'bathrooms'
  | 'sqft'
  | 'location'
  | 'type'
  | 'amenities'
  // Task 9 — added so recommendations can also score surrounding-area
  // match. Backend matcher must update its `matchedCategories[]` to include
  // this when relevant.
  | 'surrounding';

export type RecommendationSource = 'preferences' | 'implicit-current-lease';

// Total set of categories considered — used to render "Matches X/N" where
// N is the count of categories the tenant actually populated. Kept in sync
// with the keys checked by the backend matcher.
export const ALL_MATCH_CATEGORIES: readonly MatchCategory[] = [
  'budget',
  'bedrooms',
  'bathrooms',
  'sqft',
  'location',
  'type',
  'amenities',
  'surrounding',
] as const;

export function isPreferenceSet(prefs: RentalPreferences, category: MatchCategory): boolean {
  switch (category) {
    case 'budget':
      return prefs.budgetMin !== null || prefs.budgetMax !== null;
    case 'bedrooms':
      return prefs.bedroomsMin !== null;
    case 'bathrooms':
      return prefs.bathroomsMin !== null;
    case 'sqft':
      return prefs.squareFeetMin !== null;
    case 'location':
      return prefs.locations.length > 0;
    case 'type':
      return prefs.propertyTypes.length > 0;
    case 'amenities':
      return prefs.amenities.length > 0;
    case 'surrounding':
      return !!prefs.surroundingArea && Object.keys(prefs.surroundingArea).length > 0;
  }
}

export function countActivePreferences(prefs: RentalPreferences): number {
  return ALL_MATCH_CATEGORIES.filter((c) => isPreferenceSet(prefs, c)).length;
}
