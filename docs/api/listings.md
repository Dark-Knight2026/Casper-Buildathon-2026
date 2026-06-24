# Listings API

Endpoints under `/api/v1/listings` for the core listing lifecycle: a listing is a time-bound offer against a physical property that moves `draft -> pending -> active -> leased/sold`. A draft is created off the public search, submitted for review (`pending`), and published (`-> active`) only once the authority gate clears. Withdrawal is a soft delete (`state = 'withdrawn'`, `deleted_at` stamped) that preserves historical data; `expired` is driven by the days-on-market worker. The authority/provenance and media sub-resources that clear the activation gate are documented separately.

## Listing schema

Returned by the detail, create, update, submit, and state-change endpoints, and as each item of the search / landlord lists. The nested `property` is present in detail and list responses; `media` is approved-only in public reads. Wire names are `camelCase`; `onChain` is always `null` in the hackathon.

```json
{
  "id": "uuid",
  "propertyId": "uuid",
  "listedBy": "uuid",
  "intent": "rent_ltr",
  "state": "draft|active|pending|leased|sold|withdrawn|expired",
  "daysOnMarket": 0,
  "expiresAt": "2026-09-22T10:30:00Z",
  "title": "Sunny 2BR near the park",
  "description": "...",
  "amenities": ["pool", "gym"],
  "utilitiesIncluded": ["water", "trash"],
  "petPolicy": "Cats OK",
  "availableDate": "2026-07-01",
  "surroundingArea": [],
  "terms": {
    "rentMonthly": 2400.0,
    "securityDeposit": 2400.0,
    "leaseTermsOffered": ["1 Year", "Month-to-Month"],
    "furnished": false
  },
  "views": 12,
  "provenance": {
    "identityVerified": false,
    "authorityTier": "T0",
    "authorityLabel": "Unverified",
    "managedByPm": false,
    "fairHousingCleared": true,
    "verifiedListerBadge": false
  },
  "onChain": null,
  "media": [
    {
      "id": "uuid",
      "url": "https://...",
      "cid": "bafy...",
      "position": 0,
      "moderationStatus": "approved"
    }
  ],
  "property": {
    "id": "uuid",
    "normalizedAddress": "123 MAIN ST, SPRINGFIELD IL 62704",
    "parcelApn": null,
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4",
    "city": "Springfield",
    "stateOrProvince": "IL",
    "postalCode": "62704",
    "latitude": 39.78,
    "longitude": -89.65,
    "propertyType": "single_family",
    "bedroomsTotal": 2,
    "bathroomsTotal": 1.5,
    "livingArea": 980,
    "yearBuilt": 1998,
    "parkingFeatures": ["Garage"],
    "metadataUri": null,
    "onchainPropertyId": null,
    "registrationTxHash": null,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-04-22T14:22:01Z"
  },
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-04-22T14:22:01Z"
}
```

`provenance` is a read-only view derived from the listing's gate columns:

- `authorityTier` is `T0` (self-attested), `T1` (documents on file), or `T2` (source-verified, deferred).
- `authorityLabel` is the human label for the tier (`Unverified`, `Documents on file`, `Verified owner` / `Verified manager`).
- `verifiedListerBadge` is `true` when identity is verified AND the tier is at least `T1`.

## CreateListingRequest schema

Body for `POST /api/v1/listings`. Always produces a `rent_ltr` draft at MVP. `description`, `amenities`, `utilitiesIncluded`, `petPolicy`, `availableDate`, and `surroundingArea` are optional; `terms` is required.

```json
{
  "propertyId": "uuid",
  "title": "Sunny 2BR near the park",
  "description": "...",
  "amenities": ["pool", "gym"],
  "utilitiesIncluded": ["water"],
  "petPolicy": "Cats OK",
  "availableDate": "2026-07-01",
  "surroundingArea": [],
  "terms": {
    "rentMonthly": 2400.0,
    "securityDeposit": 2400.0,
    "leaseTermsOffered": ["1 Year"],
    "furnished": false
  }
}
```

## UpdateListingRequest schema

