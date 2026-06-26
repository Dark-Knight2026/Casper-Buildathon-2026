---
author: Anastasia
version: 0.1.0
created: 2026-06-18T00:00:00Z
last-modified: 2026-06-18T00:00:00Z
version-updated: 2026-06-18T00:00:00Z
---

# Lease Agreement & Renewals — Frontend Implementation Task List

> Contract source: [`docs/api/agreements_api.md`](./api/agreements_api.md), reconciled with the backend
> **`feat/lease-agreement`** branch (2026-06-18, built atop `feat/properties`).
> Scope: the **leases + renewals block**, wired to the **real Rust backend** (`backendClient`, `/api/v1`).
> **No Supabase — anywhere.** "Done" = wired to the real backend (mock removed).

## The one fact that changes everything

The leases + renewals backend is **built** on `feat/lease-agreement`: `/api/v1/leases` (create/get/list/edit/
delete/submit/**sign**/**commit**/document) and `/api/v1/renewals` (create/get/list/**respond**/negotiations) are
implemented. The Lease contract indexer (`LeaseAgreementCreated/Finished/Prolonged`) is wired. So this block is
**no longer BE-blocked** — it's real integration, not waiting. The matching ⛔ rows in `FRONTEND_MVP_TASKS.md`
are now stale.

## What the FE has today (audit)

There is a large **legacy/mock** lease+renewal surface (Supabase-era + standalone mock), much of it duplicated
across `pages/lease/*`, `pages/tenant/*`, `pages/landlord/*`. Reuse the **UI shells**, rewire the data layer.

| Area                                                                                                                         | Today                                     | Verdict                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `services/leaseApi.ts`, `leaseManagementService.ts`, `leaseRenewalService.ts`, `renewalService.ts`, `leaseStorageService.ts` | Supabase / mock, old shapes               | 🟡 replace with `backendClient` services                       |
| `services/leaseGenerationService.ts`, `leaseTemplateEngine.ts`, `renewalReminderService.ts`                                  | client-side doc/templating                | 🔴 dead — doc is server-rendered now (`/document`)             |
| `types/lease.ts`, `types/renewal.ts`                                                                                         | flat legacy shapes                        | 🟡 replace with wire contracts (kebab status, on-chain fields) |
| `pages/lease/*` (Wizard/Details/Documents/Signing/Management), `pages/{tenant,landlord}/*Lease*`, `*Renewal*`                | mock data, old flow                       | 🟠 reuse shells, rewire                                        |
| CSPR.click sign host (`PropertyOnChainRegistration`, wallet-link proof)                                                      | working deploy- + message-signing pattern | 🟢 reuse for sign + commit                                     |

## Contract facts to bake in (read before coding)

- **Money is a JSON `number` (f64) here** — `monthlyRent` / `securityDeposit` / `proposedRent` are **numbers, not
  strings** (differs from the analytics/payments `Decimal`-as-string convention). On-chain ids ARE strings.
- **Status enums are kebab-case on the wire** — `LeaseStatus`: `draft`, `pending-signatures`, `under-review`,
  `pending-approval`, `active`, `expiring-soon`, `expired`, `terminated`, `renewed`. `RenewalStatus`: `draft`,
  `sent`, `under-review`, `accepted`, `rejected`, `countered`, `expired`. **Only `draft` is editable/deletable.**
  `under-review` / `pending-approval` / `expired` / `renewed` have **no backend transition** on this branch →
  treat as **display-only / future** (don't build flows that set them).
- **Signing is a real Casper _message_ signature, NOT EIP-712 and NOT a state flip.** Both `landlord` and `tenant`
  call `POST /leases/{id}/sign` with `{ role, signature, signerWallet }`. The FE must rebuild the canonical message
  **byte-identically** (the verifier prepends `Casper Message:\n`):
  `LeaseConsent|lease={id}|landlord={landlordId}|tenant={firstTenantId}|rent={monthlyRent}|deposit={securityDeposit}|currency={currency}|start={startDate}|end={endDate}`
  (`signedAt` excluded). `signerWallet` must equal the caller's active wallet. → CSPR.click **`signMessage`** (same
  pattern as the wallet-link ownership proof).
