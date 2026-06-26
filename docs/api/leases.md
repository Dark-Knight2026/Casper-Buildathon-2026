# Leases API

The off-chain lease agreement between a landlord and one or more tenants, drafted and signed off-chain and committed on-chain exactly once. A lease moves through the lifecycle `draft -> pending-signatures -> active`, then `expiring-soon -> expired` / `terminated` / `renewed` over its life. The landlord drafts and edits it, submits it for signing, both parties consent off-chain with a Casper-message signature, and the landlord commits the on-chain result at `/commit`, after which the indexer keeps the off-chain projection in sync with the `Lease` contract. Every route is authenticated (no public reads) and lives under `/api/v1/leases`; party/role gates are enforced per handler.

Status and lease-type wire forms are **hyphenated** (`pending-signatures`, `expiring-soon`), while their DB string forms are `snake_case` (a CHECK constraint) - serde and strum diverge by design, so read/write the hyphenated form on the wire.

## CreateLeaseRequest schema

Body of `POST /api/v1/leases` (camelCase wire names). The terms are validated before anything is written:

```json
{
  "propertyId": "uuid",
  "tenantId": "uuid",
  "type": "fixed-term",
  "startDate": "2026-08-01",
  "endDate": "2027-08-01",
  "monthlyRent": 2500.0,
  "securityDeposit": 2500.0,
  "currency": "cUSD",
  "propertyManagerId": null,
  "propertyManagerBps": 0,
  "equityPropertyId": null,
  "clauses": [
    { "title": "Rent payment", "content": "Rent is due on the 1st.", "category": "rent-payment" }
  ]
}
```

- `endDate` must be after `startDate`, and the duration must be a **whole number of 30-day months** (`(end - start).days % 30 == 0`) - this mirrors the on-chain `(end - start) % 2_592_000 == 0` rule expressed in days.
- `monthlyRent` must be `> 0`; `securityDeposit` must be `>= 0`.
- `currency` must be one of `cUSD`, `CSPR`, `USD`, `USDT`, `USDC` (kept in sync with the `lease_currency_allowed` DB CHECK).
- `propertyManagerBps` is the manager's rent share in basis points (`10000` = 100%), `0..=10000`. It must be `0` when `propertyManagerId` is absent.
- `propertyManagerId`, `equityPropertyId`, `clauses` are optional (`clauses` defaults to an empty array).

## UpdateLeaseRequest schema

Body of `PATCH /api/v1/leases/{id}`. Every field is optional; omitted fields keep their current value (the patch is merged onto the stored row, then the merged result is validated against the same rules as create):

```json
{
  "type": "fixed-term",
  "startDate": "2026-08-01",
  "endDate": "2027-08-01",
  "monthlyRent": 2400.0,
  "securityDeposit": 2400.0,
  "currency": "cUSD",
  "clauses": [ { "title": "...", "content": "...", "category": "..." } ]
}
```

- `clauses` **replaces** the existing array when present.
- `propertyId`, `tenantId`, the manager split, and the equity link are NOT editable here.

## SignLeaseRequest schema

Body of `POST /api/v1/leases/{id}/sign` - one party's off-chain consent:

```json
{
  "role": "tenant",
  "signature": "<hex Casper-message signature>",
  "signerWallet": "01abc..."
}
```

- `role` is `landlord` or `tenant` and must match BOTH the caller's JWT role and their party membership on the lease.
- `signerWallet` must equal the caller's active linked wallet.
- `signature` is a Casper-message signature (ed25519 or secp256k1) over the canonical consent message below.

### Canonical consent message

The wallet signs exactly these bytes (the verifier prepends the Casper `Casper Message:\n` prefix). The frontend MUST reconstruct the string identically or verification fails. `signedAt` is deliberately excluded (it would diverge per party):

```
LeaseConsent|lease={id}|landlord={landlordId}|tenant={firstTenantId}|rent={monthlyRent}|deposit={securityDeposit}|currency={currency}|start={startDate}|end={endDate}
```

## CommitLeaseRequest schema

Body of `POST /api/v1/leases/{id}/commit` - the on-chain result of the landlord's `create_lease_agreement` call:

```json
{
  "onchainLeaseId": "42",
  "nftTokenId": "7",
  "commitTxHash": "deploy-hash-hex"
}
```

