# Payments (Escrow Invoices) — Backend Implementation Reference

> Reference for the **backend** (Rust REST API) to start implementing the payments
> block. **Grounded in the real on-chain model** — the `Escrow` contract is
> **invoice-based** (`create_lease_invoice` / `create_security_deposit_invoice` /
> `pay_invoice` / `release_security_deposit`); this document mirrors it off-chain
> and defines the REST surface the FE needs.
>
> **FE state:** no real API — `TenantDashboard` / `LandlordDashboard` run on
> `MOCK_PAYMENTS` / `MOCK_LANDLORD_DASHBOARD_STATS`. The legacy
> `src/types/tenant.ts:Payment` is a Supabase shape. This doc defines the contract
> "from scratch" in the **camelCase wire style** the `feat/properties` backend uses.
>
> **Depends on** [`agreements_api.md`](./agreements_api.md): **invoices are created
> by the lease flow**, not here — `create_*_invoice` is `assert_lease()`-gated
> (only the `Lease` contract may create them). So build leases first; a payment
> with no lease/invoice has nothing to settle.
>
> **Phase:** Phase 0 (hackathon). Currency is testnet **USDC** (CEP-18). A
> PaymentRouter / fiat on-ramp is Phase 1.

---

## 1. Model — invoice, not free-form payment

The unit is an **Invoice** (one rent charge or one security deposit), mirroring the
on-chain `Escrow::Invoice`. An invoice is **created by the lease** (deposit + each
monthly rent), **paid by the tenant** (`pay_invoice`, partial allowed for rent), and
for deposits **released** at lease finalization. The off-chain row is the UI source
of truth; the on-chain settlement `txHash` reconciles it.

Two invoice kinds, two money paths:

| Kind               | On creation                       | On `pay_invoice`                                                                                                                             | At finalization                                                                               |
| ------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `rent`             | `create_lease_invoice`            | **passes through** Escrow → landlord, **minus protocol fee** (→ Treasury) **minus property-manager share** (`propertyManagerBps`). Not held. | —                                                                                             |
| `security_deposit` | `create_security_deposit_invoice` | **held in Escrow custody**                                                                                                                   | `release_security_deposit` → `landlordCharge` to landlord, remainder `tenantRefund` to tenant |

> **Treasury** is **only** the protocol-fee / staking-rewards sink — it is **not**
> the landlord payout. Rent is split inside `Escrow::pay_invoice`.

Money is a **decimal string** on the wire (never a float). Currency is `USDC`.

### Schema — Invoice (off-chain mirror)

```ts
interface Invoice {
  id: string; // backend id
  onchainInvoiceId: string | null; // Escrow U256 (decimal string), null until created on-chain
  leaseId: string; // FK → agreements_api lease
  kind: 'rent' | 'security_deposit';
  tenantId: string; // buyer
  landlordId: string; // seller (recipient; for deposits, until release)
  propertyId: string; // denormalised for filtering/grouping
  amountDue: string; // total due, USDC decimal string
  rentPaid: string; // partial-payment progress (rent only); '0.00' otherwise
  propertyManagerId: string | null;
  propertyManagerBps: number; // 0–10000 (10000 = 100% of rent)
  status:
    | 'scheduled'
    | 'pending'
    | 'partial'
    | 'paid'
    | 'overdue'
    | 'released'
    | 'refunded'
    | 'cancelled';
  deadline: string; // YYYY-MM-DD — after this the invoice can't be paid
  // security-deposit only (set on release):
  landlordCharge: string | null; // amount kept by landlord
  tenantRefund: string | null; // amount returned to tenant
  txHash: string | null; // settlement deploy-hash, null until paid
  receiptUrl: string | null;
  createdAt: string; // ISO-8601
  updatedAt: string;
}
```

### Status machine

```
scheduled ─(created on-chain)─▶ pending ─(pay_invoice, partial)─▶ partial ─(full)─▶ paid
   │                              │
   └─ cancelled                   └─(past deadline, unpaid)─▶ overdue
security_deposit: paid ─(release_security_deposit)─▶ released  (landlordCharge + tenantRefund)
                  paid ──────────────────────────────▶ refunded (full tenant refund)
```

