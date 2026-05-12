// =============================================================================
// DEMO-ONLY — Task 6 (Property Recommendations 6 months before lease ends).
// =============================================================================
//
// Client request (verbatim):
//   "6 months from lease expiration the tenant will be able to see other
//    properties for rent that meet their predefined requirements (should be
//    a part of their profile) with move-in dates starting the same month
//    that their current is expiring."
//
// Scope split between FE and BE:
//
//   FE owns:
//     - Preferences form UI + in-memory persist (resets on page reload)
//     - Rendering of recommendation cards
//     - B.3 implicit-fallback decision (no preferences → derive from lease)
//
//   BE owns (TO BUILD):
//     - GET  /api/v1/users/me/preferences          → persist real prefs
//     - PUT  /api/v1/users/me/preferences          → update prefs
//     - GET  /api/v1/properties/recommended?leaseId=…
//       → matched, ranked, scored. Response carries `matchedCategories[]`
//         per item — FE uses this for the "Matches X/Y" badge but does
//         NOT compute the match itself.
//     - Daily cron at T-180 → in-app + email push
//       (shares Task 4 cron — they evaluate the same lease window).
//
// Real implementation will replace `getMockRecommendations` with a
// `useQuery(['recommendations', leaseId])` against the BE endpoint.
// `derivePreferencesFromLease` stays on FE — it's a thin lookup the BE
// can call with `?fallback=true` and the same logic.
// =============================================================================

import type { Property } from '@/types/property';
import { FEATURED_PROPERTIES } from './featuredProperties';
import type {
  RentalPreferences,
  RecommendedProperty,
  RecommendationSource,
} from '@/types/tenantPreferences';

// Lease end has to be within this many days for recommendations to surface.
// Mirrors EXTENSION_WINDOW_DAYS from leaseExtensions.ts so Task 4 + Task 6
// fire together when they reach the same milestone.
export const RECOMMENDATION_WINDOW_DAYS = 180;

// Implicit-fallback budget tolerance: when we derive preferences from the
// current rent, we accept ±15% so the tenant sees comparable inventory and
// not just exact-rent matches (which would be near-zero).
export const IMPLICIT_BUDGET_TOLERANCE = 0.15;

// In-memory store. Keyed by tenant id. Resets on page reload — backend
// replacement is `GET /api/v1/users/me/preferences`.
const preferenceStore = new Map<string, RentalPreferences>();

export const EMPTY_PREFERENCES: RentalPreferences = {
  budgetMin: null,
  budgetMax: null,
  bedroomsMin: null,
  bathroomsMin: null,
  squareFeetMin: null,
  locations: [],
  propertyTypes: [],
  amenities: [],
  surroundingArea: undefined,
};

export function getStoredPreferences(tenantId: string): RentalPreferences | null {
  return preferenceStore.get(tenantId) ?? null;
}

export function setStoredPreferences(tenantId: string, prefs: RentalPreferences): void {
  preferenceStore.set(tenantId, prefs);
}

export function clearStoredPreferences(tenantId: string): void {
  preferenceStore.delete(tenantId);
}

// Days remaining until lease end. Same shape as leaseExtensions.daysUntil
// — duplicated rather than imported to keep this module standalone for
// the eventual cleanup when leaseExtensions is replaced by real data.
export function daysUntil(endDate: Date): number {
  return Math.ceil((endDate.getTime() - Date.now()) / 86400000);
}

export function isInRecommendationWindow(endDate: Date): boolean {
  const days = daysUntil(endDate);
  return days > 0 && days <= RECOMMENDATION_WINDOW_DAYS;
}

// First day of the month the lease ends — properties become eligible if
// their `availableDate` is on or after this. Matches the spec wording
// "starting the same month that their current is expiring", read loosely
// as "≥ that month" (Q2 default — flexibility wins over literal reading).
export function firstOfLeaseEndMonth(endDate: Date): Date {
  return new Date(endDate.getFullYear(), endDate.getMonth(), 1);
}

// B.3 implicit fallback. When the tenant hasn't set explicit preferences,
// we synthesise a starting point from the home they currently live in —
// budget ±15%, same bedrooms (as min), same city/state, same property type.
// Bathrooms/sqft/amenities stay empty: too tenant-specific to guess.
//
// This is also reused as the prefill payload for the preferences modal —
// if the tenant clicks "Set your preferences" from the implicit banner,
// the form opens populated, ready for tweaks rather than blank.
export function derivePreferencesFromLease(
  monthlyRent: number,
  currentProperty: Property
): RentalPreferences {
  return {
    budgetMin: Math.round(monthlyRent * (1 - IMPLICIT_BUDGET_TOLERANCE)),
    budgetMax: Math.round(monthlyRent * (1 + IMPLICIT_BUDGET_TOLERANCE)),
    bedroomsMin: currentProperty.bedrooms,
    bathroomsMin: null,
    squareFeetMin: null,
    locations: [{ city: currentProperty.city, state: currentProperty.state }],
    propertyTypes: [currentProperty.propertyType],
    amenities: [],
  };
}

// Demo recommendations. Backend will replace this with a ranked, scored
// response from `GET /api/v1/properties/recommended?leaseId=…`. The list
// here is hand-curated against `FEATURED_PROPERTIES`; the BE will tag each
// item with a plausible `matchedCategories` set, here we hard-code one so
// the badge has real content to render.
//
// Availability filter — note the gap with the spec:
//   The client wording reads "with move-in dates starting the same month
//   that their current is expiring", which would map to
//   `availableDate ≥ firstOfLeaseEndMonth(leaseEnd)`.
//   In real inventory `availableDate` represents "available since" rather
//   than "available starting" — listings are typically continuously open
//   from that date onward — so the strict reading would filter out every
//   currently-listed property whose listing predates the lease end month.
//   For the demo we exclude only the tenant's current home; the BE matcher
//   will apply the proper window logic against listing status + a desired
//   move-in cutoff once that contract is finalized.
export function getMockRecommendations(
  leaseEndDate: Date,
  currentPropertyId: string,
  source: RecommendationSource
): RecommendedProperty[] {
  void leaseEndDate; // kept in the signature so the BE swap doesn't change call sites
  const pool = FEATURED_PROPERTIES.filter((p) => p.id !== currentPropertyId);

  // Hand-curated `matchedCategories` per property. In a real response the
  // backend supplies these — here we hard-code a plausible mix so the UI
  // (badge text, "See all matches" copy) renders meaningfully on demo.
  const HAND_CURATED_MATCHES: Record<string, RecommendedProperty['matchedCategories']> = {
    'prop-1': ['budget', 'bedrooms', 'location', 'type'],
    'prop-2': ['budget', 'bedrooms', 'bathrooms', 'location', 'type'],
    'prop-3': ['bedrooms', 'location', 'type', 'amenities'],
    'prop-4': ['budget', 'location', 'type'],
    'prop-5': ['budget', 'bedrooms', 'location'],
    'prop-6': ['budget', 'location', 'type', 'amenities'],
  };

  return pool.map((property) => ({
    property,
    matchedCategories: HAND_CURATED_MATCHES[property.id] ?? ['location', 'type'],
    source,
  }));
}
