/**
 * Two-entity Property + Listing contract for the `feat/properties` backend.
 * See `docs/api/properties_api.md` for the full reference.
 *
 * The wire format is camelCase on every model, so these types double as both
 * the DTO and the domain shape — no snake_case translation layer is needed
 * (unlike the auth/profile surface).
 *
 * This module supersedes the legacy single-entity flat `Property`
 * (`src/types/property.ts`) and the MLS-oriented `Property`/`Listing` in
 * `src/types/listing.ts` + `src/types/listing-enhanced.ts`. Those legacy types
 * are still imported by dead/unrouted surfaces and get removed in the cleanup
 * step; do not build new code on them.
 */

import type { SurroundingPOI } from '@/types/property';

// Re-export so listing-side consumers can import the POI shape from here
// without reaching back into the legacy flat-Property file. The existing
// definition already matches this contract exactly (category / name /
// distanceMiles / note).
export type { SurroundingPOI, SurroundingCategory } from '@/types/property';

// ---------------------------------------------------------------------------
// Property — the physical asset
// ---------------------------------------------------------------------------

/**
 * RESO-aligned property type. Reflects the DB CHECK constraint, and is NOT the
 * legacy lowercase `PropertyType` (apartment/house/studio/loft) in
 * `property.ts`.
 */
export type RealPropertyType =
  | 'single_family'
  | 'multi_family'
  | 'apartment'
  | 'condo'
  | 'townhouse'
  | 'commercial'
  | 'other';

