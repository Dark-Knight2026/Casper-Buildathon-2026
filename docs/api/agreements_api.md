# Agreements (Leases & Renewals) — Backend Implementation Reference

> Reference for the **backend** (Rust REST API) to start implementing the agreements block.
> Describes the target flow, the required endpoints, and the on-chain contract
> (Casper / Odra) the backend must coordinate with.
>
> FE state: no finished APIs yet — only UI on mock data that needs verifying/rewiring.
> So this document defines the contract "from scratch".
>
> **Phase:** this document describes **Phase 0 (hackathon)** — the actually deployed
> contracts (Lease/Escrow/NFT/UserRegistry), landlord-driven, EIP-712 off-chain.
> Phase 1 extensions (on-chain EIP-712, IPFS hash, KYC, PaymentRouter) are marked
> separately — see §6.

---

## 1. Model: off-chain vs on-chain

An agreement lives in two layers. The backend owns the off-chain layer and coordinates the transition to on-chain.

| Layer                   | Holds                                                                                         | Source of truth  |
| ----------------------- | --------------------------------------------------------------------------------------------- | ---------------- |
| **Off-chain** (REST/DB) | drafts, documents (PDF), clauses, signatures, negotiations, metadata                          | backend          |
| **On-chain** (Casper)   | invoices (deposit + monthly rent), frozen lease NFT, immutable `lease_id`, equity-eligibility | `Lease` contract |

The off→on transition happens **exactly once** — at `create_lease_agreement`,
once terms are final and signed by both parties.

---

## 2. Flow (concise)

### Precondition: both parties registered on-chain

Tenant and landlord must exist in `UserRegistry` (`user_id` + active wallet +
role flag). Done during onboarding (`create_user`, see §5.1). Without it
`create_lease_agreement` reverts.

### Lifecycle

```
1. DRAFT (off-chain)
   Landlord creates the agreement (property, tenant, terms, clauses) → status: draft
   POST /api/v1/leases — nothing on-chain yet.

2. SIGNING (off-chain, EIP-712)
   submit → pending-signatures
   landlord signs + tenant signs the terms as EIP-712 typed data (via wallet,
   gasless). Backend stores both signatures as proof of consent (see §6).

3. COMMIT ON-CHAIN  ← the key moment
   Landlord submits create_lease_agreement(params) from their own wallet.
   One call atomically: creates invoices in Escrow + mints a frozen NFT to the
   tenant + (optional) equity-eligibility + returns lease_agreement_id.
   ⚠️ No money moves here — only invoices (bills) are created.
   Backend/indexer catches the LeaseAgreementCreated event → status: active,
   stores onchainLeaseId + nftTokenId.

4. ACTIVE — payments (separate on-chain calls BY THE TENANT)
   Tenant calls Escrow.pay_invoice(invoice_id, amount) themselves — first the
   deposit, then monthly rent. This is their on-chain action (effectively consent
   + commitment). Rent is distributed per rent_distribution_terms. Backend only
   indexes payments (is_security_deposit_paid / is_all_invoices_paid); it never
   moves funds itself.

5. END
   A) Renewal: off-chain negotiation (POST /renewals) → accept →
      landlord runs prolong_lease_agreement on-chain.
   B) Finalize: landlord runs finalize_lease_agreement →
      releases deposit, is_finished = true.
```

```
create_user → DRAFT ─signed─▶ create_lease_agreement ─▶ ACTIVE ─┬─ prolong (renewal)
 (one-time)   (off-chain)        (off→on, NFT mint)             └─ finalize
```

**Renewal = agree new terms off-chain; `prolong_lease_agreement` = execute the agreement on-chain.**

---

## 3. REST API — Leases

> Auth: Bearer token of the backend session. `me` is resolved from the token.
> Dates — ISO-8601 UTC. Off-chain money in responses — numbers; on-chain amounts — strings (U256).

| Method   | Endpoint                                   | Purpose                                         | Role     |
| -------- | ------------------------------------------ | ----------------------------------------------- | -------- |
| `GET`    | `/api/v1/leases?tenantId=me`               | Tenant's leases                                 | tenant   |
| `GET`    | `/api/v1/leases?landlordId=me`             | Landlord's leases                               | landlord |
| `GET`    | `/api/v1/leases?status=draft\|active\|...` | Filter by status                                | both     |
| `GET`    | `/api/v1/leases/:id`                       | Lease detail                                    | both     |
| `POST`   | `/api/v1/leases`                           | Create draft → `draft`                          | landlord |
| `PATCH`  | `/api/v1/leases/:id`                       | Edit draft / change status                      | landlord |
| `DELETE` | `/api/v1/leases/:id`                       | Delete draft (only `draft`)                     | landlord |
| `POST`   | `/api/v1/leases/:id/submit`                | Send for signing → `pending-signatures`         | landlord |
| `POST`   | `/api/v1/leases/:id/sign`                  | Sign (tenant/landlord)                          | both     |
| `POST`   | `/api/v1/leases/:id/commit`                | Record on-chain result (lease_id, token_id, tx) | landlord |
| `GET`    | `/api/v1/leases/:id/document`              | Lease PDF document                              | both     |

