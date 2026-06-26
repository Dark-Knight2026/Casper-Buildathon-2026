# Backend API reference — ADR-007 update (Listing & Property foundation)

> ℹ️ This file translates **ADR-007 (Listing & Property Data Foundation)** into a concrete
> API/schema contract, in the same style as the previous version. ADR-007 is an **architecture** decision
> record and is still `Draft — pending sign-off`; it does not itself specify API field names.
> Anything not literally fixed by the ADR is an **engineering assumption** and is marked
> `[assume]`. Where this contract supersedes the previous version, it is marked `[changes previous version]`.
> MVP ships only `rent_ltr`; other intents are schema-ready but surfaced in Phase 3/4.
>
> 🔧 **Reconciled with the backend `feat/properties` implementation (2026-06-15).** Sections below
> reflect what is actually built; spots still stubbed in code are marked `[stubbed]`. The wire format
> is **camelCase** on every model unless noted; all routes are mounted under **`/api/v1`**.

---

## 0. What changes vs the previous version (overview)

ADR-007 is not a tweak to the existing single-entity `Property`. It re-shapes the foundation:

- **Two-entity split [D1].** `Property` (the physical asset, deduplicated) and `Listing`
  (a time-bound offer against a property) become **separate** resources. Many listings may
  reference one property over its life. The previous version's single `Property` is split.
- **Intent + polymorphic terms [D1].** A listing carries an `intent`
  (`rent_ltr | rent_str | sale | fractional`); pricing/terms are polymorphic by intent.
- **Lifecycle state machine [D1].** `draft -> active -> pending -> leased/sold -> withdrawn/expired`,
  with enforced days-on-market and **auto-expiry** (replaces the flat `status` enum).
- **Provenance / authority gate [D2].** A listing **cannot reach `active`** until it clears a
  three-part gate: identity (KYC), authority tier (T0/T1/T2), and a Fair Housing advertising screen.
- **On-chain anchor [D3].** An append-only commitment (`listing_id_hash` + `payload_hash`) is
  written to a minimal registry; the listing carries an on-chain provenance indicator.
- **RESO-aligned naming [D1].** Field taxonomy follows the RESO Data Dictionary from day one.
- **Media pipeline [D1].** Upload strips EXIF/GPS, runs a moderation pass, pins to IPFS (CID).
- **Removed.** `users.ssn_encrypted` is killed (precondition); protected-class search filters and
  steering signals are forbidden.

### Field mapping — old `Property` (the previous version) -> new split

| the previous version `Property` field                                                                                                                                                                        | Lands on                                                   | Notes                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, address, `city`, `state`, `zipCode`, `latitude`, `longitude`, `propertyType`, `bedrooms`, `bathrooms`, `squareFeet`                                                                                    | **Property**                                               | RESO-renamed; `state -> stateOrProvince`, `zipCode -> postalCode`, `squareFeet -> livingArea`, `bedrooms -> bedroomsTotal`, `bathrooms -> bathroomsTotal` |
| `landlordId`                                                                                                                                                                                                 | **Listing.listedBy** + Property dedup is owner-independent | one property, many listers over time                                                                                                                      |
| `title`, `description`, `rent`, `securityDeposit`, `availableDate`, `leaseTerms`, `amenities`, `petPolicy`, `petsAllowed`, `furnished`, `utilitiesIncluded`, `parkingAvailable`, `images`, `surroundingArea` | **Listing**                                                | listing-scoped offer content + media                                                                                                                      |
| `status`                                                                                                                                                                                                     | **Listing.state**                                          | new state machine, not the flat enum                                                                                                                      |
| `views`                                                                                                                                                                                                      | **Listing.views**                                          | unchanged semantics (unique registered tenants)                                                                                                           |
| (new) `yearBuilt`, `parkingFeatures`, `parcelApn`, `normalizedAddress`                                                                                                                                       | **Property**                                               | ADR §5 MVP fields + dedup key                                                                                                                             |

---

## 1. Property — the physical asset [D1]

One row per real-world property, regardless of how many times it is listed. Identity is the
**dedup key** `normalizedAddress + parcelApn` (ADR D1). RESO-aligned field names.

### Endpoints

