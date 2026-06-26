/**
 * DEMO-ONLY — Task 9: Extended Search Filters (In-home + Surrounding area)
 * See docs/CLIENT_FEEDBACK_BACKLOG.md §"Task 9".
 *
 * Verbatim client request (meeting 2026-05-07):
 *
 *   Chris:   "Anthony's any thoughts on like having like, within a certain
 *            area filters? Like for example, if I want like a children's
 *            hospital or a hospital within like 15 miles because I have
 *            certain conditions… more in the area filters?"
 *
 *   Anthony: "Click all of those features and then it's able to say like
 *            with what mileage… you can have certain categories that you
 *            would normally find within the home like, you know,
 *            refrigerator or garage… and then certain things like the gym
 *            or movie theaters, hospitals, whatever it is, you can put
 *            like a category or area of things within the neighborhood."
 *
 * Open product questions (pending product sign-off):
 *   Q1. Strictness — AND across surrounding-area categories, or fuzzy
 *       ranking? Demo uses AND; flip MATCH_STRICTNESS to switch.
 *   Q2. Mile-range presets vs free slider only? Demo ships both.
 *   Q3. Imperial vs metric? Demo is miles-only (US MVP).
 *   Q4. POI source for v2 — Google Places / Mapbox / OSM? Out of scope
 *       for MVP; landlord enters POIs (Task 11).
 *
 * TODO(backend): once Task 11 lands, the POI lists below become *display*
 * controls only — the actual matching moves to
 * GET /api/v1/properties/search?amenity_in_home[]=…&amenity_nearby[<cat>]=<mi>.
 * Keep IN_HOME_AMENITIES / SURROUNDING_CATEGORIES in sync with the backend
 * enum.
 */

import type { SurroundingCategory } from '@/types/property';

// Boolean toggles — things found *inside* the unit / building.
// NB: do not extend ad-hoc; new entries must round-trip through the backend
// property.amenities[] enum (Task 11 dependency).
export const IN_HOME_AMENITIES = [
  'Heating',
  'Air Conditioning',
  'Pool',
  'Garage',
  'In-building Gym',
  'Pet-Friendly',
  'In-unit Laundry',
  'Dishwasher',
  'Refrigerator',
  'Natural Light',
  'Furnished',
  'Balcony',
  'Hardwood Floors',
  'Fireplace',
  'Walk-in Closet',
] as const;

export type InHomeAmenity = (typeof IN_HOME_AMENITIES)[number];

export interface SurroundingCategoryConfig {
  category: SurroundingCategory;
  label: string;
  /** Default radius (miles) when the user enables this category. */
  defaultRadiusMiles: number;
}

// Per-category config — drives the toggle + slider UI.
export const SURROUNDING_CATEGORIES: SurroundingCategoryConfig[] = [
  { category: 'hospital', label: 'Hospital', defaultRadiusMiles: 10 },
  { category: 'school', label: 'School', defaultRadiusMiles: 5 },
  { category: 'gym', label: 'Gym', defaultRadiusMiles: 5 },
  { category: 'airport', label: 'Airport', defaultRadiusMiles: 30 },
  { category: 'park', label: 'Park', defaultRadiusMiles: 3 },
  { category: 'grocery', label: 'Grocery store', defaultRadiusMiles: 3 },
  { category: 'transit', label: 'Public transit', defaultRadiusMiles: 2 },
];

// Quick-pick chips on each surrounding-area slider — keeps mobile tap targets
// large (Q2). Free slider remains available alongside.
export const MILE_RANGE_PRESETS = [5, 10, 20, 50] as const;

// Slider bounds — applies to every surrounding-area category.
export const SURROUNDING_MIN_MILES = 1;
export const SURROUNDING_MAX_MILES = 100;

// Match strictness for the surrounding-area filter group.
// 'strict' = AND across enabled categories (every category must be satisfied);
// 'fuzzy' = rank results by how many categories match.
// Demo defaults to strict per Anthony's quote; toggle once Q1 is answered.
export const MATCH_STRICTNESS: 'strict' | 'fuzzy' = 'strict';