- `overdue` = `status ∈ {pending,partial} AND deadline < today` (derived on read or by a daily worker) — drives the landlord "overdue payments" alert.

---

## 2. REST API

All under `/api/v1`, cookie auth, camelCase, paginated lists return
`{ data, itemCount, pageCount }`. **Invoices are read + settled here; they are
_created_ by the lease flow** (`POST /leases` → mirrors `create_*_invoice`).

| Method | Path                                                                                                                              | Purpose                                                                                    | Role         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------ |
| `GET`  | `/invoices?tenantId=me`                                                                                                           | The tenant's invoices (rent + deposit)                                                     | tenant       |
| `GET`  | `/invoices?landlordId=me`                                                                                                         | All invoices across the landlord's leases                                                  | landlord     |
| `GET`  | `/invoices?leaseId=:id`                                                                                                           | Invoices for one lease                                                                     | both (party) |
| `GET`  | `/invoices` filters: `kind`, `status`, `propertyId`, `dueFrom`, `dueTo`, `page`, `pageSize`, `sortBy=deadline\|amountDue\|status` | Filter/sort                                                                                | both         |
| `GET`  | `/invoices/:id`                                                                                                                   | Invoice detail                                                                             | both (party) |
| `POST` | `/invoices/:id/settlement`                                                                                                        | Record / drive settlement of an on-chain `pay_invoice` (see §4); `amount` for partial rent | tenant       |
| `GET`  | `/invoices/:id/receipt`                                                                                                           | Receipt PDF / URL                                                                          | both (party) |

### Dashboard aggregates (so the FE doesn't fan out N calls)