| Method | Path                        | Description                                                                       | Access   |
| ------ | --------------------------- | --------------------------------------------------------------------------------- | -------- |
| POST   | `/properties`               | upsert-by-dedup; returns existing if address+APN matches                          | Landlord |
| GET    | `/properties/{id}`          | physical-asset record (no offer data)                                             | Public   |
| GET    | `/properties/{id}/listings` | all listings (history) against this property                                      | Landlord |
| GET    | `/properties/search`        | **geo-only** search (radius/bbox); attribute search lives in `GET /listings` (§6) | Public   |

> `[assume]` `POST /properties` is dedup-aware: it normalizes the address and, if a property with
> the same `normalizedAddress + parcelApn` exists, returns it instead of creating a duplicate.
> Stale/duplicate listings are named the #1 trust failure in the ADR, so dedup is structural.

### Schema — Property

```ts
Property {
  id: string
  // Identity / dedup [D1]
  normalizedAddress: string | null // DB generated col (lowercased addr+city+state+zip); null until populated
  parcelApn: string | null         // county parcel / APN (DB `parcel_id`); null until matched
  // Address (RESO-aligned)
  addressLine1: string
  addressLine2: string | null
  city: string
  stateOrProvince: string          // DB `state`; jurisdiction limited to FL/TX/TN in MVP
  postalCode: string               // DB `zip_code`
  // NOTE: `countyOrParish` is NOT implemented on the Property model yet.
  // Geospatial (PostGIS geography) [D1]
  latitude: number | null
  longitude: number | null
  // Physical characteristics (RESO) [ADR §5 MVP display]
  // enum reflects the DB CHECK constraint (NOT the ADR's apartment/house/studio/loft set):
  propertyType: 'single_family' | 'multi_family' | 'apartment' | 'condo' | 'townhouse' | 'commercial' | 'other'
  bedroomsTotal: number | null     // DB `bedrooms`
  bathroomsTotal: number | null    // DB `bathrooms`; fractional allowed (2.5)
  livingArea: number | null        // sqft (DB `square_feet`)
  yearBuilt: number | null         // ADR §5 MVP field, new vs the previous version
  parkingFeatures: string[]        // RESO; replaces flat parkingAvailable boolean
  createdAt: string
  updatedAt: string
}
```

---

## 2. Listing — a time-bound offer [D1]

A listing is an offer against a property, carrying an intent, price, terms, lifecycle, and the
derived provenance/on-chain indicators. Free-text fields are Fair-Housing-screened (see §3/§6).

### Endpoints `[changes previous version]`

| Method | Path                             | Description                                                       | Access           |
| ------ | -------------------------------- | ----------------------------------------------------------------- | ---------------- |
| GET    | `/listings`                      | public search/list of **active** listings (filter + pagination)   | Public           |
| GET    | `/listings/landlord`             | "my listings" (scoped by `listedBy`), any state                   | Landlord         |
| GET    | `/listings/{id}`                 | listing details (offer + nested property + provenance + on-chain) | Public           |
| POST   | `/listings`                      | create a listing in `draft` (body references a `propertyId`)      | Landlord         |
| PUT    | `/listings/{id}`                 | update (partial); re-runs Fair Housing screen on text fields      | Landlord         |
| POST   | `/listings/{id}/submit`          | submit for gate review (`draft -> pending gate`)                  | Landlord         |
| PUT    | `/listings/{id}/state`           | lifecycle transition; `-> active` is **gate-guarded** (see §3)    | Landlord         |
| DELETE | `/listings/{id}`                 | withdraw (**always soft**; no hard-delete path is implemented)    | Landlord (owner) |
| GET    | `/listings/{id}/historical-data` | counts (total leases + unique-tenant views) before deletion       | Landlord         |
| POST   | `/listings/{id}/view`            | record a unique registered-tenant view (increment `views`)        | Tenant           |
| GET    | `/listings/{id}/statistics`      | listing analytics for the landlord dashboard                      | Landlord         |

> `[assume]` The previous version mounted these under `/properties/...`. Because the offer now lives on
> `Listing`, the verbs move to `/listings/...`. `POST /listings/{id}/view`, `statistics`,
> `historical-data` keep their previous-version semantics, just re-homed. `/properties/cities` is
> replaced by a facet inside `GET /listings` search (or kept as `/listings/facets`) `[assume]`.

### Schema — Listing

