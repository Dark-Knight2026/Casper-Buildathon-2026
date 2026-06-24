# Listing Provenance & Media API

Sub-resources under `/api/v1/listings/{id}/...` that clear the authority-to-list gate and manage a listing's media. Provenance, authority-document upload, the Fair Housing screen, and media reorder/remove are owner-scoped (Landlord role, must be the lister); media moderation is the platform's call (Agent role). Only `approved` media is shown in public reads; the lister sees their own media at any moderation status.

## ListingProvenance schema

Read-only badge derived from the listing's gate columns (ADR-007 §3). Returned by `GET /provenance`, and embedded in the `AuthorityDocumentResponse` and in every `Listing` (`listing.provenance`):

```json
{
  "identityVerified": false,
  "authorityTier": "T0",
  "authorityLabel": "Unverified",
  "managedByPm": false,
  "fairHousingCleared": true,
  "verifiedListerBadge": false
}
```

- `authorityTier` is one of `T0` (self-attested), `T1` (documents on file), `T2` (source-verified; deferred in the hackathon). The wire form keeps the uppercase `T0`/`T1`/`T2`, not snake_case.
- `authorityLabel` is derived from the tier: `Unverified` (T0), `Documents on file` (T1), `Verified manager` (T2 when `managedByPm`), `Verified owner` (T2 otherwise).
- `verifiedListerBadge` is `true` only when `identityVerified` AND tier is at least `T1`.

## AuthorityDocumentResponse schema

Returned (201) by `POST /authority/documents`:

```json
{
  "id": "uuid",
  "documentType": "deed",
  "url": "https://...",
  "uploadedAt": "2026-06-24T10:30:00Z",
  "provenance": { "...": "ListingProvenance after this upload" }
}
```

`documentType` is one of `deed`, `title`, `management_agreement`. `provenance` reflects the post-upload gate state (the authority tier may have risen to `T1`).

## FairHousingScreenResponse schema

Returned (200) by `POST /fair-housing/screen`:

```json
{
  "cleared": true,
  "flags": []
}
```

`flags` lists the reasons the text was flagged, for landlord remediation; it is empty when `cleared` is `true`.

## MediaRef schema

A media item attached to a listing. Returned (201) by `POST /media`, and as an array by `PUT /media` and (singly, 200) by the moderation endpoint:

```json
{
  "id": "uuid",
  "url": "https://...",
  "cid": "bafy...",
  "position": 0,
  "moderationStatus": "approved"
}
```

`cid` is the IPFS content id and is `null` until pinned. `moderationStatus` is one of `pending`, `approved`, `rejected`.

## POST `/api/v1/listings/{id}/authority/documents`

- **Input:** `multipart/form-data` with a `file` field (PDF / PNG / JPEG, max 10 MB) and a `documentType` text field (`deed` | `title` | `management_agreement`, trimmed before parsing).
- **Response (201):** `AuthorityDocumentResponse` - the stored document plus the post-upload `provenance`.
- **Behavior:**
  - **MIME whitelist + magic-byte sniff.** The bytes are sniffed by magic number (`%PDF`, the 8-byte PNG signature, or the `FF D8 FF` JPEG marker); anything off the whitelist is rejected with 415. If the client also sent a `Content-Type` (with any RFC 2045 parameters after `;` stripped), it must agree with the sniffed bytes - claiming `application/pdf` while sending other bytes is 415. A header alone is never trusted.
  - **Authorize-before-store.** Ownership is checked before the blob is written, so a non-owner cannot leave an orphan blob behind a 403. The DB write then re-checks ownership under a `SELECT ... FOR UPDATE` row lock to close the TOCTOU window.
  - **Tier lift (T0 -> T1).** The bump is monotonic: a `T0` listing rises to `T1` ("documents on file"); an already-higher tier is left untouched. A `management_agreement` additionally sets `managedByPm` (it is only ever set, never cleared); `deed`/`title` prove ownership and do not touch PM attribution.
  - **Storage layout:** `listings/{id}/authority/{uuid}.{ext}`.
- **Errors:** 400 (missing/malformed `file` or `documentType` field), 401, 403 (not the lister), 404 (listing not found), 413 (over 10 MB - covered both by the multipart stream limit and the in-handler size check), 415 (off-whitelist bytes or declared-MIME/byte mismatch), 500 (storage/database error).
- **Auth:** Access cookie required; Landlord role.

