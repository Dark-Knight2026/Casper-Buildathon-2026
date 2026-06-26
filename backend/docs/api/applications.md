# Applications API

Two-sided rental-application flow: a tenant submits an application against an active listing, and that listing's landlord (denormalized onto the application as `landlordId` at submit time) reviews it. An application moves through the lifecycle `draft -> pending -> under_review -> conditional -> approved/rejected`. Endpoints live under `/api/v1` - tenant-facing routes hang off `/applications` and `/listings/{id}/applications`, landlord review tooling off `/applications/{id}/...` and `/applications/landlord`.

## SubmitApplicationRequest schema

Submit/draft payload for `POST /listings/{id}/applications` and `PATCH /applications/{id}` (`camelCase` wire names; required free-text fields are trimmed and rejected if blank, `email` must contain `@`, `monthlyIncome` must be a positive finite number):

```json
{
  "fullName": "Alice Smith",
  "email": "alice@example.com",
  "phone": "+12025550123",
  "dateOfBirth": "1990-05-14",
  "currentAddress": "100 Main St",
  "currentCity": "Austin",
  "currentState": "TX",
  "currentZip": "78701",
  "moveInDate": "2026-08-01",
  "employer": "Acme Corp",
  "jobTitle": "Engineer",
  "employmentLength": "3 years",
  "monthlyIncome": 7500.0,
  "reference1Name": "Bob Jones",
  "reference1Phone": "+12025550111",
  "reference2Name": "Carol Lee",
  "reference2Phone": "+12025550112",
  "pets": false,
  "petDescription": null,
  "additionalInfo": null,
  "backgroundCheckConsent": true,
  "asDraft": false
}
```

`reference2Name`, `reference2Phone`, `petDescription`, `additionalInfo` are optional (blank collapses to `null`); `pets`, `backgroundCheckConsent`, `asDraft` default to `false` when omitted.

## RentalApplication schema

The application detail/response shape (returned by every application endpoint). The tenant identity block (`tenantFirstName`, `tenantLastName`, `tenantWalletAddress`, `tenantOnchainUserId`) is present ONLY on the single-application detail response (`GET /applications/{id}`); `listing` is nested on the list/detail reads and is `null` when the target listing has since been withdrawn. `status` serializes `snake_case` (`draft|pending|under_review|conditional|approved|rejected`):

```json
{
  "id": "uuid",
  "listingId": "uuid",
  "userId": "uuid",
  "landlordId": "uuid",
  "fullName": "Alice Smith",
  "email": "alice@example.com",
  "phone": "+12025550123",
  "dateOfBirth": "1990-05-14",
  "currentAddress": "100 Main St",
  "currentCity": "Austin",
  "currentState": "TX",
  "currentZip": "78701",
  "moveInDate": "2026-08-01",
  "employer": "Acme Corp",
  "jobTitle": "Engineer",
  "employmentLength": "3 years",
  "monthlyIncome": 7500.0,
  "reference1Name": "Bob Jones",
  "reference1Phone": "+12025550111",
  "reference2Name": "Carol Lee",
  "reference2Phone": "+12025550112",
  "pets": false,
  "petDescription": null,
  "additionalInfo": null,
  "backgroundCheckConsent": true,
  "status": "pending",
  "listing": { "...": "nested Listing, or omitted/null" },
  "tenantWalletAddress": "01abc...",
  "tenantFirstName": "Alice",
  "tenantLastName": "Smith",
  "tenantOnchainUserId": "42",
  "createdAt": "2026-06-01T10:30:00Z",
  "updatedAt": "2026-06-02T14:22:01Z"
}
```

## ApplicationNote schema

A private landlord note (returned by the notes endpoints). Never shown to the applicant:

```json
{
  "id": "uuid",
  "applicationId": "uuid",
  "authorId": "uuid",
  "body": "Verified income with employer.",
  "createdAt": "2026-06-02T15:00:00Z"
}
```

## BackgroundCheck schema

A background check on an application. `checkType` is `credit|criminal|eviction`; `status` is `pending|completed|failed`; `result` is the bureau's JSON report (absent until resolved); `completedAt` is absent while pending:

```json
{
  "id": "uuid",
  "applicationId": "uuid",
  "requestedBy": "uuid",
  "checkType": "credit",
  "status": "completed",
  "result": { "summary": "clear" },
  "reference": "bureau-ref-123",
  "createdAt": "2026-06-02T15:30:00Z",
  "completedAt": "2026-06-02T15:31:00Z"
}
```

## ApplicationScore schema

The computed applicant score (out of 100) with its weighted breakdown. Recomputed on each read, never stored. Weights: income 30, credit 25, employment 20, references 15, background 10. `factor` is `income|credit|employment|references|background`:

```json
{
  "total": 88,
  "breakdown": [
    { "factor": "income", "weight": 30, "score": 30 },
    { "factor": "credit", "weight": 25, "score": 25 },
    { "factor": "employment", "weight": 20, "score": 20 },
    { "factor": "references", "weight": 15, "score": 8 },
    { "factor": "background", "weight": 10, "score": 5 }
  ]
}
```

