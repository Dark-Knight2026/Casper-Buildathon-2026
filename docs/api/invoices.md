# Invoices API

The settlement layer over the `Escrow` contract's invoice model. An invoice is one unit of settlement - a single rent charge or a single security deposit - created on-chain by the `Lease` contract during `create_lease_agreement`, then mirrored off-chain and kept in sync by the indexer. The REST surface is **read + settle only**: rows are seeded `scheduled` at lease `/commit`, the indexer upgrades them to `pending` and reconciles payment state from Escrow events, and the tenant settles by posting the deploy hash of their on-chain `pay_invoice` call. Every route is authenticated and party-scoped (no public reads) and lives under `/api/v1/invoices`.

Money fields (`amountDue`, `rentPaid`, `landlordCharge`, `tenantRefund`, and the settlement `amount`) are **decimal strings on the wire - never floats** - so USDC precision survives the round-trip. `kind`/`status` wire forms are **hyphenated** (`security-deposit`), while their DB string forms are `snake_case` (a CHECK constraint).

## Invoice schema

The invoice as returned on the wire (camelCase) by the list, detail, and settlement endpoints:

```json
{
  "id": "uuid",
  "onchainInvoiceId": "128",
  "leaseId": "uuid",
  "kind": "rent",
  "tenantId": "uuid",
  "landlordId": "uuid",
  "propertyId": "uuid",
  "amountDue": "2500.00",
  "rentPaid": "0",
  "propertyManagerId": null,
  "propertyManagerBps": 0,
  "status": "pending",
  "deadline": "2026-09-01",
  "landlordCharge": null,
  "tenantRefund": null,
  "txHash": null,
  "receiptUrl": null,
  "createdAt": "2026-06-26T10:00:00Z",
  "updatedAt": "2026-06-26T10:00:00Z"
}
```

- `kind` is `rent` or `security-deposit`.
- `status` is one of `scheduled|pending|partial|paid|overdue|released|refunded|cancelled`:
  - `scheduled` - seeded off-chain at lease commit, not yet minted on-chain.
  - `pending` - bound on-chain (`InvoiceCreated`), awaiting payment.
  - `partial` - rent partially paid; `rentPaid` accumulates toward `amountDue`.
  - `paid` - rent settled, or deposit now held in escrow.
  - **`overdue`** - a **read-time projection**, never stored: surfaced when `status IN (pending, partial)` and `deadline < today`. The DB column keeps the authoritative `pending`/`partial` value so the indexer can always write on-chain state.
  - `released` / `refunded` - security deposit released at finalisation (landlord kept some / all returned).
  - `cancelled` - cancelled before payment.
- `onchainInvoiceId` is the Escrow-assigned U256 (decimal string); `null` until the indexer binds it. IDs are **contract-assigned** - the backend never mints them.
- `rentPaid` is `"0"` for a deposit (a deposit has no partial-payment progress).
- `landlordCharge`/`tenantRefund` are populated only on deposit release; `txHash` is `null` until settled; `receiptUrl` is `null` until a receipt is issued.

## SettlementRequest schema

Body of `POST /api/v1/invoices/{id}/settlement` - the tenant reports their on-chain `pay_invoice` result (Option A: FE-direct sign via CSPR.click):

```json
{
  "amount": "2500.00",
  "txHash": "deploy-hash-hex"
}
```

- `amount` is a positive USDC decimal string. For **rent** it is a partial or full instalment that may not exceed the remaining balance (`rentPaid + amount <= amountDue`); for a **security deposit** it must equal `amountDue` (deposits are taken in full).
- `txHash` is the deploy/tx hash of the on-chain `pay_invoice` call.

## InvoiceSummary schema

Response of `GET /api/v1/invoices/summary`. The body is **untagged** - there is no discriminator field; the caller knows which shape to expect from the scope it requested (`landlordId=me` -> landlord shape, `tenantId=me` -> tenant shape). All money figures are USDC decimal strings.

Landlord shape (`landlordId=me`):