- **Commit is a separate on-chain deploy** the **landlord** signs (`create_lease_agreement` via CSPR.click), then
  reports `{ onchainLeaseId, nftTokenId, commitTxHash }` to `POST /leases/{id}/commit`. Gated on **both parties
  signed**; idempotent; flips `pending-signatures → active`. Same deploy-signing pattern as property registration.
- **Document endpoint returns the `Lease` JSON** (not PDF bytes): `GET /leases/{id}/document` re-renders +
  re-stores (plain text in hackathon) and returns the lease with `documentLinks.generatedPDF`, `documentHash`,
  `ipfsCid` refreshed. It's a **GET with side effects**.
- **Indexer caveats:** `LeaseAgreementCreated` → `active` (dual path w/ commit, idempotent); `Finished` →
  `terminated`; **`Prolonged` is log-only** — after a renewal `prolong_lease_agreement`, the lease's `endDate` does
  **NOT** auto-update from the indexer. Match key = `onchainLeaseId`.

---

## A. Types + service layer

|     | ID   | Task                                                                                                                                                                                                                                                                                                                                                                                                                                | Effort | Files                                  |
| --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| [x] | LA-1 | **Lease wire contract.** `types/leaseContract.ts`: `Lease` (all fields incl. `tenantIds[]`, `signatureProgress`, `consentSignatures`, `documentLinks{generatedPDF,signedPDF}`, `documentHash`, `ipfsCid`, `onchainLeaseId`, `nftTokenId`, `commitTxHash`), `LeaseType`, `LeaseStatus` (kebab, 9 variants), `Clause`, request bodies (`CreateLeaseBody`/`UpdateLeaseBody`/`SignLeaseBody`/`CommitLeaseBody`). **Money as `number`.** | 🟢     | `types/leaseContract.ts` (new)         |
| [x] | LA-2 | **Renewal wire contract.** `types/renewalContract.ts`: `Renewal` (single `tenantId`, `counterOffer`), `RenewalStatus` (kebab, 7), `CounterOffer`, `Negotiation` (`kind: message\|counter-offer`, `body`/`proposedTerms`), request bodies (`CreateRenewalBody`/`RespondRenewalBody`/`PostNegotiationBody`).                                                                                                                          | 🟢     | `types/renewalContract.ts` (new)       |
| [x] | LA-3 | **Lease service.** `services/leaseService.ts` on `backendClient`: `createLease`, `getLease`, `listLeases({tenantId\|landlordId:'me', status, page, pageSize})`, `updateLease` (PATCH), `deleteLease`, `submitLease`, `signLease`, `commitLease`, `getLeaseDocument`.                                                                                                                                                                | 🟢     | `services/leaseService.ts` (new)       |
| [x] | LA-4 | **Renewal service.** `services/renewalService.ts` (replace legacy): `createRenewal`, `getRenewal`, `listRenewals`, `respondRenewal`, `getNegotiations`, `postNegotiation`.                                                                                                                                                                                                                                                          | 🟢     | `services/renewalService.ts` (rewrite) |

## B. Leases — list + detail

|     | ID   | Task                                                                                                                                                                                                    | Effort | Files                                                                |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| [x] | LA-5 | **Tenant + landlord lease lists** wired to `listLeases({tenantId:'me'})` / `{landlordId:'me'}` with `status` filter + pagination; `LeaseStatus` badge (kebab→label/colour). Remove mock.                | 🟠     | `pages/tenant/TenantLeases.tsx`, `pages/landlord/LandlordLeases.tsx` |
| [x] | LA-6 | **Lease detail** from `getLease(id)` — terms, parties, clauses, `signatureProgress`, on-chain row (`onchainLeaseId`/`commitTxHash` → cspr.live), document links. Party-gated (403 → not-a-party state). | 🟠     | `pages/lease/LeaseDetailsPage.tsx` (+ tenant/landlord detail)        |