Body for `PUT /api/v1/listings/{id}`. Every field is optional; an absent field keeps the stored value. `terms`, when present, replaces the whole terms object.

```json
{
  "title": "Updated title",
  "description": "...",
  "amenities": ["pool"],
  "utilitiesIncluded": ["water", "gas"],
  "petPolicy": "No Pets",
  "availableDate": "2026-08-01",
  "surroundingArea": [],
  "terms": {
    "rentMonthly": 2500.0,
    "securityDeposit": 2500.0,
    "leaseTermsOffered": ["1 Year"],
    "furnished": true
  }
}
```

## UpdateStateRequest schema

Body for `PUT /api/v1/listings/{id}/state`. Only forward transitions are accepted; `withdrawn`/`expired` are not settable here.

```json
{ "state": "active" }
```

## ViewResponse schema

Returned by `POST /api/v1/listings/{id}/view`.

```json
{ "views": 13, "counted": true }
```

## ListingStatistics schema

Returned by `GET /api/v1/listings/{id}/statistics`. Lease-derived metrics are scoped to the listing's physical property; `occupancyRate` is the lister's portfolio occupancy.

```json
{
  "totalViews": 42,
  "totalApplications": 0,
  "activeLeases": 1,
  "monthlyRevenue": 2400.0,
  "occupancyRate": 75.0
}
```

`totalApplications` is always `0` - the applications domain is not wired into this surface yet.

## ListingHistoricalData schema

Returned by `GET /api/v1/listings/{id}/historical-data`.

```json
{
  "totalLeases": 3,
  "totalViews": 42,
  "hasHistoricalData": true
}
```

## GET `/api/v1/listings`

- **Input:** query params (all optional): `search`, `nearLat` / `nearLng` / `radiusMiles` (all three together; radius in `(0, 500]`), `bbox` (`minLng,minLat,maxLng,maxLat`), `intent`, `propertyType`, `minRent`, `maxRent`, `minBedrooms`, `maxBedrooms`, `minBathrooms`, `minLivingArea`, `maxLivingArea`, `petsAllowed`, `furnished`, `amenities` (comma-separated, listing must have all of them), `sortBy` (`createdAt|updatedAt|availableDate|rent|views|distance`), `sortOrder` (`asc|desc`, default `desc`), plus `Pagination` (`page`, `pageSize`).
- **Response (200):** `PaginatedResponse<Listing>` over active listings only; each item nests its property and approved media.
- **Behavior:** active state only. `sortBy=distance` requires a radius center (`nearLat`/`nearLng`), else 400. The `amenities` filter is Fair-Housing screened before the query runs - a filter that smuggles protected-class language (e.g. `no children`) is rejected 400. No protected-class filters are exposed.
- **Errors:** 400 (partial/out-of-range radius, malformed `bbox`, `distance` sort without a center, unknown sort key, prohibited amenity language), 500
- **Auth:** Public (no auth)

## GET `/api/v1/listings/{id}`

- **Input:** path `id` (listing UUID)
- **Response (200):** `Listing` detail - the offer, its nested physical `property`, approved `media`, and derived `provenance`. `onChain` is always `null`.
- **Behavior:** resolves any non-deleted listing regardless of lifecycle state.
- **Errors:** 404 (no live listing has that id), 500
- **Auth:** Public (no auth)

## GET `/api/v1/listings/landlord`