```ts
Listing {
  id: string
  propertyId: string               // FK -> Property (many listings : one property)
  listedBy: string                 // landlord/PM user id (was Property.landlordId)
  // Intent [D1] — MVP creates only 'rent_ltr'
  intent: 'rent_ltr' | 'rent_str' | 'sale' | 'fractional'
  // Lifecycle [D1] — replaces the previous version's flat `status`
  state: 'draft' | 'active' | 'pending' | 'leased' | 'sold' | 'withdrawn' | 'expired'
  daysOnMarket: number             // [impl] counts from createdAt (incl. draft time); no activatedAt tracked
  expiresAt: string | null         // auto-expiry; [impl] set to activation + 90 days, fixed regardless of intent
  // Offer content (Fair-Housing-screened free text) [D2 Gate 3]
  title: string                    // validated; no protected-class language
  description: string              // validated; no protected-class language
  amenities: string[]
  utilitiesIncluded: string[]
  petPolicy: string | null         // 'No Pets' | 'Cats Only' | ... (constrained, not free-text)
  availableDate: string | null     // 'YYYY-MM-DD'
  surroundingArea?: SurroundingPOI[]
  // Pricing + terms — polymorphic by intent [D1]
  terms: RentLtrTerms | RentStrTerms | SaleTerms | FractionalTerms
  // Media [D1 media pipeline] — see §5
  media: MediaRef[]
  // Provenance / authority [D2] — read-only, derived from the gate
  provenance: ListingProvenance
  // On-chain anchor [D3] — read-only. [stubbed] backend hardcodes `null`; the
  // ListingOnChain object (§4) is not populated yet.
  onChain: ListingOnChain | null
  views: number                    // unique registered tenants (unchanged semantics)
  createdAt: string
  updatedAt: string
  property?: Property               // nested in detail/search responses
}

SurroundingPOI {                    // unchanged from the previous version
  category: 'hospital' | 'school' | 'gym' | 'airport' | 'park' | 'grocery' | 'transit'
  name: string
  distanceMiles: number
  note?: string
}
```

### Polymorphic terms (keyed by `intent`) [D1]

```ts
// MVP — the only terms shape created/served at launch.
// NOTE: `terms` carries NO inner `intent` field — intent lives on the Listing.
RentLtrTerms {
  rentMonthly: number              // > 0
  securityDeposit: number          // >= 0
  leaseTermsOffered: string[]      // non-empty; '6 Months' | '1 Year' | '2 Years' | 'Month-to-Month' | 'Flexible'
  furnished: boolean
}

// Schema-ready, NOT surfaced in MVP (ADR §2.3 — Phase 3/4)
RentStrTerms   { intent: 'rent_str';   nightlyRate: number; minNights: number; /* occupancy/calendar */ }
SaleTerms      { intent: 'sale';       listPrice: number; /* closing fields */ }
FractionalTerms{ intent: 'fractional'; /* offering fields */ }
```

### Paginated list response `[changes previous version]`

Generic `PaginatedResponse<T>` (camelCase) — the field names differ from the previous version:

```ts
{
  data: Listing[]                  // current-page items (was `properties` / `listings`)
  itemCount: number                // total items across all pages (was `total`)
  pageCount: number                // total pages (was `totalPages`)
}
// The current page/size are NOT echoed in the body; they are request query
// params: `page` (default 1) + `pageSize` (default 25, max 100) — NOT `limit`. See §6.
```

### Statistics / historical-data (re-homed, same fields as the previous version)

```ts
// GET /listings/{id}/statistics
// [stubbed] `totalApplications` is hardcoded `0` — the applications domain is not
// joined into this surface yet (despite the applications endpoints existing).
{
  totalViews: number;
  totalApplications: number;
  activeLeases: number;
  monthlyRevenue: number;
  occupancyRate: number; /* % */
}

// GET /listings/{id}/historical-data
// [impl] only these three fields exist (no payments/maintenance/applications counts):
{
  totalLeases: number;
  totalViews: number;
  hasHistoricalData: boolean;
}
```

---

## 3. Provenance & authority-to-list gate [D2]

A listing **cannot transition to `active`** until all three gates pass. The gate is the trust moat
and the liability shield. `provenance` on the listing is read-only and reflects gate results.

### Gate model

