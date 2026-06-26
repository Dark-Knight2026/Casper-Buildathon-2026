# Properties API

Endpoints under `/api/v1/properties` for creating, editing, reading, and searching the physical-asset (RESO-aligned) property records that listings are made against. Wire field names are camelCase; the underlying DB keeps the legacy 2023 column names.

## Property schema

The physical-asset record. Returned by create, update, detail, search, and the registration endpoint:

```json
{
  "id": "uuid",
  "normalizedAddress": "123 MAIN ST, SPRINGFIELD, IL 62704",
  "parcelApn": "14-21-301-001",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "city": "Springfield",
  "stateOrProvince": "IL",
  "postalCode": "62704",
  "latitude": 39.7817,
  "longitude": -89.6501,
  "propertyType": "single_family|multi_family|apartment|condo|townhouse|commercial|other",
  "bedroomsTotal": 3,
  "bathroomsTotal": 2.5,
  "livingArea": 1850,
  "yearBuilt": 1998,
  "parkingFeatures": ["Garage", "Driveway"],
  "metadataUri": "ipfs://bafy...",
  "onchainPropertyId": "42",
  "registrationTxHash": "a1b2c3...",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-04-22T14:22:01Z"
}
```

`normalizedAddress`, `parcelApn`, `latitude`, `longitude`, `bedroomsTotal`, `bathroomsTotal`, `livingArea`, `yearBuilt`, `metadataUri`, `onchainPropertyId`, and `registrationTxHash` are nullable. `metadataUri` is the off-chain pointer pinned on create/edit; `onchainPropertyId` is written by the indexer once on-chain registration is observed; `registrationTxHash` is set by the landlord via `PATCH /registration`.

## PropertyListingSummary schema

One entry in a property's offer history, returned inside the `GET /{id}/listings` page:

```json
{
  "id": "uuid",
  "intent": "rent_ltr",
  "state": "active",
  "title": "Cozy 3BR near downtown",
  "daysOnMarket": 12,
  "expiresAt": "2026-07-01T00:00:00Z",
  "views": 134,
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-04-22T14:22:01Z"
}
```

`expiresAt` is nullable.

## PaginatedResponse schema

Wrapper for paginated endpoints (`GET /{id}/listings`, `GET /search`):

```json
{
  "itemCount": 42,
  "pageCount": 2,
  "data": [ /* array of the page's items */ ]
}
```

Page selection is via the `page` (1-based, default 1) and `pageSize` (default 25, clamped to 1-100) query parameters.

## CreatePropertyRequest schema

```json
{
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "city": "Springfield",
  "stateOrProvince": "IL",
  "postalCode": "62704",
  "propertyType": "single_family",
  "latitude": 39.7817,
  "longitude": -89.6501,
  "bedroomsTotal": 3,
  "bathroomsTotal": 2.5,
  "livingArea": 1850,
  "yearBuilt": 1998,
  "parkingFeatures": ["Garage", "Driveway"],
  "parcelApn": "14-21-301-001"
}
```

`addressLine1`, `city`, `stateOrProvince`, `postalCode`, and `propertyType` are required; the rest are optional. `UpdatePropertyRequest` has the identical shape with every field optional.

## SetRegistrationTxRequest schema

```json
{
  "txHash": "a1b2c3..."
}
```

## POST `/api/v1/properties`

- **Input:** `CreatePropertyRequest`
- **Response (201):** `Property` - a new property was created.
- **Response (200):** `Property` - the address/parcel fingerprint matched an existing physical asset, so the stored row is returned instead of a duplicate.
- **Behavior:** dedup-aware upsert. A DB `BEFORE` trigger computes an address/parcel fingerprint; a second create of the same real-world property collapses onto the existing row (200) rather than inserting a duplicate (201). The row is committed atomically with its pinned off-chain `metadataUri`, so a failed pin never leaves a property without a metadata pointer.
- **Errors:** 400 (empty required field, over-long value, coordinate out of range, negative numeric attribute, or unknown `propertyType`), 401, 403 (landlord role required), 500
- **Auth:** Landlord role; access cookie required

## PUT `/api/v1/properties/{id}`

- **Input:** `UpdatePropertyRequest` (any subset; an omitted field keeps its stored value)
- **Response (200):** updated `Property`
- **Behavior:** owner-scoped edit. Only the supplied fields change. Because a physical-asset edit invalidates a listing's authority, every live (`active`) and submitted (`pending`) offer for this property drops back to `draft` and its authority gate resets (`authority_tier` -> `T0`, identity and Fair Housing cleared), so the lister must re-clear the gate before republishing. The edit re-pins the metadata pointer.
- **Errors:** 400 (invalid input), 401, 403 (not the property owner), 404 (property not found), 409 (edited address matches another property's fingerprint), 500
- **Auth:** Landlord role; access cookie required

## GET `/api/v1/properties/{id}`

- **Response (200):** `Property` - the physical-asset record only (no offer data)
- **Errors:** 404 (no live property with that id), 500
- **Auth:** Public

## GET `/api/v1/properties/{id}/listings`

- **Input:** path `id`; query `page`/`pageSize` (pagination)
- **Response (200):** `PaginatedResponse<PropertyListingSummary>` - a page of the property's offer history, newest first, plus the full `itemCount`/`pageCount`.
- **Behavior:** owner-scoped to the property's landlord. Soft-deleted listings are excluded. The page slice and total count are read in one transaction so they share a snapshot.
- **Errors:** 401, 403 (not the property owner), 404 (property not found), 500
- **Auth:** Landlord role; access cookie required

## GET `/api/v1/properties/search`

- **Input:** query geo params + `page`/`pageSize`:
  - **Radius mode:** `nearLat` + `nearLng` + `radiusMiles` - all three required together; `radiusMiles` in `(0, 500]`.
  - **Bounding box:** `bbox=minLng,minLat,maxLng,maxLat`.
  - Both modes may combine (AND); supplying neither lists all properties.
- **Response (200):** `PaginatedResponse<Property>`
- **Behavior:** public geo + paginated search. With a radius center, results are ordered by true spherical distance (nearest first); otherwise newest first. Properties without coordinates drop out of any geo filter. Soft-deleted rows are excluded.
- **Errors:** 400 (partial radius trio, coordinate or radius out of range, or malformed `bbox`), 500
- **Auth:** Public

## PATCH `/api/v1/properties/{id}/registration`

- **Input:** `SetRegistrationTxRequest` - the Casper deploy hash of the on-chain registration call
- **Response (200):** updated `Property` with `registrationTxHash` set
- **Behavior:** owner-scoped and write-once. The caller must be the property's landlord, and the column must currently be null; a `SELECT ... FOR UPDATE` serializes the null-check and the write. `txHash` is trimmed and must be non-empty.
- **Errors:** 400 (blank `txHash`), 401, 403 (landlord role required), 404 (property not found or caller is not its owner), 409 (registration hash already set), 500
- **Auth:** Landlord role; access cookie required