- `onchainLeaseId` is the U256 agreement id (decimal string) from `LeaseAgreementCreated`; it must be non-empty, all digits, and non-zero (`0` is the Casper "uninitialized" sentinel).
- `nftTokenId` is the tenant's frozen lease NFT token id (U256 decimal string).
- `commitTxHash` is the deploy/tx hash of the `create_lease_agreement` call.

## Lease schema

The lease as returned on the wire (camelCase) by every lease endpoint. `clauses`, `signatureProgress`, and `consentSignatures` are pass-through JSONB (free-form objects); the on-chain binding fields are `null` until `/commit`:

```json
{
  "id": "uuid",
  "propertyId": "uuid",
  "landlordId": "uuid",
  "tenantIds": ["uuid"],
  "type": "fixed-term",
  "status": "draft",
  "startDate": "2026-08-01",
  "endDate": "2027-08-01",
  "monthlyRent": 2500.0,
  "securityDeposit": 2500.0,
  "currency": "cUSD",
  "propertyManagerId": null,
  "propertyManagerBps": 0,
  "equityPropertyId": null,
  "clauses": [ { "title": "...", "content": "...", "category": "..." } ],
  "signatureProgress": {
    "landlord": { "signed": false, "timestamp": null },
    "tenant": { "signed": false, "timestamp": null }
  },
  "consentSignatures": {
    "tenant": { "signature": "...", "signedAt": "2026-06-26T10:00:00Z", "signerWallet": "01abc..." }
  },
  "documentLinks": { "generatedPDF": null, "signedPDF": null },
  "documentHash": null,
  "ipfsCid": null,
  "onchainLeaseId": null,
  "nftTokenId": null,
  "commitTxHash": null,
  "tenantOnchainUserId": null,
  "createdAt": "2026-06-26T10:00:00Z",
  "updatedAt": "2026-06-26T10:00:00Z"
}
```

- `status` is one of `draft|pending-signatures|under-review|pending-approval|active|expiring-soon|expired|terminated|renewed`.
- `signatureProgress` is seeded with both parties unsigned at submit time; `/sign` flips each party's `signed` flag and `timestamp` in turn.
- `consentSignatures` holds the per-party off-chain proof (`signature`, `signedAt`, `signerWallet`), keyed by `landlord`/`tenant`.
- `documentLinks.generatedPDF` / `signedPDF`, `documentHash`, and `ipfsCid` are populated by `GET /leases/{id}/document`; `ipfsCid` is a synthetic stub until real pinning lands.
- `onchainLeaseId`, `nftTokenId`, `commitTxHash` are `null` until `/commit`; `tenantOnchainUserId` is the primary tenant's contract-assigned on-chain user id, `null` until that tenant is registered on-chain.

## POST `/api/v1/leases`

- **Input:** `CreateLeaseRequest`.
- **Response (201):** the created `Lease`, in `draft` status.
- **Behavior:** validates the terms, then asserts the referenced property exists and is owned by the caller, and that the tenant exists. Nothing on-chain happens here. The lease is born `draft` with empty signature/consent objects.
- **Errors:** 400 (invalid terms or unknown tenant), 401, 403 (landlord role required, or not the property owner), 404 (property not found), 500
- **Auth:** Access cookie required; landlord role.

## GET `/api/v1/leases`

- **Input:** `LeaseListParams` + `Pagination` query params: `tenantId=me`, `landlordId=me`, `status`, `page`, `pageSize`.
- **Response (200):** `PaginatedResponse<Lease>`. `landlordId=me` returns leases the caller owns, `tenantId=me` those they are a tenant on; with neither, both scopes are returned.
- **Behavior:** scoped so a caller never sees a lease they are not a party to. `tenantId`/`landlordId` accept only the literal `me`; an optional `status` further filters by lifecycle.
- **Errors:** 400 (`tenantId`/`landlordId` not `me`), 401, 500
- **Auth:** Access cookie required; any role (party-scoped).

## GET `/api/v1/leases/{id}`

- **Input:** none (path param only).
- **Response (200):** the `Lease`.
- **Behavior:** readable only by the landlord or a listed tenant; any other authenticated caller gets 403.
- **Errors:** 401, 403 (not a party), 404 (lease not found), 500
- **Auth:** Access cookie required; party only.

## PATCH `/api/v1/leases/{id}`