Scoring rules: **income** bands the income-to-rent ratio (>=3x -> 30, >=2.5x -> 25, >=2x -> 20, >=1.5x -> 13, >=1x -> 7, else 0; 0 when rent is unknown because the listing was withdrawn); **credit** 25 if the latest credit check cleared, 8 if adverse, 0 if absent; **employment** parses tenure from `employmentLength` free text (>=2y -> 20, >=1y -> 13, else 7); **references** 15 with a second reference, 8 with one; **background** 5 points each for a cleared criminal and a cleared eviction check (latest completed check per type wins).

## POST `/api/v1/listings/{id}/applications`

- **Input:** `SubmitApplicationRequest`. `{id}` is the listing id.
- **Response (201):** the created `RentalApplication`.
- **Behavior:** one atomic `INSERT ... SELECT` against the listing - the reviewing `landlordId` is denormalized from the listing's `listedBy`, and the active-listing gate (`state = 'active'` and not deleted) lives in the `WHERE`, so a missing/inactive listing inserts nothing and yields 404 with no separate read. `asDraft: true` creates the application as a `draft` (editable, hidden from the landlord) instead of submitting it `pending`.
- **Errors:** 400 (invalid input - blank required field, malformed email, non-positive `monthlyIncome`), 401, 403 (tenant role required), 404 (no active listing with that id), 500
- **Auth:** Access cookie required; tenant role

## GET `/api/v1/listings/{id}/applications`

- **Input:** `{id}` is the listing id; `Pagination` query params (`page`, `pageSize`).
- **Response (200):** `PaginatedResponse<RentalApplication>` (newest first). `draft` applications are excluded.
- **Behavior:** the caller's ownership of the listing is asserted first (a non-owner gets 403); the read is then scoped to `listingId` with `status <> 'draft'`. No nested `listing` - the landlord already holds it. Count and page share one REPEATABLE READ snapshot.
- **Errors:** 401, 403 (not the lister), 404 (listing not found), 500
- **Auth:** Access cookie required; landlord role

## GET `/api/v1/applications`

- **Input:** `Pagination` query params.
- **Response (200):** `PaginatedResponse<RentalApplication>` - the caller's own applications (newest first), each with its nested `listing` (`null` if that listing was withdrawn). The tenant's own drafts ARE included.
- **Behavior:** scoped to `userId = caller`; count and page share one REPEATABLE READ snapshot, listings hydrated in a batch after the snapshot closes.
- **Errors:** 401, 403 (tenant role required), 500
- **Auth:** Access cookie required; tenant role

## GET `/api/v1/applications/{id}`

- **Input:** `{id}` is the application id.
- **Response (200):** a single `RentalApplication`, including the tenant identity block (`tenantFirstName`, `tenantLastName`, `tenantWalletAddress`, `tenantOnchainUserId`) joined from the users table, plus the nested `listing`.
- **Behavior:** visible to either party - the applicant (`userId`) or the reviewing landlord (`landlordId`). The landlord branch is gated `status <> 'draft'`, so a draft is treated as not-found (404) for the landlord - the draft-privacy guard, while the owning tenant always sees their own draft. An id the caller is party to nothing of reads as 404 and leaks nothing.
- **Errors:** 401, 404 (not party to any such application; or a draft viewed by the landlord), 500
- **Auth:** Access cookie required; tenant or landlord (any authenticated user, scoped by party)

## PATCH `/api/v1/applications/{id}`