/** One row per real-world property, deduped by `normalizedAddress + parcelApn`. */
export interface PropertyAsset {
  id: string;
  // Identity / dedup
  normalizedAddress: string | null; // DB-generated; null until populated
  parcelApn: string | null; // county parcel / APN; null until matched
  // Address (RESO-aligned)
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateOrProvince: string; // jurisdiction limited to FL/TX/TN in MVP
  postalCode: string;
  // Geospatial (PostGIS geography)
  latitude: number | null;
  longitude: number | null;
  // Physical characteristics (RESO)
  propertyType: RealPropertyType;
  bedroomsTotal: number | null;
  bathroomsTotal: number | null; // fractional allowed (2.5)
  livingArea: number | null; // sqft
  yearBuilt: number | null;
  parkingFeatures: string[]; // replaces the legacy flat parkingAvailable boolean
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Listing — a time-bound offer
// ---------------------------------------------------------------------------

/** MVP creates only `rent_ltr`; the rest are schema-ready, surfaced later. */
export type ListingIntent = 'rent_ltr' | 'rent_str' | 'sale' | 'fractional';

/** Lifecycle state machine — replaces the legacy flat `status` enum. */
export type ListingState =
  | 'draft'
  | 'active'
  | 'pending'
  | 'leased'
  | 'sold'
  | 'withdrawn'
  | 'expired';

// --- Polymorphic terms (keyed by Listing.intent) ---------------------------

/**
 * MVP terms shape — the only one created/served at launch. Note: `rent_ltr`
 * terms carry NO inner `intent` field; intent lives on the Listing.
 */
export interface RentLtrTerms {
  rentMonthly: number; // > 0
  securityDeposit: number; // >= 0
  leaseTermsOffered: string[]; // non-empty; '6 Months' | '1 Year' | ...
  furnished: boolean;
}

// Schema-ready, NOT surfaced in MVP. These carry an inner `intent`
// discriminator (unlike RentLtrTerms) so the union narrows on a known field.
export interface RentStrTerms {
  intent: 'rent_str';
  nightlyRate: number;
  minNights: number;
}
export interface SaleTerms {
  intent: 'sale';
  listPrice: number;
}
export interface FractionalTerms {
  intent: 'fractional';
}

export type ListingTerms =
  | RentLtrTerms
  | RentStrTerms
  | SaleTerms
  | FractionalTerms;

// --- Media pipeline --------------------------------------------------------

export type MediaModerationStatus = 'pending' | 'approved' | 'rejected';

export interface MediaRef {
  id: string;
  url: string; // CDN-fronted URL
  cid: string | null; // IPFS content id; null until pinned (synthetic in MVP)
  position: number; // ordering
  moderationStatus: MediaModerationStatus;
}

// --- Provenance / authority-to-list gate -----------------------------------

export type AuthorityTier = 'T0' | 'T1' | 'T2';
export type AuthorityLabel =
  | 'Unverified'
  | 'Documents on file'
  | 'Verified owner'
  | 'Verified manager';

/**
 * Read-only, derived from the three-part gate. A listing cannot reach `active`
 * until identity + authority + fair-housing all pass. In MVP the backend stubs
 * this: identity is always verified and T2 is unreachable.
 */
export interface ListingProvenance {
  identityVerified: boolean; // identity gate
  authorityTier: AuthorityTier; // authority gate
  authorityLabel: AuthorityLabel;
  managedByPm: boolean;
  fairHousingCleared: boolean; // fair-housing gate
  // Derived UI badge: identityVerified && authorityTier >= T1.
  verifiedListerBadge: boolean;
}

// --- On-chain anchor (read-only) -------------------------------------------

/** Backend currently hardcodes `Listing.onChain = null`; this is the target shape. */
export interface ListingOnChain {
  committed: boolean;
  listingIdHash: string | null;
  payloadHash: string | null;
  lister: string | null; // publishing wallet
  committedAt: string | null; // timestamp_ms
  provenanceOnChain: boolean; // commitment exists / tamper-evident
  settlesOnChain: boolean; // non-custodial escrow indicator
}

/** An offer against a property — intent, price, terms, lifecycle, provenance. */
export interface Listing {
  id: string;
  propertyId: string; // FK -> PropertyAsset (many listings : one property)
  listedBy: string; // landlord/PM user id (was Property.landlordId)
  intent: ListingIntent;
  state: ListingState;
  daysOnMarket: number; // counts from createdAt, including draft time
  expiresAt: string | null; // activation + 90 days
  // Offer content (fair-housing-screened free text)
  title: string;
  description: string;
  amenities: string[];
  utilitiesIncluded: string[];
  petPolicy: string | null; // constrained, not free-text
  availableDate: string | null; // 'YYYY-MM-DD'
  surroundingArea?: SurroundingPOI[];
  // Pricing + terms — polymorphic by intent
  terms: ListingTerms;
  media: MediaRef[];
  provenance: ListingProvenance; // read-only, derived from the gate
  onChain: ListingOnChain | null; // null until the on-chain anchor is wired
  views: number; // unique registered tenants
  createdAt: string;
  updatedAt: string;
  property?: PropertyAsset; // nested in detail/search responses
}

// ---------------------------------------------------------------------------
// Pagination & search
// ---------------------------------------------------------------------------

/**
 * Generic paginated envelope. Field names differ from the legacy
 * `PropertyListResponse` (`properties`/`total`/`totalPages`). The current
 * page/size are NOT echoed in the body — they are request query params.
 */
export interface PaginatedResponse<T> {
  data: T[]; // current-page items
  itemCount: number; // total items across all pages
  pageCount: number; // total pages
}

export type ListingSortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'availableDate'
  | 'rent'
  | 'distance'; // 'distance' needs nearLat/nearLng

/**
 * Geo search shape shared by listing search and property geo-search. The
 * radius trio (`nearLat`/`nearLng`/`radiusMiles`) is all-or-nothing; `bbox` is
 * the bounding-box alternative. Kept as one base so the two surfaces can't drift.
 */
export interface GeoSearchParams {
  nearLat?: number;
  nearLng?: number;
  radiusMiles?: number; // (0, 500]
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
}

/**
 * `GET /listings` (public) params over active listings.
 * Every filter is SINGLE-valued; pagination uses `pageSize`, NOT `limit`.
 * No protected-class proxy may ever appear here as a filter or sort.
 */
export interface ListingSearchParams extends GeoSearchParams {
  search?: string; // text: ilike over title + addressLine1
  // Attribute filters (non-protected-class only)
  intent?: ListingIntent; // MVP: rent_ltr
  propertyType?: RealPropertyType;
  minRent?: number;
  maxRent?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  petsAllowed?: boolean;
  furnished?: boolean;
  // Sort — audited default, no steering
  sortBy?: ListingSortBy;
  sortOrder?: 'asc' | 'desc'; // default desc
  page?: number; // default 1
  pageSize?: number; // default 25, max 100 (NOT `limit`)
}

// ---------------------------------------------------------------------------
// Analytics (re-homed onto Listing)
// ---------------------------------------------------------------------------

/** `GET /listings/{id}/statistics`. totalApplications is currently hardcoded 0. */
export interface ListingStatistics {
  totalViews: number;
  totalApplications: number;
  activeLeases: number;
  monthlyRevenue: number;
  occupancyRate: number; // %
}

/** `GET /listings/{id}/historical-data`. */
export interface ListingHistoricalData {
  totalLeases: number;
  totalViews: number;
  hasHistoricalData: boolean;
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

/**
 * `POST /properties` (dedup upsert). Identity/geo/derived fields
 * (`normalizedAddress`, `parcelApn`, `latitude`, `longitude`, timestamps) are
 * resolved server-side, so they are omitted here.
 */
export interface CreatePropertyBody {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  propertyType: RealPropertyType;
  bedroomsTotal?: number | null;
  bathroomsTotal?: number | null;
  livingArea?: number | null;
  yearBuilt?: number | null;
  parkingFeatures?: string[];
}

/**
 * `POST /listings` — creates a listing in `draft` against an existing property.
 * State/provenance/onChain/views/timestamps are server-derived.
 */
export interface CreateListingBody {
  propertyId: string;
  intent: ListingIntent; // MVP: 'rent_ltr'
  title: string;
  description: string;
  amenities: string[];
  utilitiesIncluded: string[];
  petPolicy?: string | null;
  availableDate?: string | null;
  surroundingArea?: SurroundingPOI[];
  terms: ListingTerms;
}

/** `PUT /listings/{id}` — partial update; re-runs the fair-housing screen. */
export type UpdateListingBody = Partial<Omit<CreateListingBody, 'propertyId'>>;

/** `PUT /listings/{id}/state` — lifecycle transition; `-> active` is gate-guarded. */
export interface ListingStateTransitionBody {
  state: ListingState;
}

/**
 * `PUT /listings/{id}/media` — reorder / remove. Each entry sets the position
 * of a surviving media id; ids absent from the array are removed.
 */
export interface MediaReorderEntry {
  id: string;
  position: number;
}

/**
 * `POST /listings/{id}/fair-housing/screen` result. Reasons live here, not on
 * provenance.
 */
export interface FairHousingScreenResult {
  cleared: boolean;
  flags: string[]; // matched phrases / rule ids; empty when cleared
}

/** Proof-of-authority document kinds accepted by the authority gate. */
export type AuthorityDocumentType = 'deed' | 'title' | 'management_agreement';

/** `POST /listings/{id}/authority/documents` response. */
export interface AuthorityDocumentResponse {
  id: string;
  documentType: AuthorityDocumentType;
  url: string;
  uploadedAt: string;
  provenance: ListingProvenance; // gate status after this upload (tier may rise to T1)
}