## C. Leases — create / edit / submit (landlord)

|     | ID   | Task                                                                                                                                                                                                                           | Effort | Files                             |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------- |
| [x] | LA-7 | **Create-lease wizard** → `POST /leases` (`propertyId`, `tenantId`, `type`, dates, rent/deposit/currency, optional PM split + `clauses[]`). Client-validate duration = whole 30-day months; surface backend `400`/`403`/`404`. | 🟠     | `pages/lease/LeaseWizardPage.tsx` |
| [x] | LA-8 | **Edit draft** → `PATCH /leases/{id}` (draft-only; `409` if not draft). **Delete draft** → `DELETE` with `ConfirmationDialog` (`409` if not draft). Gate edit/delete UI on `status==='draft'`.                                 | 🟢     | wizard / detail                   |
| [x] | LA-9 | **Submit for signing** → `POST /leases/{id}/submit` (`draft → pending-signatures`; needs a tenant; `409` otherwise).                                                                                                           | 🟢     | detail                            |

## D. Signing (Casper message — both parties)

|     | ID    | Task                                                                                                                                                                                                                                                                                                                                                                                          | Effort | Files                                                             |
| --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| [x] | LA-10 | **`buildLeaseConsentMessage(lease)`** helper — produce the exact `LeaseConsent\|…` string (byte-identical to backend). Unit-test it.                                                                                                                                                                                                                                                          | 🟢     | `lib/leaseConsent.ts` (new) + test                                |
| [x] | LA-11 | **Sign action** on the signing page: CSPR.click `signMessage` of the consent string → `POST /leases/{id}/sign` `{ role, signature, signerWallet }`. Mount the hidden SDK host on demand (cf. `PropertyOnChainRegistration`); `signerWallet` = active wallet. Show per-party progress from `signatureProgress`; handle `401` verify-failed / `403` party/wallet mismatch / `409` not-awaiting. | 🔴     | `pages/lease/LeaseSigningPage.tsx`, `pages/TenantSigningPage.tsx` |

## E. Commit on-chain (landlord) + activation

|     | ID    | Task                                                                                                                                                                                                                                                                                                                                                                       | Effort | Files                                           |
| --- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| [ ] | LA-12 | **Commit flow** — gated until both signed. Landlord signs the `create_lease_agreement` deploy via CSPR.click (reuse `useBlockchainTransaction`), captures `onchainLeaseId` + `nftTokenId` + `commitTxHash`, then `POST /leases/{id}/commit` → `active`. Idempotent (already-active returns 200). Surface `409` (signatures missing / on-chain finished) + `500` transport. | 🔴     | `pages/lease/LeaseManagementPage.tsx` or detail |
| [ ] | LA-13 | **Activation/status reconciliation (display).** Drive an "on-chain active" indicator from `onchainLeaseId != null`; note the dual path (commit vs indexer) — poll `getLease` after commit so the indexer-driven flip surfaces.                                                                                                                                             | 🟢     | detail                                          |

## F. Document

|     | ID    | Task                                                                                                                                                                                                                                                                                                                  | Effort | Files                                |
| --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| [x] | LA-14 | **Lease document** — call `GET /leases/{id}/document` (returns the `Lease` with refreshed `documentLinks.generatedPDF`/`documentHash`/`ipfsCid`); link out to the stored doc + show hash/CID. ⚠️ GET-with-side-effects → call on explicit "Generate/Refresh", not on every render. (Hackathon = plain text, not PDF.) | 🟠     | `pages/lease/LeaseDocumentsPage.tsx` |

## G. Renewals