```ts
ListingProvenance {
  // Gate 1 — Identity. [stubbed] backend uses a FakeKycProvider that ALWAYS
  // returns verified=true, so this gate is effectively open in MVP.
  identityVerified: boolean
  // Gate 2 — Authority (verifiability-tiered; de-weight self-report).
  // [stubbed] T2 is unreachable — only T0->T1 (document upload) is wired.
  authorityTier: 'T0' | 'T1' | 'T2'
  authorityLabel: 'Unverified' | 'Documents on file' | 'Verified owner' | 'Verified manager'
  managedByPm: boolean             // ADR-006 attribution invariant: conduct attributes to the PM
  // Gate 3 — Fair Housing advertising screen
  fairHousingCleared: boolean
  // NOTE: `fairHousingFlags` is NOT on this object. Reasons are returned by the
  // POST /fair-housing/screen endpoint, not embedded in provenance.
  // Derived UI badge (ADR §5) — "verified-lister".
  // Implemented as: identityVerified && authorityTier >= T1  (NOT {T2} as ADR intended).
  verifiedListerBadge: boolean
}
```

Authority tiers (ADR §3.1):

| Tier | Signal                                                          | User-facing label                     |
| ---- | --------------------------------------------------------------- | ------------------------------------- |
| T0   | Lister self-attests ownership/authority                         | "Unverified" (lowest, may be hidden)  |
| T1   | Deed/title doc or management agreement uploaded                 | "Documents on file"                   |
| T2   | County/title-data match (owner) **or** delegated via PMRegistry | "Verified owner" / "Verified manager" |

### Endpoints

| Method | Path                                 | Description                                                       | Access   |
| ------ | ------------------------------------ | ----------------------------------------------------------------- | -------- |
| GET    | `/listings/{id}/provenance`          | current gate status (the `ListingProvenance` object)              | Landlord |
| POST   | `/listings/{id}/authority/documents` | upload deed/title/management agreement (drives T0 -> T1)          | Landlord |
| POST   | `/listings/{id}/fair-housing/screen` | run/preview the advertising screen on current text; returns flags | Landlord |

> `[assume]` T2 source-verification (county/title-data match, PMRegistry delegation) is likely a
> backend/async job, not a synchronous endpoint. Exposed only as a result on `provenance`.
> `[stubbed]` T2 is not implemented at all yet — only `authority/documents` upload (T0->T1) exists.
> `[blocked]` The Fair Housing **blocklist + ruleset** is a CO/GC deliverable (ADR §3.2); the
> screen endpoint cannot be finalized until that ruleset exists.
> `[stubbed]` Current impl is a 14-phrase substring blocklist (`StubFairHousingScreen`) that DOES run
> and gate activation, but is explicitly **not** a real compliance control — swap before production.

### Fair Housing screen rules (ADR §3.2 — required in MVP, gating `active`)

- Constrained/validated free-text — **no protected-class language** (validation + CO-reviewable blocklist).
- **No protected-class filters anywhere in search** (see §6).
- **Audited default sort** (no steering).

---

## 4. On-chain anchor [D3 — Option B, recommended]

A minimal append-only `ListingRegistry` commits a hash, not the data. Heavy data stays off-chain
(PostgreSQL + IPFS). The backend surfaces the commitment; ingestion already exists in the indexer.

> `[stubbed]` NOT wired yet — `Listing.onChain` is hardcoded `null` in the backend. The shape below
> is the target contract; no code populates it today.

```ts
ListingOnChain {
  committed: boolean
  listingIdHash: string | null     // hash(listing id)
  payloadHash: string | null       // hash(canonical_listing_payload) — golden-snapshot serializer
  lister: string | null            // publishing wallet
  committedAt: string | null       // timestamp_ms
  // ADR §5 differentiating indicators
  provenanceOnChain: boolean       // commitment exists / tamper-evident
  settlesOnChain: boolean          // non-custodial escrow indicator (deposit wedge)
}
```

> `[depends]` Canonical serialization is mandatory (same golden-snapshot discipline as EIP-712).
> Contract shape + serializer are Alex/Halborn's call and must be frozen before audit scope-lock.
> Backend work here is: emit/consume `ListingCommitted` and expose this object (mostly indexer-side).

---

## 5. Media pipeline [D1 media]