- **Input:** `UpdateLeaseRequest`.
- **Response (200):** the updated `Lease`.
- **Behavior:** edits a draft lease's terms. Landlord-only, owner-only, and allowed only while the lease is a `draft`; omitted fields keep their value, and the merged terms are revalidated.
- **Errors:** 400 (invalid merged terms), 401, 403 (not the lease landlord), 404 (lease not found), 409 (lease is not a draft), 500
- **Auth:** Access cookie required; landlord role, owner only.

## DELETE `/api/v1/leases/{id}`

- **Input:** none (path param only).
- **Response (204):** empty body; the draft is soft-deleted.
- **Behavior:** soft-deletes a draft lease. Landlord-only, owner-only, draft-only; deleting a committed/active lease is 409.
- **Errors:** 401, 403 (not the lease landlord), 404 (lease not found), 409 (lease is not a draft), 500
- **Auth:** Access cookie required; landlord role, owner only.

## POST `/api/v1/leases/{id}/submit`

- **Input:** none (path param only).
- **Response (200):** the `Lease`, moved to `pending-signatures`.
- **Behavior:** submits a draft for signing. Landlord-only, owner-only; moves `draft -> pending_signatures` and seeds `signatureProgress` with both parties unsigned. The lease must have a tenant. Submitting a non-draft lease is 409.
- **Errors:** 400 (lease has no tenant), 401, 403 (not the lease landlord), 404 (lease not found), 409 (lease is not a draft), 500
- **Auth:** Access cookie required; landlord role, owner only.

## POST `/api/v1/leases/{id}/sign`

- **Input:** `SignLeaseRequest` (`{ role, signature, signerWallet }`).
- **Response (200):** the `Lease` with this party's `signatureProgress`/`consentSignatures` entry merged in.
- **Behavior:** records one party's off-chain consent while the lease is `pending_signatures`. The claimed `role` must match the caller's JWT role AND their party membership; `signerWallet` must be the caller's active wallet; the Casper signature is verified over the [canonical consent message](#canonical-consent-message). Re-signing the same role overwrites the prior entry. `/commit` stays blocked until both parties have signed.
- **Errors:** 400 (malformed signature or no active wallet linked), 401 (signature verification failed), 403 (not the signing party, role mismatch, or wallet mismatch), 404 (lease not found), 409 (lease is not awaiting signatures), 500
- **Auth:** Access cookie required; party only (the claimed role).

## POST `/api/v1/leases/{id}/commit`

- **Input:** `CommitLeaseRequest` (`{ onchainLeaseId, nftTokenId, commitTxHash }`).
- **Response (200):** the `Lease`, moved to `active` with its on-chain bindings persisted.
- **Behavior:** records the on-chain result of `create_lease_agreement` and activates the lease. Landlord-only, owner-only, and blocked until both consent signatures are present. Validates the ids (non-zero decimal `onchainLeaseId`, decimal `nftTokenId`), then reconciles against the chain via `LeaseChainReader` - the agreement must exist, be unfinished, have its security deposit paid, and have all invoices paid - before persisting `onchainLeaseId`/`nftTokenId`/`commitTxHash` and moving `pending_signatures -> active`. **Idempotent:** if the indexer's `LeaseAgreementCreated` handler already activated the lease (even between this handler's read and write), the active lease is returned unchanged.
- **Errors:** 400 (zero/non-decimal `onchainLeaseId`, non-decimal `nftTokenId`, or id absent on-chain), 401, 403 (not the lease landlord), 404 (lease not found), 409 (not awaiting commit, missing signatures, not fully funded, or already finished on-chain), 500 (on-chain transport failure)
- **Auth:** Access cookie required; landlord role, owner only.

## GET `/api/v1/leases/{id}/document`

- **Input:** none (path param only).
- **Response (200):** the `Lease` with its `documentLinks`, `documentHash`, and `ipfsCid` populated.
- **Behavior:** renders, stores, and returns the lease document. Readable by the landlord or a listed tenant. While the lease is `draft`/`pending_signatures` it renders the terms and clauses via `LeaseDocumentRenderer`, stores the bytes through `MediaStorage`, records the SHA-256 `documentHash` and the IPFS `ipfsCid` (synthetic stub until real pinning). Once the lease leaves the editable phase its document is frozen: an `active`+ lease serves the stored record unchanged (read-through) rather than re-rendering and overwriting the hash committed on-chain.
- **Errors:** 401, 403 (not a party), 404 (lease not found), 500 (render/storage/pin failure)
- **Auth:** Access cookie required; party only.