## GET `/api/v1/listings/{id}/provenance`

- **Response (200):** `ListingProvenance` - the current authority-gate status for a listing the caller owns (identity, authority tier + label, PM attribution, Fair Housing, and the derived verified-lister badge).
- **Behavior:** owner-scoped. A listing the caller does not own (or one that does not exist) reads as 404 - a foreign listing's existence is not leaked.
- **Errors:** 401, 403 (Landlord role required), 404 (listing not found), 500.
- **Auth:** Access cookie required; Landlord role.

## POST `/api/v1/listings/{id}/fair-housing/screen`

- **Response (200):** `FairHousingScreenResponse` - the verdict plus any flags for remediation.
- **Behavior:** loads the owned listing's title + description, runs them through the bound Fair Housing advertising screen, and restamps the listing's `fairHousingCleared` column with the verdict before returning. A backend screen failure maps to 500.
- **Errors:** 401, 403 (Landlord role required), 404 (caller owns no live listing with that id), 500.
- **Auth:** Access cookie required; Landlord role.

## POST `/api/v1/listings/{id}/media`

- **Input:** `multipart/form-data` with a single `file` field (PNG / JPEG / WebP, max 10 MB).
- **Response (201):** `MediaRef` for the stored item.
- **Behavior:**
  - **MIME whitelist + magic-byte sniff.** The bytes are sniffed by magic number against PNG, JPEG, and WebP (the WebP check requires the 12-byte composite: a `RIFF` prefix AND the trailing `WEBP` tag, so a bare `RIFF` header is rejected). Anything off the whitelist is 415. If the client sent a `Content-Type` (RFC 2045 parameters stripped), it must agree with the sniffed bytes, else 415. Blocks MIME-spoofing where a client uploads an executable under an image MIME header.
  - **Authorize-before-store.** Ownership is checked before any byte leaves the process, so a non-owner cannot leave an orphan blob.
  - **Metadata strip.** EXIF/GPS metadata is stripped before storage AND pinning, so both the stored blob and the IPFS CID are of the sanitized content.
  - **Content-pin.** The clean bytes are stored via `MediaStorage` (key `listings/{id}/media/{uuid}.{ext}`) and pinned via `ContentPinner`, which yields the returned `cid`.
  - **Moderation state.** A newly uploaded item is auto-approved (hackathon shortcut), so it is publicly visible immediately; an Agent may still `reject` it post-hoc via the moderation endpoint. Position is the next free slot (appended after existing media).
- **Errors:** 400 (missing/malformed `file` field), 401, 403 (not the lister), 404 (listing not found), 413 (over 10 MB - multipart stream limit and in-handler size check), 415 (off-whitelist bytes or declared-MIME/byte mismatch), 500 (storage/pin/database error).
- **Auth:** Access cookie required; Landlord role.

## PUT `/api/v1/listings/{id}/media`

- **Input:** `MediaReorderRequest` - `{ "order"?: ["uuid", ...], "remove"?: ["uuid", ...] }`. Both fields are optional and independent.
- **Response (200):** `Vec<MediaRef>` - the listing's full media set at any moderation status (the owner's own view), ordered for display.
- **Behavior:** ownership is asserted first. Then `remove` runs before `order`: removal deletes the matching rows and best-effort deletes their stored blobs (a storage hiccup only leaves an orphan, since the row is already gone, not a dangling reference); reorder sets each listed id's position to its index in `order`. Ids that are not media of this listing are ignored in both operations.
- **Errors:** 401, 403 (not the lister), 404 (listing not found), 500.
- **Auth:** Access cookie required; Landlord role.

## PUT `/api/v1/listings/{id}/media/{mediaId}/moderation`

- **Input:** `MediaModerationRequest` - `{ "moderationStatus": "approved" | "rejected" }` (`pending` resets the item).
- **Response (200):** the updated `MediaRef`.
- **Behavior:** the platform's moderation decision, not the lister's - hence the Agent role rather than ownership. Only `approved` media is shown in public reads (search and listing detail); the lister still sees their own media at any status. The update is scoped to `listing_id` so the `{id}`/`{mediaId}` path pair must be consistent.
- **Errors:** 401, 403 (Agent role required), 404 (no such media under that listing), 500.
- **Auth:** Access cookie required; Agent role.