| Method | Path                              | Returns                                                                                            |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET`  | `/invoices/summary?landlordId=me` | `{ rentReceivedMtd, monthlyRentDue, overdueCount, overdueAmount, depositsHeld }` (decimal strings) |
| `GET`  | `/invoices/summary?tenantId=me`   | `{ nextDue: Invoice \| null, balanceDue, paidYtd, depositHeld }`                                   |

> These feed `LandlordDashboard` (overdue alert + rent-received KPI) and
> `TenantDashboard` (next-payment card) directly — see
> [`LANDLORD_DASHBOARD_INTEGRATION_TASKS.md`](../LANDLORD_DASHBOARD_INTEGRATION_TASKS.md) LD-4.

### `POST /api/v1/invoices/:id/settlement` (request → response)

```jsonc
// Tenant pays (or part-pays) an invoice. Body shape depends on the chosen option (§4).
{ "amount": "1950.00", "txHash": "deploy-hash…" }   // Option A: FE already submitted
// or
{ "amount": "1950.00", "authorization": { /* EIP-712 signed payload */ } }  // Option B: facilitator settles
// → 200 Invoice { status: 'processing'|'partial'|'paid', txHash }
```

---

## 3. On-chain reference (Casper — `Escrow`)

- **Currency:** testnet **USDC** (CEP-18). Deposits _must_ use the configured USDC
  token (`assert_security_deposit_currency`).
- **Contracts:** `Escrow` (invoices + deposit custody, `CONTRACT_ESCROW`), `Lease`
  (creates invoices, releases deposits), `Treasury` (`CONTRACT_TREASURY`) — protocol
  fee / staking-rewards sink **only**.
- **Entry points** (the backend reconciles against these; it does **not** create
  invoices — the Lease contract does):
  - `create_lease_invoice(params)` — **Lease-only**. Rent invoice; recipient = landlord; optional PM split (`propertyManagerBps`).
  - `create_security_deposit_invoice(tenant, landlord, amountDue)` — **Lease-only**. USDC, held by Escrow.
  - `pay_invoice(invoiceId, amount)` — **tenant**. Partial allowed for rent (`rentPaid`); rent is distributed (landlord − protocol fee − PM share), deposit is held.
  - `release_security_deposit(invoiceId, landlord, securityDepositCharge)` — **Lease-only**. `charge` → landlord, remainder → tenant refund.
- **Recording / reconciliation:** the settlement deploy-hash is written back to the
  invoice (`txHash`), `status` → `paid`/`partial`. The **indexer** picks up the
  Escrow paid/release events to reconcile off-chain status with on-chain truth
  (match by `onchainInvoiceId`, like the property indexer matches by `metadataUri`).

---

## 4. Payment options — **pick one** (open decision)

The only tenant-facing on-chain action is `pay_invoice`. **How** the tenant signs &
submits it is the open choice:

### Option A — direct sign via CSPR.click (FE builds the tx)

- FE builds `USDC.approve(Escrow, amount)` + `Escrow.pay_invoice(invoiceId, amount)`.
- Tenant signs **both deploys** in the wallet (CSPR.click), FE submits to casper-test.
- FE posts the resulting `txHash` to `POST /invoices/:id/settlement`; backend verifies
  - the indexer reconciles.
- **Pros:** no third-party dependency; same pattern as the property-registration sign
  flow we already have. **Cons:** two signatures (approve + pay) unless using an
  allowance pre-grant; all the deploy-building lives on the FE.
- **EIP-712 here is optional and _not_ part of the payment** — A settles with native
  Casper deploys, no EIP-712 required. It can still be layered in **only as a consent /
  audit signature** (the tenant typed-data-signs "I authorize paying invoice #N",
  same pattern as the lease party-consent in `agreements_api.md` §6) — an off-chain
  legal/audit artifact that does **not** move money and does **not** reduce the two
  signatures. It does **not** give A the one-sign / gasless UX — that's only Option B.

### Option B — x402 facilitator (hosted settlement)

- Tenant signs **one EIP-712 authorization** (offline signature, not a full deploy)
  via CSPR.click.
- Backend (resource server) sends it to the **Casper x402 facilitator** (CSPR.cloud,
  `/verify` + `/settle`); the **facilitator submits** the USDC transfer / `pay_invoice`.
- Backend records the settlement; the indexer reconciles.
- **Pros:** single sign, smoother UX; **no on-chain deploy-building on our side**.
  **Cons:** depends on the hosted facilitator; new integration vs the existing
  CSPR.click sign flow. ([[reference_casper_x402_facilitator]])

> **Either way the tenant must sign — there is no auto-debit.** A wallet can't be
> charged without the owner's signature.

|                           | A — CSPR.click direct           | B — x402 facilitator    |
| ------------------------- | ------------------------------- | ----------------------- |
| Tenant signs              | 2 deploys (approve + pay)       | 1 EIP-712 authorization |
| Submits on-chain          | FE                              | facilitator             |
| On-chain code on our side | yes (build deploys)             | minimal                 |
| External dependency       | none                            | facilitator service     |
| Matches existing flow     | ✅ (property-registration sign) | ➕ new                  |

**Recommendation for the hackathon:** start with **Option A** (reuses the CSPR.click
sign flow we already built; zero new dependencies). Layer in **Option B** later if a
one-click rent UX is worth the facilitator integration. _Decision pending — pick before
the payments backend is built._

---

## 5. Validation & rules

- Invoices are **created by the lease flow only** (`assert_lease`); the REST layer
  never mints them directly.
- `landlordId`/`tenantId`/`propertyManagerBps` come from the lease/invoice, never
  trusted from the client.
- Only the invoice **buyer** (tenant) may settle; only the **Lease** flow may release
  a deposit.
- Partial rent: `rentPaid` accumulates until `amountDue`; `overdue` only applies to
  unpaid/partly-paid invoices past `deadline`.

## 6. Out of scope (Phase 1)

- Fiat on-ramp / off-ramp and currency conversion.
- Recurring auto-pay / PaymentRouter.
- Equity distributions to fraction-token holders (that's the `PropertyFractionToken`
  - compliance flow, not this block).