Upload is no longer a plain put. Each image is EXIF/GPS-stripped, moderation-passed, and IPFS-pinned.

> `[stubbed]` In `feat/properties` only **moderation** is real. The EXIF/GPS stripper is a
> `NoopMetadataStripper` (metadata is **NOT** stripped) and the pinner is a `FakePinner` (returns a
> synthetic `cid`; bytes are **NOT** stored/retrievable). Wire real providers before production.

| Method | Path                                        | Description                                                | Access           |
| ------ | ------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| POST   | `/listings/{id}/media`                      | upload image(s); strips EXIF, queues moderation, pins IPFS | Landlord (owner) |
| PUT    | `/listings/{id}/media`                      | reorder / remove (array of media ids or refs)              | Landlord (owner) |
| PUT    | `/listings/{id}/media/{mediaId}/moderation` | set moderationStatus (approve/reject)                      | **Agent**        |

> `[assume → confirmed]` Moderation is **manual**: a fresh upload is `pending` and excluded from
> public reads until an **agent** approves it via the moderation endpoint above. Owner `PUT /media`
> (and other owner reads) see all statuses; public reads return `approved` only.

```ts
MediaRef {
  id: string
  url: string                      // CDN-fronted URL
  cid: string | null               // IPFS content id; null until pinned ([stubbed] synthetic — see note)
  position: number                 // ordering
  moderationStatus: 'pending' | 'approved' | 'rejected'
}
```

> `[assume]` Moderation may be async; a freshly uploaded image can be `pending` and excluded from
> public display until `approved`. `[assume]` Owner of the moderation pass (human/automated) TBD.

---

## 6. Search & Fair Housing constraints [D1 geo + D2 Gate 3]

`GET /listings` (public) over **active** listings. Geo is a first-class surface (PostGIS).

```ts
ListingSearchParams {
  // Text + geo
  search?: string                  // ilike over title + addressLine1 (NOT description fulltext)
  // Geo radius (PostGIS) — all-or-nothing trio:
  nearLat?: number
  nearLng?: number
  radiusMiles?: number             // (0, 500]
  // or bounding box — a CSV STRING, not a tuple:
  bbox?: string                    // "minLng,minLat,maxLng,maxLat"
  // Attribute filters (NON-protected-class only) — SINGLE-valued, not arrays:
  intent?: 'rent_ltr' | 'rent_str' | 'sale' | 'fractional'        // MVP: rent_ltr
  propertyType?: 'single_family' | 'multi_family' | 'apartment' | 'condo' | 'townhouse' | 'commercial' | 'other'
  minRent?: number
  maxRent?: number
  minBedrooms?: number
  maxBedrooms?: number
  petsAllowed?: boolean            // pet policy, not a protected class
  furnished?: boolean
  // NOT IMPLEMENTED yet (in the ADR/contract but absent from the code):
  //   minBathrooms, parking, amenities[], state[].
  //   Landlord views use GET /listings/landlord, not a `state` filter here.
  // Sort — audited default, no steering [D2 Gate 3]
  sortBy?: 'createdAt' | 'updatedAt' | 'availableDate' | 'rent' | 'distance'  // 'distance' needs nearLat/Lng
  sortOrder?: 'asc' | 'desc'       // default desc
  page?: number                    // default 1
  pageSize?: number                // default 25, max 100  (NOT `limit`)
}
```

Forbidden by [D2 Gate 3] — must NOT exist as filters/sorts:

- Any protected-class proxy (familial status, "adults only", religion, national origin, etc.).
- Any steering signal in the **default** sort (default sort is audited).

---

## 7. Downstream: Favorites / Applications / Viewings

These inherit the two-entity split: a tenant saves / applies to / books a viewing for a **listing**
(an offer), not the bare physical property. `propertyId` references become `listingId` (the nested
object becomes the listing, which itself nests its property).

- **Favorites** — `Favorite.listingId` (was `propertyId`); `GET /favorites` nests `listing`. `[changes previous version]`
- **Applications** — submitted against `/listings/{id}/applications`; `RentalApplication.listingId`. Personal/employment/reference fields unchanged from the previous version. Status CHECK: `pending | approved | rejected`. `[changes previous version]`
- **Viewings** — booked against `/listings/{id}/viewings`; `Viewing.listingId`. Status CHECK: `pending | confirmed | cancelled` (note: NOT approved/rejected). `[changes previous version]`

