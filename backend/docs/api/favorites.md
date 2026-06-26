# Favorites API

Endpoints under `/api/v1/favorites` for a tenant's saved listings. Every endpoint is tenant-scoped: the caller can only read and mutate its own saves, and each handler self-gates on the `Tenant` role.

## FavoriteResponse schema

A saved listing with the full listing it targets. The favorite itself carries only the timestamp; the listing is nested whole (and in turn nests its physical property and approved media), per the ADR-007 two-entity contract:

```json
{
  "listingId": "uuid",
  "favoritedAt": "2026-04-22T14:22:01Z",
  "listing": {
    "id": "uuid",
    "propertyId": "uuid",
    "listedBy": "uuid",
    "intent": "...",
    "state": "...",
    "title": "...",
    "description": "...",
    "media": [],
    "property": {},
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-04-22T14:22:01Z"
  }
}
```

`GET /api/v1/favorites` returns these inside a paginated envelope (`{ "items": [FavoriteResponse], "total", "page", "page_size", ... }`).

## Listing ids schema

`GET /api/v1/favorites/ids` returns a bare JSON array of listing UUIDs (newest first), with no envelope:

```json
["uuid", "uuid", "uuid"]
```

## GET `/api/v1/favorites`

- **Input:** `Pagination` query params (`page`, `page_size`).
- **Response (200):** `PaginatedResponse<FavoriteResponse>` - the tenant's saved listings, newest first. Each entry nests the full live listing it points to (with its property and approved media).
- **Behavior:** count and page are read in one `REPEATABLE READ` snapshot, so the total and the returned page cannot disagree under concurrent saves/withdrawals. Favorites whose listing is no longer live (soft-withdrawn) are dropped by the join, so the count and the page agree on the live set only.
- **Errors:** 401 (unauthorized), 403 (Tenant role required), 500
- **Auth:** Access cookie required (Tenant role)

## GET `/api/v1/favorites/ids`

- **Input:** none
- **Response (200):** `Vec<Uuid>` - a bare array of the listing ids the caller has favorited, newest first. A lightweight feed for marking "favorited" state on listing cards without hydrating each one.
- **Behavior:** live listings only - ids whose listing is soft-withdrawn are dropped by the join. No pagination; the full id set is returned.
- **Errors:** 401 (unauthorized), 403 (Tenant role required), 500
- **Auth:** Access cookie required (Tenant role)

## POST `/api/v1/favorites`

- **Input:** `{ "listingId": "uuid" }`
- **Response (201):** the saved `FavoriteResponse`, with the listing hydrated whole.
- **Behavior:** idempotent save backed by the `(user_id, listing_id)` composite key. A single CTE gates on the listing being live, inserts with `ON CONFLICT DO NOTHING`, and reports back in one round trip both whether the listing exists and the inserted timestamp - mapping the three cases to 201 / 409 / 404. A second save of the same listing is therefore a 409 rather than a silent re-create. After the insert the listing is re-read to build the response; a concurrent withdraw between insert and read surfaces as 404 rather than fabricating an empty listing.
- **Errors:** 401 (unauthorized), 403 (Tenant role required), 404 (no live listing has that id), 409 (already favorited), 500
- **Auth:** Access cookie required (Tenant role)

## DELETE `/api/v1/favorites/{listingId}`

- **Input:** `listingId` path param (the favorited listing id).
- **Response (204):** empty body.
- **Behavior:** the delete is scoped by the caller's user id, so it can only ever touch the caller's own save. A delete that removes no row (the listing was not favorited) returns 404 rather than a misleading 204.
- **Errors:** 401 (unauthorized), 403 (Tenant role required), 404 (favorite not found), 500
- **Auth:** Access cookie required (Tenant role)