### `POST /api/v1/leases` (request)

```jsonc
{
  "propertyId": "string",
  "tenantId": "string", // tenant's user_id in the system
  "type": "residential-long-term",
  "startDate": "2026-01-01",
  "endDate": "2027-01-01", // duration must be a whole number of months (see §5.2)
  "monthlyRent": 2500,
  "securityDeposit": 2500,
  "currency": "cUSD", // or "CSPR"
  "propertyManagerId": "string|null",
  "propertyManagerBps": 0, // 10000 = 100%; 0 if no manager
  "equityPropertyId": "string|null", // lease-to-own; null if none
  "clauses": [{ "title": "...", "content": "...", "category": "rent-payment" }],
}
```

Response: the full agreement object with `status: "draft"` and a generated `id`.

### `GET /api/v1/leases/:id` (response)

```jsonc
{
  "id": "string",
  "propertyId": "string",
  "landlordId": "string",
  "tenantIds": ["string"],
  "type": "residential-long-term",
  "status": "active", // draft|pending-signatures|active|expiring-soon|expired|terminated|renewed
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2027-01-01T00:00:00Z",
  "monthlyRent": 2500,
  "securityDeposit": 2500,
  "currency": "cUSD",
  "clauses": [
    /* ... */
  ],
  "signatureProgress": {
    "landlord": { "signed": true, "timestamp": "..." },
    "tenant": { "signed": false, "timestamp": null },
  },
  "documentLinks": { "generatedPDF": "url|null", "signedPDF": "url|null" },

  // document hash — Phase 0 stubs (on-chain binding will arrive with property-registration)
  "documentHash": null, // SHA-256 of PDF; null for now
  "ipfsCid": null, // IPFS CID; null for now

  // EIP-712 consent of the parties (off-chain proof, see §6)
  "consentSignatures": {
    "landlord": { "signature": "0x..|null", "signedAt": "..|null" },
    "tenant": { "signature": "0x..|null", "signedAt": "..|null" },
  },

  // on-chain binding (filled after /commit, see §5.2)
  "onchainLeaseId": "0", // U256, from LeaseAgreementCreated event
  "nftTokenId": "0", // frozen lease NFT of the tenant
  "commitTxHash": "string|null",
}
```

### `POST /api/v1/leases/:id/sign` (request)

EIP-712 consent (see §6). FE sends the typed-data signature returned by the wallet.

```jsonc
{
  "role": "tenant", // tenant | landlord
  "signature": "0x...", // EIP-712 signature of the lease terms (off-chain, gasless)
  "signerWallet": "0x...", // public key/address of the signer (for verification)
}
```

Backend verifies `signerWallet` matches the user's active wallet and stores the signature.

### `POST /api/v1/leases/:id/commit` (request)

Called after a successful on-chain `create_lease_agreement`. The backend must
reconcile against the contract (`get_lease_agreement_by_id`) before setting `active`.

```jsonc
{
  "onchainLeaseId": "0",
  "nftTokenId": "0",
  "commitTxHash": "string",
  "invoiceValidityDuration": 0, // U64 seconds (JSON number, not a string)
}
```

---

## 4. REST API — Renewals

| Method | Endpoint                            | Purpose                     | Role     |
| ------ | ----------------------------------- | --------------------------- | -------- |
| `GET`  | `/api/v1/renewals?tenantId=me`      | Tenant's renewal offers     | tenant   |
| `GET`  | `/api/v1/renewals?landlordId=me`    | Landlord's renewal offers   | landlord |
| `GET`  | `/api/v1/renewals/:id`              | Offer detail                | both     |
| `POST` | `/api/v1/renewals`                  | Create offer                | landlord |
| `POST` | `/api/v1/renewals/:id/respond`      | accept / reject / counter   | tenant   |
| `GET`  | `/api/v1/renewals/:id/negotiations` | Negotiation history         | both     |
| `POST` | `/api/v1/renewals/:id/negotiations` | Add message / counter-offer | both     |

### `POST /api/v1/renewals` (request)

```jsonc
{
  "leaseId": "string",
  "proposedRent": 2700,
  "proposedTermMonths": 12,
  "proposedStartDate": "2027-01-01",
  "rentIncreaseReason": "string|null",
  "responseDeadline": "2026-12-01",
}
```

Response: offer with `status: "sent"`.

### `POST /api/v1/renewals/:id/respond` (request)

```jsonc
{
  "decision": "counter", // accept | reject | counter
  "counterOffer": {
    // only if decision == "counter"
    "proposedRent": 2600,
    "proposedTermMonths": 12,
    "notes": "string",
  },
}
```

