# Renewals API

A landlord-proposes / tenant-responds negotiation layered on top of an active lease. The landlord authors a renewal offer (created already `sent`), the tenant responds `accept` / `reject` / `counter`, and either party can append to a free-form negotiation thread of messages and counter-offers alongside the formal response. An accepted offer is the landlord's signal to run `prolong_lease_agreement` on-chain (the indexer reflects the new end date); the renewal endpoints themselves never mutate the lease. Every route is authenticated (no public reads) and lives under `/api/v1/renewals`; party/role gates are enforced per handler.

Status and negotiation-kind wire forms are **hyphenated** (`counter-offer`), while their DB string forms are `snake_case` (a CHECK constraint) - serde and strum diverge by design, so read/write the hyphenated form on the wire.

## CreateRenewalRequest schema

Body of `POST /api/v1/renewals` (camelCase wire names). The landlord proposes new terms on a lease they own:

```json
{
  "leaseId": "uuid",
  "proposedRent": 2600.0,
  "proposedTermMonths": 12,
  "proposedStartDate": "2027-08-01",
  "rentIncreaseReason": "Market adjustment",
  "responseDeadline": "2027-07-01"
}
```

- `proposedRent` must be `>= 0`; `proposedTermMonths` must be `> 0` (mirrors the `valid_proposed_rent` / `valid_proposed_term` DB CHECKs).
- `rentIncreaseReason` and `responseDeadline` are optional. The tenant is taken from the lease, not the payload.

## RespondRenewalRequest schema

Body of `POST /api/v1/renewals/{id}/respond` - the tenant's decision:

```json
{
  "decision": "counter",
  "counterOffer": {
    "proposedRent": 2550.0,
    "proposedTermMonths": 12,
    "notes": "Happy to renew at a smaller increase."
  }
}
```

- `decision` is `accept`, `reject`, or `counter`.
- `counterOffer` (a `CounterOffer`: `proposedRent`, `proposedTermMonths`, optional `notes`) is **required** when `decision = counter` and ignored otherwise.

## PostNegotiationRequest schema

Body of `POST /api/v1/renewals/{id}/negotiations` - one thread entry. Each kind carries exactly one payload:

```json
{
  "kind": "counter-offer",
  "body": null,
  "proposedTerms": { "proposedRent": 2550.0, "proposedTermMonths": 12, "notes": null }
}
```

- `kind` is `message` or `counter-offer`.
- `body` (free text) is **required** when `kind = message`; `proposedTerms` (a `CounterOffer`) is **required** when `kind = counter-offer`.

## Renewal schema

The renewal offer as returned on the wire (camelCase):

```json
{
  "id": "uuid",
  "leaseId": "uuid",
  "landlordId": "uuid",
  "tenantId": "uuid",
  "proposedRent": 2600.0,
  "proposedTermMonths": 12,
  "proposedStartDate": "2027-08-01",
  "rentIncreaseReason": "Market adjustment",
  "responseDeadline": "2027-07-01",
  "status": "sent",
  "counterOffer": null,
  "createdAt": "2026-06-26T10:00:00Z",
  "updatedAt": "2026-06-26T10:00:00Z"
}
```

- `status` is one of `draft|sent|accepted|rejected|countered|expired`.
- `counterOffer` is the tenant's counter terms (JSON object), `null` unless the tenant countered.

## Negotiation schema

A single negotiation-thread entry (camelCase):

```json
{
  "id": "uuid",
  "renewalId": "uuid",
  "authorId": "uuid",
  "kind": "message",
  "body": "Can we keep the current rent?",
  "proposedTerms": null,
  "createdAt": "2026-06-26T10:00:00Z"
}
```

- `kind` is `message` or `counter-offer`.
- `body` is set on a `message`; `proposedTerms` (JSON object) is set on a `counter-offer`. The unused field is `null`.

## POST `/api/v1/renewals`

- **Input:** `CreateRenewalRequest`.
- **Response (201):** the created `Renewal`, in `sent` status.
- **Behavior:** creates a renewal offer on a lease the caller owns. Landlord-only. The target lease must be `active` or `expiring_soon` and owned by the caller; the tenant is taken from the lease. The offer is created already `sent`.
- **Errors:** 400 (invalid terms or a lease with no tenant), 401, 403 (not the lease landlord), 404 (lease not found), 409 (lease is not renewable - not `active`/`expiring_soon`), 500
- **Auth:** Access cookie required; landlord role, lease owner only.

## GET `/api/v1/renewals`

- **Input:** `RenewalListParams` + `Pagination` query params: `tenantId=me`, `landlordId=me`, `page`, `pageSize`.
- **Response (200):** `PaginatedResponse<Renewal>`. `landlordId=me` returns offers the caller authored, `tenantId=me` those addressed to them; with neither, both scopes are returned.
- **Behavior:** scoped so a caller never sees a renewal they are not a party to. `tenantId`/`landlordId` accept only the literal `me`.
- **Errors:** 400 (`tenantId`/`landlordId` not `me`), 401, 500
- **Auth:** Access cookie required; any role (party-scoped).

## GET `/api/v1/renewals/{id}`

- **Input:** none (path param only).
- **Response (200):** the `Renewal`.
- **Behavior:** readable only by the landlord or the tenant on the renewal; any other authenticated caller gets 403.
- **Errors:** 401, 403 (not a party), 404 (renewal not found), 500
- **Auth:** Access cookie required; party only.

## POST `/api/v1/renewals/{id}/respond`

- **Input:** `RespondRenewalRequest` (`{ decision, counterOffer? }`).
- **Response (200):** the `Renewal`, moved to `accepted` / `rejected` / `countered`.
- **Behavior:** records the tenant's response. Tenant-only (the tenant on the renewal). Drives `sent -> accepted | rejected | countered`; a `counter` requires a `counterOffer` body, which is stored on the renewal. On `accepted` the offer becomes the landlord's cue to run `prolong_lease_agreement` on-chain - the lease itself is not changed here. Responding to an offer that already has a response is 409.
- **Errors:** 400 (countering without a `counterOffer`), 401, 403 (not the renewal tenant), 404 (renewal not found), 409 (renewal is not awaiting a response), 500
- **Auth:** Access cookie required; tenant role, renewal tenant only.

## GET `/api/v1/renewals/{id}/negotiations`

- **Input:** none (path param only).
- **Response (200):** `Vec<Negotiation>` - the full thread, oldest first.
- **Behavior:** returns the negotiation thread of a renewal. Readable only by the renewal's landlord or tenant.
- **Errors:** 401, 403 (not a party), 404 (renewal not found), 500
- **Auth:** Access cookie required; party only.

## POST `/api/v1/renewals/{id}/negotiations`

- **Input:** `PostNegotiationRequest` (`{ kind, body?, proposedTerms? }`).
- **Response (201):** the created `Negotiation`.
- **Behavior:** appends an entry to a renewal's negotiation thread. Open to the renewal's landlord or tenant. A `message` requires a non-blank `body`; a `counter-offer` requires `proposedTerms`. The thread is informal - it does not by itself change the renewal's `status` (that is the `/respond` endpoint's job).
- **Errors:** 400 (missing `body`/`proposedTerms` for the kind), 401, 403 (not a party), 404 (renewal not found), 500
- **Auth:** Access cookie required; party only.