```json
{
  "rentReceivedMtd": "5000.00",
  "monthlyRentDue": "2500.00",
  "overdueCount": 1,
  "overdueAmount": "2500.00",
  "depositsHeld": "2500.00"
}
```

Tenant shape (`tenantId=me`):

```json
{
  "nextDue": { "...": "the soonest unpaid Invoice, or null" },
  "balanceDue": "2500.00",
  "paidYtd": "7500.00",
  "depositHeld": "2500.00"
}
```

- `nextDue` is the soonest-by-deadline unpaid invoice (full `Invoice` object), or `null` when nothing is owed.

## ReceiptResponse schema

Body of `GET /api/v1/invoices/{id}/receipt`:

```json
{ "receiptUrl": null }
```

- `receiptUrl` is `null` until a receipt is issued (Phase 0 has no PDF pipeline).

## GET `/api/v1/invoices`

- **Input:** `InvoiceListParams` + `Pagination` query params: `tenantId=me`, `landlordId=me`, `leaseId`, `kind`, `status`, `propertyId`, `dueFrom`, `dueTo` (`YYYY-MM-DD` deadline range), `sortBy` (`deadline` (default) | `amountDue` | `status`), `page`, `pageSize`.
- **Response (200):** `PaginatedResponse<Invoice>` - the caller's own invoices.
- **Behavior:** any authenticated caller may read, but only ever their own party's invoices - the party scope is enforced in the query, so `tenantId`/`landlordId` (which accept only `me`) merely document intent. `status=overdue` matches unpaid past-deadline invoices via the same derived rule.
- **Errors:** 400 (`tenantId`/`landlordId` not `me`), 401, 500
- **Auth:** Access cookie required; any role (party-scoped).

## GET `/api/v1/invoices/summary`

- **Input:** `SummaryParams` query: exactly one of `tenantId=me` / `landlordId=me`.
- **Response (200):** `InvoiceSummary` - the landlord or tenant dashboard aggregates (see schema), computed only over the caller's own invoices in a single query.
- **Behavior:** the scope selects the shape. Landlord: rent received MTD, monthly rent due, overdue count + amount, deposits held. Tenant: next-due invoice, balance due, paid YTD, deposit held.
- **Errors:** 400 (neither or both of `tenantId`/`landlordId` set, or not `me`), 401, 500
- **Auth:** Access cookie required; any role (party-scoped).

## GET `/api/v1/invoices/{id}`

- **Input:** none (path param only).
- **Response (200):** the `Invoice`.
- **Behavior:** readable only by the invoice's tenant or landlord. A non-party gets **404** (the scope hides the row rather than revealing its existence with a 403).
- **Errors:** 401, 404 (not found / not visible), 500
- **Auth:** Access cookie required; party only.

## POST `/api/v1/invoices/{id}/settlement`

- **Input:** `SettlementRequest` (`{ amount, txHash }`).
- **Response (200):** the updated `Invoice` (optimistic).
- **Behavior:** records the on-chain settlement of an invoice the caller is the **tenant** of. After the tenant signs and submits `pay_invoice` via CSPR.click, they post the result here; the backend updates optimistically (`rentPaid`, `txHash`, derived status) and the indexer later reconciles the authoritative on-chain state. Payable only while `pending`/`partial` and not past the deadline. Amount rules: rent accumulates toward `amountDue` (`partial` until cleared, then `paid`); a deposit must be paid in full. The landlord is admitted by the read scope but rejected as a non-tenant (403).
- **Errors:** 400 (non-positive `amount`, overpayment, or part-paid deposit), 401, 403 (not the invoice tenant), 404 (not visible), 409 (past deadline, or not awaiting payment), 500
- **Auth:** Access cookie required; tenant role, invoice tenant only.

## GET `/api/v1/invoices/{id}/receipt`

- **Input:** none (path param only).
- **Response (200):** `ReceiptResponse` (`{ receiptUrl }`).
- **Behavior:** returns the receipt link for an invoice the caller is a party to. Readable by the tenant or landlord; a non-party gets 404. The URL is `null` until a receipt is issued.
- **Errors:** 401, 404 (not found / not visible), 500
- **Auth:** Access cookie required; party only.