Offer statuses: `draft → sent → under-review → accepted | rejected | countered | expired`.
After `accepted` the backend marks the lease ready for on-chain `prolong_lease_agreement`.

---

## 5. On-chain reference (Casper / Odra)

Contracts: `2025_anthony_leasefi/src/{user_registry,lease,nft}.rs`.
Schemas: `2025_anthony_leasefi/resources/casper_contract_schemas/*.json`.
Calls go via package hash (Odra). The backend needs this to **index events**
and **reconcile state** before changing off-chain status.

### 5.1. Precondition — `UserRegistry::create_user`

```
create_user(identity_hash: ByteArray(32), initial_wallet: Key, role_flags: U32) -> U256 (user_id)
```

Role flags (additive): `TENANT = 1`, `LANDLORD = 2`, `PROPERTY_MANAGER = 4`.
Errors: `1200` NotAuthorized · `1201` MissingIdentityHash · `1202` IdentityAlreadyRegistered ·
`1203` InvalidUserId · `1204` WalletAlreadyLinked · `1205` WalletAlreadyActive.

Event `UserCreated { user_id, active_wallet, role_flags }` → backend indexes `user_id`.

### 5.2. Create agreement — `Lease::create_lease_agreement`

```
create_lease_agreement(params: CreateLeaseAgreementParams) -> U256 (lease_agreement_id)
caller: landlord wallet (active user + LANDLORD role)
```

One call atomically: creates the deposit invoice + N monthly rent invoices in Escrow,
mints a frozen lease NFT to the tenant, optionally grants equity-eligibility, stores the agreement.

**`CreateLeaseAgreementParams`** (order matters for bytesrepr):

| #   | Member                      | Type                        | Note                                                                  |
| --- | --------------------------- | --------------------------- | --------------------------------------------------------------------- |
| 1   | `tenant`                    | `U256`                      | tenant's `user_id` (NOT wallet); active + tenant-role; ≠ landlord     |
| 2   | `rent_distribution_terms`   | `RentDistributionTerms`     | see below                                                             |
| 3   | `equity_option`             | `Option<LeaseEquityOption>` | `None` or `{ property_id: U256 }` (lease-to-own)                      |
| 4   | `monthly_rent`              | `CurrencyAmount`            | `amount > 0`                                                          |
| 5   | `security_deposit`          | `CurrencyAmount`            |                                                                       |
| 6   | `start`                     | `U64`                       | unix seconds                                                          |
| 7   | `end`                       | `U64`                       | `end > start`; `(end - start) % 2_592_000 == 0` (multiple of 30 days) |
| 8   | `invoice_validity_duration` | `U64`                       | seconds until invoice deadline                                        |

`RentDistributionTerms`: `{ property_manager: Option<U256>, property_manager_bps: U32 }`
(bps: 10_000 = 100%; must be `0` if `property_manager == None`).

`CurrencyAmount`: `{ currency: Option<Key>, amount: U256 }`
(`currency: None` = native CSPR; otherwise a CEP-18 token contract, e.g. cUSD; `amount` in smallest units).

`LeaseEquityOption`: `{ property_id: U256 }`.

Event `LeaseAgreementCreated { lease_agreement_id, created_at }`
(+ `EquityEligibilityGranted` if equity_option was set).
→ Backend indexes, reads `token_id` via `get_lease_agreement_by_id`, sets the lease `active`.

Errors: `400` CallerNotLandlord · `402` EqualTenantAndLandlord · `403` InvalidTimeframes ·
`404` ZeroAmount · `409` InvalidPropertyStatus · `410` InvalidPropertyIssuer ·
`411` InvalidPropertyManagerBps · `412` InvalidPropertyManager ·
`414` TenantAlreadyEquityEligible · `415` InvalidTenant.

> The NFT is minted **inside** this call (frozen for the whole lease lifecycle); its
> metadata only holds `lease_agreement_id`. Source of truth for terms is `get_lease_agreement_by_id`.

### 5.3. Finalize / prolong

```
finalize_lease_agreement(lease_agreement_id: U256, security_deposit_charge: U256)
   caller: landlord; only after end and once all invoices are paid;
   releases deposit (minus charge), revokes equity, is_finished = true.
   Event: LeaseAgreementFinished.

prolong_lease_agreement(lease_agreement_id: U256, new_end: U64, invoice_validity_duration: U64)
   caller: landlord; only after end; new_end > end and multiple of 30 days;
   creates additional monthly invoices, updates end (NFT unchanged).
   Event: LeaseAgreementProlonged.
```

Common errors: `401` InvalidLeaseAgreementId · `405` InvalidLandlord ·
`406` LeaseAgreementHasNotFinishedYet · `407` NotAllInvoicesArePaid · `413` LeaseAlreadyFinalized.