### Implemented endpoints (as built)

| Method | Path                                  | Access                                   |
| ------ | ------------------------------------- | ---------------------------------------- |
| GET    | `/favorites`                          | Tenant (nested full listings, paginated) |
| GET    | `/favorites/ids`                      | Tenant (`Uuid[]`)                        |
| POST   | `/favorites`                          | Tenant (409 on duplicate)                |
| DELETE | `/favorites/{listingId}`              | Tenant                                   |
| POST   | `/listings/{id}/applications`         | Tenant                                   |
| GET    | `/applications`                       | Tenant (own)                             |
| GET    | `/listings/{id}/applications`         | Landlord (owner)                         |
| PUT    | `/applications/{id}/status`           | Landlord (approve/reject)                |
| POST   | `/listings/{id}/viewings`             | Tenant                                   |
| GET    | `/viewings`                           | Tenant (own)                             |
| GET    | `/listings/{id}/viewings`             | Landlord (owner)                         |
| PUT    | `/listings/{id}/viewings/{viewingId}` | Landlord (owner) — confirm/cancel        |
| DELETE | `/listings/{id}/viewings/{viewingId}` | Tenant — cancel (hard delete)            |

> `[assume]` These re-homings are mechanical (path + FK rename). The application's PII fields and
> lifecycle (`pending -> approved/rejected`) are unchanged. Tenant-side qualification scoring stays
> **out of MVP display** (ADR §5).

---

## 8. Removed / forbidden (preconditions & guardrails)

- **`users.ssn_encrypted` killed** — breach-surface liability; KYC vendors (Persona/TransUnion) are
  the PII holders of record. Precondition of the ADR (separate migration). `[D0 cleanup]`
- **OpenAI-generated listing copy is not canonical** — not a hard dependency (ADR §2.3).
- **Protected-class search filters / steering** — forbidden (§6).
- **On-chain listing _state_** — out of MVP; only the D3 commitment is on-chain.

---

## 9. MVP scope vs deferred

**In MVP (gates `active`):**

- Two-entity `Property` + `Listing`, RESO-aligned, off-chain PostgreSQL + IPFS.
- `intent = rent_ltr` only (enum + polymorphic terms shipped, others dormant).
- Lifecycle state machine + auto-expiry + days-on-market.
- Provenance gate: identity (Gate 1) + authority tiers (Gate 2) + Fair Housing screen (Gate 3).
- PostGIS geo search; media EXIF-strip + moderation + IPFS.
- ADR §5 display: verified-lister badge, on-chain provenance + escrow indicators, PM reputation (confidence-banded).

**Deferred (schema-ready, surfaced Phase 3/4):**

- `rent_str` / `sale` / `fractional` intents and their terms + surfaces.
- On-chain listing _state_ (only the commitment ships, if D3-B adopted).
- Auto-population of `surroundingArea` from a maps API.
- Buy/sell — regulatory cliff; parked behind a separate brokerage-licensing ADR.

---

## 10. Open questions & engineering assumptions

- **Ratification.** ADR-007 is `Draft`. Does it take priority over the previous version (the contract C1-C6
  were built on)? This determines whether C1-C6 (single-entity) get reworked. `[blocked-on-product]`
- **Dedup authority for `parcelApn`.** Source of the county parcel/APN match for T2 — provider? `[assume]`
- **Fair Housing ruleset owner.** CO/GC must supply the blocklist + screen rules before Gate 3 ships. `[blocked]`
- **PMRegistry availability.** T2 "delegated authority via PMRegistry (PM)" assumes the CO-controlled
  PMRegistry exists in Phase 1 (ADR §3.1). Confirm timing. `[assume]`
- **ListingRegistry timing.** Backend depends on Alex's frozen contract + canonical serializer; ships
  in MVP or as a fast-follow? `[depends]`
- **Reputation surface.** "newly verified" confidence-band, not a precise score (defamation exposure
  per ADR-005/006). Exact banding TBD. `[assume]`
- **`occupancyRate` formula.** RESOLVED in code: lister-portfolio occupancy = active-leased / total
  properties × 100 (`calculate_occupancy_rate`). `[resolved]`
- **View dedup.** Resolved in current plan: unique **registered tenant** = one view (carry forward).
