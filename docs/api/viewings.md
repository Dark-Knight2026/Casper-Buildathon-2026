# Viewings API

Endpoints for booking and managing in-person viewings of a listing. A tenant books a viewing against an active listing (born `pending`), the lister then confirms or cancels it: lifecycle `pending -> confirmed/cancelled`. Tenant-facing routes live under `/api/v1/viewings` and `/api/v1/listings/{id}/viewings`; landlord-facing routes share the same `/api/v1/listings/{id}/viewings` paths, distinguished by HTTP method and role.

## BookViewingRequest schema

Body of `POST /api/v1/listings/{id}/viewings` (camelCase wire names):

```json
{
  "viewingDate": "2026-07-01",
  "viewingTime": "14:00"
}
```

- `viewingDate` is a `YYYY-MM-DD` date.
- `viewingTime` is a free-form string (e.g. `"14:00"`); it is trimmed and must be non-empty.

## UpdateViewingStatusRequest schema

Body of `PUT /api/v1/listings/{id}/viewings/{viewingId}` - the lister's decision:

```json
{
  "status": "confirmed"
}
```

- `status` must be `confirmed` or `cancelled`. `pending` is rejected (a review can only confirm or cancel).

## Viewing schema

The viewing booking as returned on the wire (camelCase). The nested `listing` is the full [`Listing`](./listings.md) object and is only present in `GET /api/v1/viewings`; it is omitted from every other response:

```json
{
  "id": "uuid",
  "listingId": "uuid",
  "userId": "uuid",
  "landlordId": "uuid",
  "viewingDate": "2026-07-01",
  "viewingTime": "14:00",
  "status": "pending|confirmed|cancelled",
  "listing": { "...": "full Listing object; omitted unless nested" },
  "createdAt": "2026-06-24T10:30:00Z",
  "updatedAt": "2026-06-24T10:30:00Z"
}
```

- `userId` is the booking tenant; `landlordId` is the reviewing landlord, denormalized from the listing at booking time.
- `listing` is `null`/omitted when the targeted listing has since been withdrawn (a booking outlives its listing).

## POST `/api/v1/listings/{id}/viewings`

- **Input:** `BookViewingRequest` (`{ "viewingDate", "viewingTime" }`).
- **Response (201):** the created `Viewing`, in `pending` status. The nested `listing` is NOT included (omitted).
- **Behavior:** books a viewing against the active listing `{id}` in one atomic `INSERT ... SELECT`. `landlordId` is denormalized from the listing's lister. The active-listing gate (`state = 'active'`, not soft-deleted) lives in the insert's `WHERE`, so a missing/inactive/withdrawn listing inserts nothing and yields 404 with no check-then-insert window.
- **Errors:** 400 (blank `viewingTime`), 401, 403 (tenant role required), 404 (no active listing with that id), 500
- **Auth:** Access cookie required; tenant role.

## GET `/api/v1/viewings`

- **Input:** `Pagination` query params (`page`, `pageSize`).
- **Response (200):** `PaginatedResponse<Viewing>` - the caller's own bookings, newest first. Each entry nests its full `listing` (`null` if that listing was since withdrawn).
- **Behavior:** scoped to the caller's `userId`. The total count and the returned page are read in one `REPEATABLE READ` snapshot so they cannot disagree under concurrent bookings; nested listings are hydrated afterwards by listing id.
- **Errors:** 401, 403 (tenant role required), 500
- **Auth:** Access cookie required; tenant role.

## GET `/api/v1/listings/{id}/viewings`

- **Input:** `Pagination` query params (`page`, `pageSize`).
- **Response (200):** `PaginatedResponse<Viewing>` - the bookings made against listing `{id}`, newest first. No nested `listing` (the landlord already holds it).
- **Behavior:** the caller's ownership of the listing is asserted first; the read is then scoped by `listingId` only. Total count and page share one `REPEATABLE READ` snapshot.
- **Errors:** 401, 403 (not the lister), 404 (listing not found), 500
- **Auth:** Access cookie required; landlord role.

## DELETE `/api/v1/listings/{id}/viewings/{viewingId}`

- **Input:** none (path params only).
- **Response (204):** empty body; the booking is hard-deleted.
- **Behavior:** cancels the caller's own booking. The delete is scoped by the caller's `userId` (the owner check) plus `listingId`/`viewingId`, so it can only ever touch the caller's own booking. If no matching booking exists for this tenant under that listing, nothing is deleted and the handler answers 404.
- **Errors:** 401, 403 (tenant role required), 404 (no such booking), 500
- **Auth:** Access cookie required; tenant role.

## PUT `/api/v1/listings/{id}/viewings/{viewingId}`

- **Input:** `UpdateViewingStatusRequest` (`{ "status": "confirmed" | "cancelled" }`).
- **Response (200):** the updated `Viewing`, moved from `pending` to `confirmed` or `cancelled`. The nested `listing` is NOT included (omitted).
- **Behavior:** confirms or rejects a booking on a listing the caller owns. The target status is validated first (`pending` is rejected as 400), then the caller's ownership of the listing is asserted. The transition is atomic: a `SELECT ... FOR UPDATE` locks the row so the pending-state check and the write share one snapshot. A booking not under the given listing is 404; an already-decided (non-`pending`) booking is 409.
- **Errors:** 400 (target status is `pending`/not a decision), 401, 403 (not the lister), 404 (listing or viewing not found), 409 (viewing is not pending), 500
- **Auth:** Access cookie required; landlord role.