### 5.4. View functions (read-only, for the indexer/reconciliation)

| Entry point                  | Args                               | Returns          |
| ---------------------------- | ---------------------------------- | ---------------- |
| `get_lease_agreement_by_id`  | `lease_agreement_id: U256`         | `LeaseAgreement` |
| `get_lease_agreements_count` | —                                  | `U256`           |
| `is_security_deposit_paid`   | `lease_agreement_id: U256`         | `Bool`           |
| `is_all_invoices_paid`       | `lease_agreement_id: U256`         | `Bool`           |
| `is_equity_eligible`         | `property_id: U256, account: U256` | `Bool`           |

### 5.5. Events to index (backend → DB)

| Event                                  | Backend action                                                |
| -------------------------------------- | ------------------------------------------------------------- |
| `UserCreated`                          | write `onchain_user_id` into the profile                      |
| `LeaseAgreementCreated`                | link off-chain lease to `lease_agreement_id`, status `active` |
| `LeaseAgreementProlonged`              | update lease `endDate`                                        |
| `LeaseAgreementFinished`               | status `terminated`/`completed`, deposit released             |
| `EquityEligibilityGranted` / `Revoked` | update tenant's equity status                                 |

---

## 6. Party consent: EIP-712

Consent of landlord+tenant is captured by an **EIP-712 typed-data** signature — the
wallet shows human-readable fields (rent, deposit, term, property…), the user signs
off-chain **gaslessly**. On Casper the libraries are ready:
`@casper-ecosystem/casper-eip-712` (FE, npm) and `casper-eip-712` (contract, Rust crate);
both produce identical hashes.

### Phase 0 (hackathon) — EIP-712 off-chain only · NO contract change

```
FE (npm):     builds domain + typed message of the lease terms
wallet:       signTypedData(domain, types, message) → signature (gasless)
FE → backend: POST /leases/:id/sign { role, signature, signerWallet }
backend:      verifies signerWallet matches the active wallet, stores the signature
```

- The contract does NOT verify the signature — `create_lease_agreement` stays as-is (caller=landlord).
- The signature = **legal/audit proof of consent** off-chain.
- Tenant's on-chain consent in Phase 0 = they pay the deposit themselves (`Escrow.pay_invoice`, §2 step 4).
- Block `/commit` until both signatures exist.

Example typed message (Phase 0 — fields fix the terms later passed to `create_lease_agreement`):

```jsonc
// domain:  { name: "LeaseFi", version: "1", chainId, verifyingContract }
// message (LeaseConsent):
{
  "leaseId": "string",
  "landlordUserId": "0",
  "tenantUserId": "0",
  "monthlyRent": "250000000000000000",
  "securityDeposit": "...",
  "currency": "0x..|null",
  "start": 0,
  "end": 0,
  "documentHash": "0x00..00", // Phase 0: zero stub
  "nonce": 0,
  "deadline": 0,
}
```

### Phase 1 — on-chain verification (requires a contract change)

Once the facilitator/relayer arrives and the key question is settled:

```
create_lease_agreement(params, tenant_signature)   // ← new param
   contract: hash_typed_data(domain, consent) → recover signer
             → assert signer == user_registry.get_active_wallet(tenant)
             → only then create the agreement
```

- Gives **cryptographic tenant consent on-chain**, while the landlord submits (tenant needs no gas for this step).
- This is the design-reference model (`docs/client-doc/leasefi-design-reference.html`),
  but without requiring the tenant to submit the create transaction.

> ⚠️ **Caveat (keys):** EIP-712 recovery is secp256k1 (Ethereum-style). Casper wallets
> can be ed25519 OR secp256k1; for ed25519, `ecrecover` does not work directly. Before
> Phase 1, settle with the SC team: require secp256k1, or use a Casper-native verification path.

> Divergence from the design reference: it describes the **Phase 1** architecture
> (LeaseFactory/DepositVault/PaymentRouter, EIP-712 on-chain, IPFS hash, tenant submits
> create). The actual contracts today = **Phase 0** (Lease/Escrow/NFT/UserRegistry,
> landlord submits, EIP-712 off-chain). KYC is also post-hackathon.

---

## 7. Backend to-do

1. Off-chain lease CRUD (§3) + status transitions draft → pending-signatures → active.
2. EIP-712 signatures of both parties (§3 `/sign`, §6): verify `signerWallet`, store; block `/commit` until both exist.
3. Renewals CRUD + negotiations (§4).
4. Indexer for `Lease` and `UserRegistry` on-chain events (§5.5); reconcile via view functions before changing status.
5. `/commit` endpoint — accepts the on-chain result, validates against `get_lease_agreement_by_id`, activates the lease.
6. Lease PDF generation (`/document`); `documentHash`/`ipfsCid` — nullable stubs for now.