- **Input:** query params (all optional): `state` (comma-separated lifecycle states, e.g. `state=draft,active`; absent lists every state), `city` (case-insensitive match on the property's city), `hasParking`, `sortBy` (`distance` is not available here), `sortOrder` (default `desc`), plus `Pagination`.
- **Response (200):** `PaginatedResponse<Listing>` over the caller's own listings. The landlord sees their own media regardless of moderation status.
- **Errors:** 400 (unknown `state` token, `sortBy=distance`), 401, 403 (landlord role required), 500
- **Auth:** Access cookie required, landlord role

## POST `/api/v1/listings`

- **Input:** `CreateListingRequest`
- **Response (201):** the created `Listing` in `draft` state, owned by the caller, with its nested property and empty media.
- **Behavior:** the referenced `propertyId` must exist (else 404). The title + description are run through the Fair Housing screen on create, stamping `fairHousingCleared`. Always `rent_ltr` at MVP.
- **Errors:** 400 (empty title, over-long text, invalid terms), 401, 403 (landlord role required), 404 (property not found), 500
- **Auth:** Access cookie required, landlord role

## PUT `/api/v1/listings/{id}`

- **Input:** path `id`; body `UpdateListingRequest` (any subset of fields)
- **Response (200):** the updated `Listing`.
- **Behavior:** partial update of a listing the caller owns. When the title or description changes, the Fair Housing text screen re-runs and restamps `fairHousingCleared`. The owner check and write run under one row lock (no TOCTOU window).
- **Errors:** 400 (invalid input), 401, 403 (not the lister), 404 (listing not found), 500
- **Auth:** Access cookie required, landlord role

## DELETE `/api/v1/listings/{id}`

- **Input:** path `id`
- **Response (204):** empty body.
- **Behavior:** soft-withdraws a listing the caller owns - sets `state = 'withdrawn'` and stamps `deleted_at`. Always a soft delete, to preserve historical data; the listing drops out of public reads.
- **Errors:** 401, 403 (not the lister), 404 (listing not found), 500
- **Auth:** Access cookie required, landlord role

## POST `/api/v1/listings/{id}/submit`

- **Input:** path `id`
- **Response (200):** the submitted `Listing` in `pending` state.
- **Behavior:** submits a `draft` for review (`draft -> pending`). `pending` is the pre-publish holding state where the authority gate runs before activation. Owner-scoped and atomic under a row lock.
- **Errors:** 401, 403 (not the lister), 404 (listing not found), 409 (not in a submittable state), 500
- **Auth:** Access cookie required, landlord role

## PUT `/api/v1/listings/{id}/state`

- **Input:** path `id`; body `UpdateStateRequest`
- **Response (200):** the transitioned `Listing`.
- **Behavior:** drives a listing the caller owns through a forward lifecycle transition. Legal transitions only (`pending -> active|draft`, `active -> leased|sold|draft`); `withdrawn`/`expired` are not settable here. The `-> active` (publish) transition is authority-gate-guarded: it requires a verified identity (KYC), authority tier `T1+` (documents on file), and a cleared Fair Housing screen, checked in that order under the row lock. The gate-clearing sub-resources (identity verification, authority documents, Fair Housing screen) live in the separate provenance/media documentation. A successful activation stamps `identityVerified` and a fresh 90-day expiry window.
- **Errors:** 401, 403 (not the lister), 404 (listing not found), 409 (illegal transition, or unsatisfied activation gate), 500
- **Auth:** Access cookie required, landlord role

## POST `/api/v1/listings/{id}/view`

- **Input:** path `id`
- **Response (200):** `ViewResponse`.
- **Behavior:** records a unique-tenant view of an active listing. Idempotent per tenant - the `views` counter increments only on a tenant's first view; a repeat call returns the current count with `counted = false`. The event insert and counter bump are atomic (one CTE), so they can never disagree.
- **Errors:** 401, 403 (tenant role required), 404 (no active listing has that id), 500
- **Auth:** Access cookie required, tenant role

## GET `/api/v1/listings/{id}/statistics`

- **Input:** path `id`
- **Response (200):** `ListingStatistics`.
- **Behavior:** performance snapshot for a listing the caller owns - views, applications (always `0`), active leases on the property, monthly revenue, and lister portfolio occupancy. A listing the caller does not own reads as 404 (no leak of a foreign listing's existence).
- **Errors:** 401, 403 (landlord role required), 404 (caller owns no live listing with that id), 500
- **Auth:** Access cookie required, landlord role

## GET `/api/v1/listings/{id}/historical-data`

- **Input:** path `id`
- **Response (200):** `ListingHistoricalData`.
- **Behavior:** historical-activity summary for a listing the caller owns - lease and view counts plus whether any history exists. A listing the caller does not own reads as 404.
- **Errors:** 401, 403 (landlord role required), 404 (caller owns no live listing with that id), 500
- **Auth:** Access cookie required, landlord role