|     | ID    | Task                                                                                                                                                                                                                                                       | Effort | Files                                                                    |
| --- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| [x] | LA-15 | **Renewal lists** (tenant + landlord) → `listRenewals({tenantId\|landlordId:'me'})`; status badge. Remove mock.                                                                                                                                            | 🟠     | `pages/tenant/TenantRenewals.tsx`, `pages/landlord/LandlordRenewals.tsx` |
| [x] | LA-16 | **Create renewal offer** (landlord, lease `active`/`expiring-soon`) → `POST /renewals` (`leaseId`, `proposedRent`, `proposedTermMonths`, `proposedStartDate`, optional reason/deadline). `409` if lease not active.                                        | 🟠     | `pages/landlord/renewals/*`                                              |
| [x] | LA-17 | **Tenant respond** → `POST /renewals/{id}/respond` `{ decision: accept\|reject\|counter, counterOffer? }`; `counterOffer` required for `counter`. Detail shows status + counter terms.                                                                     | 🟠     | `pages/tenant/TenantRenewalDetail.tsx`                                   |
| [x] | LA-18 | **Negotiation thread** → `GET/POST /renewals/{id}/negotiations` (`kind: message \| counter-offer`; `body` vs `proposedTerms`). Append-only, oldest-first; both parties post. NB: the thread is **separate** from the renewal's own `counterOffer`.         | 🟠     | renewal detail (both roles)                                              |
| [x] | LA-19 | **Prolong caveat (display).** After an accepted renewal + landlord `prolong_lease_agreement`, the indexer is **log-only** → lease `endDate` won't auto-update. Show the renewal's accepted terms; don't imply the lease dates changed until BE reconciles. | 🩹     | renewal/lease detail                                                     |

## H. Cleanup (separate PR — defer, like PL-25)

|     | ID    | Task                                                                                                                                                                                                                                                                                                                                                                                                | Effort | Files     |
| --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| [ ] | LA-20 | **Delete dead legacy lease/renewal code** once the wired pages land: `leaseApi.ts`, `leaseManagementService.ts`, `leaseRenewalService.ts`, `leaseGenerationService.ts`, `leaseTemplateEngine.ts`, `renewalReminderService.ts`, `leaseStorageService.ts`, old `types/lease.ts`/`renewal.ts`, and orphaned mock pages. Verify routes before deleting. **Do in its own PR, not with the integration.** | 🟠     | (cleanup) |

---

## Notes / open items

- **Money type:** keep `monthlyRent`/`securityDeposit`/`proposedRent` as `number` in the contracts (backend f64).
  Format for display; don't coerce to string.
- **Display-only statuses:** `under-review`, `pending-approval`, `expired`, `renewed` (lease) and `draft`,
  `under-review`, `expired` (renewal) have no setter on this branch — render them if received, but build no flow
  that transitions _into_ them.
- **`signedPDF`** in `documentLinks` is never written yet (always null) — no signed-PDF surface to build.
- **Approvals page:** `under-review`/`pending-approval` lease statuses are unreachable now — any "approval" UI is
  future; don't wire it to a non-existent transition.
- **Lease origination from applications (LA-7 extension):** an approved `RentalApplication` on `ApplicationDetail`
  shows a **Create lease** action that opens `LeaseFormPage` pre-filled via router state
  (`propertyId = application.listing.propertyId`, `tenantId = application.userId`, and `monthlyRent` /
  `securityDeposit` seeded from the listing's `rent_ltr` terms via `listingRentMonthly`/`listingSecurityDeposit`).
  `propertyId`/`tenantId` are
  **off-chain DB UUIDs** (not on-chain registry ids — those resolve at commit, LA-12). The create form now also
  offers pickers: **Property** from the landlord's listings (deduped) and **Tenant** from applicants (narrowed to
  the selected property), each falling back to a manual UUID input when no options exist.
- **Lease duration is a term picker, not a free end date:** the backend requires `(end - start)` to be a whole
  multiple of **30 days** (a "month" here = 30 days, NOT a calendar month — a 365-day year is invalid). The form
  takes `Start date` + `Term (months)` and computes `endDate = start + term×30d`, so it's valid by construction;
  edit mode derives the term back from the stored dates.