- **Input:** `SubmitApplicationRequest` (full replacement of the draft's fields). `{id}` is the application id. `asDraft` is ignored here.
- **Response (200):** the updated `RentalApplication`.
- **Behavior:** only the applicant may edit, and only while the application is a `draft`. A `SELECT ... FOR UPDATE` locks the row so the owner check, the draft-state check, and the write share one snapshot. A foreign/unknown application is 404; a non-draft one is 409.
- **Errors:** 400 (invalid input), 401, 403 (tenant role required), 404 (caller owns no such application), 409 (application is not a draft), 500
- **Auth:** Access cookie required; tenant role

## POST `/api/v1/applications/{id}/submit`

- **Input:** `{id}` is the application id; no body.
- **Response (200):** the submitted `RentalApplication`, now `pending`.
- **Behavior:** moves a `draft` the caller owns to `pending`. Shares the same locked owner + draft-state check as the draft edit: a foreign/unknown application is 404, a non-draft one is 409.
- **Errors:** 401, 403 (tenant role required), 404 (caller owns no such application), 409 (application is not a draft), 500
- **Auth:** Access cookie required; tenant role

## GET `/api/v1/applications/landlord`

- **Input:** `LandlordApplicationParams` plus `Pagination` query params. Filters (all optional, `camelCase`): `status`, `search` (ILIKE over applicant `fullName` + `email`), `listingId`, `dateFrom`, `dateTo` (both inclusive on the calendar day).
- **Response (200):** `PaginatedResponse<RentalApplication>` - every application across the caller's listings (newest first), each with its nested `listing` for cross-listing context. `draft` applications are excluded.
- **Behavior:** scoped to the caller via the denormalized `landlordId` (no join back to listings), with `status <> 'draft'`. `dateFrom > dateTo` is rejected 400. Count and page share one REPEATABLE READ snapshot.
- **Errors:** 400 (invalid date range), 401, 403 (landlord role required), 500
- **Auth:** Access cookie required; landlord role

## PUT `/api/v1/applications/{id}/status`

- **Input:** `ReviewApplicationRequest` - `{ "status": "under_review" | "conditional" | "approved" | "rejected" }`. `{id}` is the application id.
- **Response (200):** the reviewed `RentalApplication`.
- **Behavior:** advances an application the caller is the landlord of along the review lifecycle. Valid sources are the open review states (`pending`, `under_review`, `conditional`); valid targets are `under_review`, `conditional`, `approved`, `rejected`. `draft`/`pending` are rejected as targets (a review decides, it does not unsubmit) with 400. A `SELECT ... FOR UPDATE` locks the row so the owner check, the transition check, and the write share one snapshot; a foreign application reads as 404, an unreachable target (e.g. re-deciding a terminal `approved`/`rejected`) as 409.
- **Errors:** 400 (target is not a review status), 401, 403 (landlord role required), 404 (caller reviews no such application), 409 (status transition not allowed), 500
- **Auth:** Access cookie required; landlord role

## POST `/api/v1/applications/{id}/notes`

- **Input:** `AddNoteRequest` - `{ "body": "..." }` (trimmed; blank is rejected). `{id}` is the application id.
- **Response (201):** the created `ApplicationNote`.
- **Behavior:** adds a private landlord note, never shown to the applicant. One atomic `INSERT ... SELECT` whose `WHERE` carries the owner-check (`landlordId = caller`) gated `status <> 'draft'`, so a draft application is treated as not-found (404) for the landlord - the draft-privacy guard, never exposing an in-progress tenant draft. A foreign/unknown application is likewise 404.
- **Errors:** 400 (blank body), 401, 403 (landlord role required), 404 (caller is the landlord of no such application; or a draft), 500
- **Auth:** Access cookie required; landlord role

## GET `/api/v1/applications/{id}/notes`

- **Input:** `{id}` is the application id.
- **Response (200):** `Vec<ApplicationNote>` (newest first); an owned application with no notes returns an empty array.
- **Behavior:** lists the private landlord notes. Ownership is verified `landlordId = caller` gated `status <> 'draft'`, so a draft application is treated as not-found (404) for the landlord - the draft-privacy guard, so in-progress tenant drafts are never exposed. A foreign/unknown application is likewise 404.
- **Errors:** 401, 403 (landlord role required), 404 (caller is the landlord of no such application; or a draft), 500
- **Auth:** Access cookie required; landlord role

## POST `/api/v1/applications/{id}/background-checks`

- **Input:** `RequestBackgroundCheckRequest` - `{ "checkType": "credit" | "criminal" | "eviction" }`. `{id}` is the application id.
- **Response (201):** the recorded `BackgroundCheck`.
- **Behavior:** requests a background check on an application the caller reviews. The application subject (name + DOB) and consent flag are read owner-scoped (`landlordId = caller`) gated `status <> 'draft'`, so a draft application is treated as not-found (404) for the landlord - the draft-privacy guard, never exposing an in-progress tenant draft. The applicant must have set `backgroundCheckConsent` - otherwise 400. The configured provider then runs the check and its outcome (`status`, `result`, `reference`) is persisted, with `completedAt` stamped for a terminal status.
- **Errors:** 400 (applicant has not consented), 401, 403 (landlord role required), 404 (caller is the landlord of no such application; or a draft), 500 (provider failure), 500
- **Auth:** Access cookie required; landlord role

## GET `/api/v1/applications/{id}/background-checks`

- **Input:** `{id}` is the application id.
- **Response (200):** `Vec<BackgroundCheck>` (newest first); an owned application with no checks returns an empty array.
- **Behavior:** lists the background checks on an application the caller reviews. Ownership is verified `landlordId = caller` gated `status <> 'draft'`, so a draft application is treated as not-found (404) for the landlord - the draft-privacy guard, so in-progress tenant drafts are never exposed. A foreign/unknown application is likewise 404.
- **Errors:** 401, 403 (landlord role required), 404 (caller is the landlord of no such application; or a draft), 500
- **Auth:** Access cookie required; landlord role

## GET `/api/v1/applications/{id}/score`

- **Input:** `{id}` is the application id.
- **Response (200):** the computed `ApplicationScore` (total out of 100 plus the per-factor breakdown).
- **Behavior:** gathers the scoring inputs - affordability/employment/reference fields, the listing's `rentMonthly`, and the latest completed background check per type - owner-scoped (`landlordId = caller`) gated `status <> 'draft'`, so a draft application is treated as not-found (404) for the landlord - the draft-privacy guard, so in-progress tenant drafts are never exposed. The score is recomputed on each read from current data, never stored. A foreign/unknown application is likewise 404.
- **Errors:** 401, 403 (landlord role required), 404 (caller is the landlord of no such application; or a draft), 500
- **Auth:** Access cookie required; landlord role
