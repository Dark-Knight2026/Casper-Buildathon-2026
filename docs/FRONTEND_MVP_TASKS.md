---
author: Anastasia
version: 0.7.0
created: 2026-05-18T08:08:02Z
last-modified: 2026-06-24T00:00:00Z
version-updated: 2026-06-24T00:00:00Z
---

# LeaseFi — Frontend MVP Task Tracker

> Scope source: [`docs/LEASEFI_MVP_SPEC_2026-07-15.md`](./LEASEFI_MVP_SPEC_2026-07-15.md) — **§0 Phase 0 (Hackathon)** is the current priority; **§3 "Definition of Done"** is the MVP stage that follows.
> Delivery targets: **Phase 0 hackathon — 2026-06-30**; MVP — **2026-07-15**. This tracker covers the **frontend** slice of both: Phase 0 (§0 below) + §3 DoD.

## "Done" criterion

- **`[x]` = done** — UI is wired to the **real Rust backend** (`backendClient` / `backendAuthService` / `userProfileService`) and works.
- **`[ ]` = NOT done** — even if a UI exists. Each item carries a reason tag:

| Tag                | Meaning                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| 🟢 REAL            | Works against the real backend                                                                       |
| 🟡 SUPABASE→REWIRE | UI exists but talks to the **dead** Supabase layer — must be rewired to the Rust backend             |
| 🟠 MOCK            | UI exists but runs on hardcoded mocks                                                                |
| 🔴 MISSING         | UI/component absent — build from scratch                                                             |
| ⛔ BE-BLOCKED      | FE cannot be completed: the matching backend endpoint is not ready (only auth + profile exist today) |
| ⏸ SPEC-OPEN        | Blocked by an open spec question (§6) — decision is not on FE                                        |

> **Integration reality as of 2026-05-18:** the backend serves **only** `/api/v1/auth/*` and `/api/v1/users/me*`. Everything else (properties, leases, payments, KYC, termination, dashboard data) is ⛔ BE-BLOCKED until a contract exists.
>
> **Update 2026-06-18:** the **property-listing block is no longer BE-blocked** — the `feat/properties` backend ships `/api/v1/properties` + `/api/v1/listings` (+ favorites / applications / viewings, re-homed onto `listingId`) and the FE is wired to it. See [`PROPERTY_LISTING_IMPLEMENTATION_TASKS.md`](./PROPERTY_LISTING_IMPLEMENTATION_TASKS.md) for the detailed status. Leases, payments, KYC, termination and dashboard data remain ⛔ BE-BLOCKED.

> **Design-reference alignment (2026-05-26):** Anthony confirmed via Slack that we take **information / flow / copy** from `docs/client-doc/leasefi-design-reference.html` and keep our existing **header layout, palette, fonts, icons, and invisible-wallet UX**. Implementation work derived from the reference is tracked as **Tasks 17–26** in [`CLIENT_FEEDBACK_BACKLOG.md`](./CLIENT_FEEDBACK_BACKLOG.md). Cross-references appear inline in the relevant §3.x sections below.

---

## §0. Phase 0 — Hackathon (current priority)

> Scope: spec **§0** (hackathon starter, deadline **2026-06-30**). Crypto-only (testnet **CSPR / cUSD**), **email + password** auth, **tenant + landlord** only — full delta in spec §0.3.
> **"Done" here ≠ the MVP bar.** Phase-0 done = the **on-chain flow works in the demo** against testnet contracts, not "wired to the Rust backend". Only the **frontend** H-tasks are tracked here; the full cross-team H-list (contracts/backend/AI/demo) lives in spec §0.4.
> 🚫 **No Supabase — anywhere.** All off-chain data goes through the **Rust backend** (`backendClient` / `backendAuthService` / `userProfileService`); on-chain via **Casper** (wallet-submitted tx, read back through the backend/indexer). The legacy Supabase services are **dead** — reuse the UI shells but **do not call or extend Supabase**.

| H    | Frontend task                                              | Must/Nice | Status                                                                                                                                                |
| ---- | ---------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-11 | Email + password auth UI (sign-up / sign-in / reset)       | MUST      | 🔴 MISSING + ⛔ BE — current auth is CSPR.click social; needs backend H-7 (email+pass)                                                                |
| H-12 | Wallet connect — simple Casper wallet, testnet CSPR / cUSD | MUST      | 🟡 PARTIAL — CSPR.click invisible-wallet provisioning exists (§3.1); add explicit connect + testnet-token transacting                                 |
| H-13 | Landlord: list property → on-chain **NFT mint**            | MUST      | 🔴 reuse `PropertyCreate.tsx` **UI shell** → wire to **Rust backend + Casper mint** (drop Supabase) · ⛔ contract                                     |
| H-14 | Lease create + **sign** → on-chain record                  | MUST      | 🔴 reuse `LeaseCreationWizard.tsx` **UI shell** → wire to **Rust backend + Casper sign/record** (drop Supabase) · ⛔ contract                         |
| H-15 | Deposit + rent-payment flows (escrow / treasury)           | NICE      | 🟠 IN PROGRESS — **BE unblocked** (`feat/payment`: `/invoices` + escrow indexer); FE tasks tracked in §3.5b (P-0…P-4)                                 |
| H-16 | Hide out-of-scope features behind feature flags            | —         | 🟢 **can start now (pure FE)** — flag off PM role, lease option, termination, dashboards/accounting without deleting code (`src/lib/featureFlags.ts`) |

**Notes**

- **H-16 is the only no-dependency FE task** — start here; it de-clutters the demo to the must-have spine (list property → sign lease).
- **H-13 / H-14** reuse only the **UI shell** of property-create + lease-wizard — data integration is **Rust backend + Casper, never Supabase**.
- **H-12** keeps the invisible-wallet UX from §3.1; Phase 0 adds explicit testnet **CSPR / cUSD** transacting (no on-ramp / conversion).
- "investor" check (spec **H-20**) overlaps the MVP item in §3.8.
- Cross-team, not FE-dev: contracts **H-1…H-6**, backend **H-7…H-10**, AI-plan **H-17**, GitHub **H-18**, demo video **H-19** — see spec §0.4.

---

## Summary

> Below this line: the **MVP** tracker (§3 DoD) — the _next_ stage after Phase 0.

| Section                               | Done   | Total  | Main blocker                                                                                  |
| ------------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------- |
| 3.1 Auth & Onboarding                 | 4      | 5      | KYC                                                                                           |
| 3.2 Profiles (3 roles)                | 0      | 4      | role data ⛔, no PM role                                                                      |
| 3.3 Properties                        | 6      | 6      | ✅ wired to Rust backend (`feat/properties`) — see PROPERTY_LISTING tracker                   |
| 3.4 Lease Agreement                   | 0      | 6      | lease option / cap / signing absent                                                           |
| 3.5 Payments & Disbursement           | 0      | 5      | fiat/Stripe still gated; **crypto invoice/escrow now UNBLOCKED** (`feat/payment`) — see §3.5b |
| 3.5b Crypto Payments (invoice/escrow) | 11     | 13     | 🟢 BE ready; Phases 0–3 + on-chain id fallback done — only polish (P-4.1/4.2) left            |
| 3.6 Termination                       | 0      | 4      | no UI flow, ⛔ BE                                                                             |
| 3.7 Dashboards & Accounting           | 0      | 4      | mocks + Supabase, no PM                                                                       |
| 3.8 Compliance & Privacy (FE part)    | 2      | 6      | KYC / audit ⛔ BE, PII access                                                                 |
| 3.9 Production deploy (FE part)       | 0      | 3      | CI/CD to chosen host                                                                          |
| 3.10 Geographic Pilot                 | 0      | 8      | state gating ⛔ BE re-validation                                                              |
| **Total**                             | **12** | **51** | (3.3 Properties: 1→6 done after the `feat/properties` wiring)                                 |

---

## §3.1 Auth & Onboarding

- [x] **Sign-up / sign-in via CSPR.click** — 🟢 REAL
  - `getNonce` → `signMessage` (CSPR.click) → `loginWithSignature` fully on backend.
  - `src/services/ico/backendAuthService.ts`, `src/hooks/ico/useBackendAuth.ts`, `src/pages/auth/Login.tsx`, `src/pages/auth/AuthCallback.tsx`.
  - ⚠️ Verify: `register/constants.tsx` social providers = Google + Apple; SDK actually supports Google + Email (Apple/Passkey = v2). Reconcile with the live CSPR.click version; keep copy provider-agnostic.
- [x] **Wallet provisioned transparently (no "create/connect wallet" CTA)** — 🟢 REAL
  - No wallet CTA in the auth flow — CSPR.click handles it during social login.
  - ⚠️ Verify `components/blockchain/WalletConnect.tsx` (ICO dropdown) does not leak into any MVP screen.
- [ ] **KYC flow completable (Sumsub widget)** — 🔴 MISSING + ⛔ BE-BLOCKED
  - `kyc_status` exists only in `src/types/blockchain.ts`, never read/shown. No Sumsub widget.
  - FE work: embed Sumsub WebSDK widget, KYC status screen, gate "no KYC → no lease/payment".
  - Block: backend does not create the applicant nor serve the webhook status.
- [x] **Email verification & email change** — 🟢 REAL
  - Initial verify: `sendVerificationEmail` / `resendVerificationEmail` / `confirmEmailVerification` (backendAuthService) → landing page `src/pages/auth/VerifyEmail.tsx` (routed `/verify-email`).
  - Email change: `requestEmailChange` / `confirmEmailChange` (`/api/v1/users/me/email[/confirm]`, userProfileService) → `ChangeEmailDialog` + landing page `src/pages/auth/ConfirmEmailChange.tsx` (routed `/confirm-email-change`).
  - Status + resend surfaced via `EmailVerificationCard`, mounted on tenant & landlord profiles.
- [x] **Profile editable (avatar, personal data)** — 🟢 REAL
  - `src/pages/tenant/TenantProfile.tsx` → `AuthContext.updateProfile` (`PATCH /api/v1/users/me`) + `uploadAvatar` (`POST /api/v1/users/me/avatar`, S3). `RoleSwitchDialog` → `patchMyRole` with reauth gate.
  - ⚠️ This is the tenant profile page. Landlord profile-edit page now exists (`src/pages/landlord/LandlordProfile.tsx`); PM profile-edit page still missing (see §3.2).

> _Design-reference cross-cut:_ **Task 26** — `<KYCGate/>` wrapper around the Sumsub WebSDK widget gates sensitive actions (sign lease, pay rent, fund deposit). Per Anthony 2026-05-20: Sumsub is the sole KYC service — no separate AML/CDD lookup, OFAC API, or extra biometric layer on top (Sumsub handles identity, document checks, and liveness internally). We store only `sumsub_applicant_id + kyc_status + timestamp`.

## §3.2 Profiles (3 roles)

- [ ] **Tenant profile with lease history, payment history, equity balance** — 🟠 MOCK + ⛔ BE-BLOCKED
  - Profile identity is 🟢 REAL (`getMe`), but leases/payments/equity in `src/pages/tenant/TenantDashboard.tsx` = `MOCK_LEASE`/`MOCK_PAYMENTS` (TODO: "remove when /api/v1/leases ready").
- [ ] **Landlord profile: properties, active leases, received rent** — 🟡 SUPABASE→REWIRE + ⛔ BE-BLOCKED
  - `src/pages/landlord/LandlordProfile.tsx` now exists (route `/landlord/profile`, `App.tsx:357`). Identity is 🟢 REAL (`getMe` + `uploadAvatar`); dashboard stats = `MOCK_LANDLORD_DASHBOARD_STATS` (TODO(BE): `GET /api/v1/landlord/stats`).
  - `src/pages/landlord/LandlordDashboard.tsx` now runs on mock fixtures (`MOCK_LANDLORD_DASHBOARD_STATS` / `MOCK_LANDLORD_RECENT_ACTIVITIES` from `src/data/landlordMockData.ts`) — no Supabase calls remain. TODO(BE): wire stats + recent-activity to the Rust API (`GET /api/v1/landlord/stats`, activity feed).
- [ ] **Property Manager profile (aggregated view)** — 🔴 MISSING
  - No `property_manager` in `UserRole` (`src/types/user.ts`); only a stub template in `DashboardTemplates.tsx`. Needs role enum, route, context.
- [ ] **`company tag` slot in all 3 profile types** — 🔴 MISSING
  - No `company_tag`/`companyTag` anywhere. Add to profile form/display (groundwork for Phase 1.1).

## §3.3 Properties

- [x] **Property CRUD (landlord/PM)** — 🟢 REAL (wired to `feat/properties`)
  - `src/pages/landlord/properties/{PropertyCreate,PropertyEdit,PropertyDetail,PropertyList}.tsx` now run on `propertyAssetService` + `listingService` against the Rust backend (Property/Listing split); Supabase `propertyService` dropped. Create/edit (incl. `PUT /properties/{id}`), lifecycle, media, withdraw all wired. See PROPERTY_LISTING tracker (PL-9…16, PL-38, PL-40).
- [ ] **Numeric `declared_mortgage_value` field on property** — 🔴 MISSING
  - Absent from `src/types/property.ts` and forms. Add input + validation (groundwork for cap §3.4).
- [ ] **Mortgage documentation upload (prerequisite for lease option)** — 🔴 MISSING + ⛔ BE-BLOCKED
  - Storage resolved (2026-05-21): IPFS pin via BE-proxied `/api/v1/ipfs/pin` with mandatory client-side encryption for PII-bearing files (spec §5.2 / §5.5 / §6 Resolved). FE: upload widget that encrypts client-side, posts the blob to the pin endpoint, keeps the lease-option toggle disabled without a document. Blocked until the BE pin endpoint ships.
- [x] **Property search + filtering** — 🟢 REAL (wired to `GET /listings`)
  - `src/pages/tenant/PropertySearch.tsx` runs on real `GET /listings` (`useInfiniteQuery`), with backend filters: text, rent, bedrooms/bathrooms, living-area, amenities, pets/furnished, geo "near me", and sort (incl. views). No more in-memory `FEATURED_PROPERTIES`. See PROPERTY_LISTING tracker (PL-17/18/39).
- [x] **Property detail page + Google Maps link** — 🟢 REAL
  - `src/pages/tenant/PropertyDetail.tsx` runs on `getListing(id)` (router-state hydrate + fetch), with Property+Listing data, badges, view tracking and apply. Maps link still keyless via `VerificationDisclaimer`. See PROPERTY_LISTING tracker (PL-20).
- [x] **Disclaimer block** — 🟢 REAL (no backend needed)
  - `src/components/property/VerificationDisclaimer.tsx` — static component on the detail page. Ensure it is mounted on all MVP property screens.

## §3.4 Lease Agreement

- [ ] **Create lease form (rent, term, PM split %)** — 🟡 SUPABASE→REWIRE + 🔴 PM split MISSING + ⛔ BE
  - `src/pages/landlord/lease/LeaseCreationWizard.tsx` + `components/lease/wizard/FinancialTermsStep.tsx`: rent/term/deposit present; **no "PM split %" field** (only `agentCommission`). Persists via `leaseManagementService.ts` (Supabase). Add PM split % field + rewire.
- [ ] **Lease option block (mortgage value, sale price, monthly payment, interest rate, term)** — 🔴 MISSING
  - No lease-option / lease-to-own UI. Design a dedicated wizard step + types + live breakdown preview.
- [ ] **120% cap on FE (`total_sale_price ≤ declared_mortgage_value × 1.20`)** — 🔴 MISSING
  - No fields, no validation. FE guard layer: disable submit + inline error on breach (BE/contract layers separate).
- [ ] **Lease recorded on-chain only after finalization (drafts off-chain)** — 🔴 MISSING + ⛔ BE
  - No Casper lease integration. Need FE draft→finalized state + backend finalize call.
- [ ] **Cryptographic signing by both parties** — 🟡 SUPABASE→REWIRE + ⛔ BE-BLOCKED
  - Mechanism resolved (spec §5.6 / §6 Resolved): EIP-712 typed signing via `casper-eip-712`; both parties sign typed data via CSPR.click. FE consumes EIP-712 builders from the shared `@leasefi/types` package (no hand-rolled typed-data on FE). Current code is canvas e-sign only (`src/services/eSignatureService.ts` → Supabase, `src/types/signature.ts` = base64 image) — replace with the EIP-712 flow once the shared types package + BE finalize call ship.
- [ ] **Lease parameters immutable after signing** — ⛔ BE-BLOCKED
  - Invariant on BE/contract. FE: render parameters read-only post-sign, hide edit actions.

> _Design-reference cross-cut:_ **Task 22** (`/invite/:token` pre-auth landing), **Task 23** (landlord wizard + tenant counter-sign journey, 8 sub-screens — highest-complexity Critical 6 flow), **Task 21** (`<PreSignatureConfirmation/>` invoked at sign step).

## §3.5 Payments & Disbursement (fiat-first)

- [ ] **Basic Stripe integration (payment intent + webhook)** — 🟡 SUPABASE→REWIRE + ⛔ BE (feature flag OFF)
  - `PAYMENTS_ENABLED` (`src/lib/featureFlags.ts`) = off until `/api/v1/users/me` returns `stripe_customer_id`. `src/pages/tenant/MakePayment.tsx` shows `<ComingSoon>`; `stripeService.ts`/`paymentService.ts` on Supabase + mock customer id.
- [ ] **Stripe Connect / split payments (2% fee / PM% / landlord)** — 🔴 MISSING + ⛔ BE
  - No split logic (`connected_account_id`, `application_fee`) in the services.
- [ ] **Monthly recurring schedule** — 🔴 MISSING + ⛔ BE
  - `LeasePaymentSchedule` type exists but is not wired to UI.
- [ ] **Smart contract records payment and credits equity** — ⛔ BE-BLOCKED
  - Contract/indexer. FE: render payment events and equity accrual from backend data.
- [ ] **Order: rent FIRST → mortgage SECOND (UI display)** — ⛔ BE-BLOCKED
  - FE part: transparent payment breakdown (rent vs mortgage) from backend calc — uses shared component (see §3.7).

> _Design-reference cross-cut:_ **Task 20** (`<FeeDisplay/>` canonical breakdown — also reused in late fee, buyout, deposit funding, dispute filing), **Task 21** (`<PreSignatureConfirmation/>` before submit), **Task 25** (`<TransactionStatus/>` confirming pill). USDC only — not USDT.

## §3.5b Crypto Payments — Invoice / Escrow (`feat/payment`)

> **Goal:** the tenant pays the **security deposit** and **rent** on-chain with a convenient UX. Replaces the fiat-first §3.5 for the crypto MVP (Stripe stays flagged off).
> **BE reality (verified vs `origin/feat/payment`, not the stale local branch):** invoices are seeded at `POST /leases/{id}/commit` (1 deposit + N rent rows, `scheduled`); the indexer upgrades them to `pending` on `InvoiceCreated` and reconciles `partial`/`paid`/`released`/`refunded`. FE is **read + settle only**.
> **REST:** `GET /invoices` (filters: `tenantId=me`/`landlordId=me`/`leaseId`/`kind`/`status`/`propertyId`/`dueFrom`/`dueTo`/`sortBy`), `GET /invoices/{id}`, `POST /invoices/{id}/settlement` `{ amount, txHash }` (tenant-only), `GET /invoices/{id}/receipt`, `GET /invoices/summary?tenantId=me|landlordId=me`.
>
> **⚠️ On-chain reality the BE summary omits:** `escrow.pay_invoice(invoice_id, amount)` moves USDC via CEP-18 `transfer_from`, so **each payment = TWO deploys**: `approve(spender=escrow package, amount)` on the USDC token **then** `pay_invoice`. Contract reverts on: caller ≠ tenant's active wallet, `block_time > deadline` (expired), `amount == 0`, deposit `amount != amountDue`. `pay_invoice` needs `onchainInvoiceId` (U256) — **null until the indexer binds `InvoiceCreated`**, so the Pay button only lights up at `status ∈ {pending, partial, overdue}`.
>
> **Product decisions (2026-06-24, Anastasia):** (1) **rent** defaults to **full** amount with a _hidden_ partial-payment option (contract allows `≤ remaining`); (2) **deposit and rent are separate payments** (not bundled), shown together as "due before move-in".
>
> **Reuse (don't reinvent):** `createApproveTransaction` + `getBalance`/`getAllowance` (`src/services/ico/{icoPurchaseService,cep18Service}.ts`), `createContractCallTransaction` (`services/ico/casperClient.ts`), `useBlockchainTransaction` (sign→submit→poll), `lib/casper/leaseAgreement.ts` (encoder/error-map/gas pattern), `scaleToSmallestUnit` + `LEASE_CURRENCY`. CSPR.click is **not app-wide** — the payment surface must mount its own `ClickProvider`/hidden host.

**Phase 0 — config + data layer (blockers)**

- [x] **P-0.1** Add `VITE_ESCROW_PACKAGE_HASH` to env (`.env` + `.env.example` + `.env.production.example`), following the lease-agreement convention (read directly in `lib/casper/escrow.ts` with an `isEnabled` gate — kept out of the ICO bootstrap-validation list). casper-test hash set: `122d1083…f806dd8d`.
- [x] **P-0.2** `src/types/invoiceContract.ts` (wire types: `Invoice`, `InvoiceStatus`, `InvoiceKind`, `InvoiceSortBy`, `InvoiceListParams`, `SettlementRequest`, `ReceiptResponse`, `LandlordSummary`/`TenantSummary`) + `src/services/invoiceService.ts` (`listInvoices`/`getInvoice`/`settleInvoice`/`getReceipt`/`getTenantSummary`/`getLandlordSummary` on `backendClient`) + `src/hooks/useInvoices.ts` (`useInvoices`, `useInvoice`, `useTenantInvoiceSummary`, `useLandlordInvoiceSummary`, `useSettleInvoice`). 🟢 REAL — typechecks clean.

**Phase 1 — on-chain payment core**

- [x] **P-1.1** `lib/casper/cep18.ts` — standalone CEP-18 module: `buildApproveTransaction({ senderPublicKey, tokenHash, spenderPackageHash, amount, gas? })` + `isApproveNeeded({ tokenInstanceHash, ownerAccountHash, spenderPackageHash, requiredRaw })` (reuses `getAllowance` to skip a redundant approve). **ICO intentionally left untouched** (decision 2026-06-24): the module only read-reuses `createContractCallTransaction`/`getAllowance` (same pattern as `leaseAgreement.ts`); the ICO `createApproveTransaction` is NOT refactored, so a small approve-build duplication is accepted to avoid touching the working purchase flow. 🟢 typechecks clean.
- [x] **P-1.2** `lib/casper/escrow.ts` — `payInvoiceTransaction(pk, { onchainInvoiceId, amount })` (named `invoice_id`/`amount` U256 args — no struct encoder needed), `isEscrowEnabled` + exported `escrowPackageHash` (the approve spender), env-overridable `GAS_PAY_INVOICE` (default 10 CSPR), and `parseEscrowError` mapping escrow revert codes 303/305/306/307/308/311/312 (+ allowance / insufficient-funds hints). 🟢 typechecks clean.
- [x] **P-1.3** `hooks/lease/useInvoicePayment.ts` — orchestrates the **two-deploy** flow as one linear `async` over two `useBlockchainTransaction` machines joined by a promise bridge: `isApproveNeeded → (approve) → pay_invoice → POST /invoices/{id}/settlement`. States `idle → checking → approving → paying → recording → done/failed`; the approve is skipped when the allowance already covers, and the settlement POST is best-effort (`recordError`, non-fatal — the indexer reconciles). `reset()` aborts both deploys. 🟢 typechecks clean.

**Phase 2 — payment UX**

- [x] **P-2.1** `src/components/payments/PayInvoiceDialog.tsx` — summary (due / already-paid / you-pay / est. gas), 2-step "1. Approve USDC → 2. Pay" stepper, honest errors via `parseEscrowError`, success + cspr.live link, best-effort `recordError` note. Deposit = fixed `amountDue`; rent = full remaining by default with a collapsed "pay a partial amount" field (validated `0 < amount ≤ remaining`). Added paired `formatFromSmallestUnit` to `leaseCurrency.ts` for exact (no-float) remaining math. 🟢 typechecks clean.
- [x] **P-2.2** Pay-button gating + balance pre-flight. Gating (status ∈ {pending,partial,overdue} **and** `onchainInvoiceId != null`) is in `PayInvoiceDialog`. Balance: ⚠️ the ICO `cep18Service.getBalance` is **wrong for this Odra token** — it passes the raw account hash, but Odra's `balances` mapping keys items by `blake2b(key.to_bytes())` (verified: same derivation the proven allowance read uses). So I added a correct self-contained `getCep18Balance` in `lib/casper/cep18.ts` (blake2b of the tagged account Key bytes; **ICO untouched**) + `useUsdcBalance` hook. The dialog shows the wallet balance, warns + disables Pay when `balance < amount`, and **fails open** (read error → `undefined` → no block; on-chain revert stays authoritative). 🟢 typechecks clean. _Caveat: the read mirrors the working allowance path but wasn't live-tested against testnet — worth one real read to confirm._
- [x] **P-2.3** `PayInvoiceDialog` self-mounts `OnChainSdkHost` around its interactive flow (lazy — `DialogContent` unmounts when closed), so the payment surface has a working `clickRef` without app-wide `ClickProvider`. ✅ covered for the dialog; the list/dashboard CTAs (P-3) just open the dialog, so no extra host needed there.

**Phase 3 — tenant screens**

- [x] **P-3.1** `/tenant/payments` — rewrote the legacy fiat/Stripe `TenantPayments.tsx` mock to the invoice model: `useInvoices({tenantId:'me'})` grouped **Overdue / Due / Paid** (cancelled hidden), reusable `InvoiceStatusBadge`, deadline + amount + partial progress, **Pay** CTA → `PayInvoiceDialog`, receipt link, "Preparing…" for not-yet-on-chain rows. Loading / error / empty states. 🟢 typechecks clean.
- [x] **P-3.2** `src/components/payments/TenantPaymentsSummary.tsx` — KPI cards from `useTenantInvoiceSummary` (`summary?tenantId=me`): next-due row with a **Pay now** CTA → `PayInvoiceDialog`, plus Balance due / Paid this year / Deposit held stats; "View all" → `/tenant/payments`. Wired into `TenantDashboard.tsx`, **removing** the legacy `MOCK_PAYMENTS` block + its now-dead helpers/imports (`getPaymentStatusBadge`, `Payment`, `Download`, `Clock`, `Loader2`, `RotateCcw`, `AlertTriangle`). 🟢 my files typecheck clean (pre-existing `Enhanced*`/`AutopaySetup` errors are unrelated).

**On-chain id fallback (added 2026-06-25 — works around the indexer binding gap)**

- [x] **P-3.3** When the backend `onchainInvoiceId` is null (indexer not run, or its CES backfill can't match the synthetic deploy hash — see backend `ces.rs` / `bind_invoice_onchain_id_by_commit_tx_hash`), the FE reads the id **straight from the chain**: `leaseAgreementEvents.ts` now also parses every `InvoiceCreated.invoice_id` from the lease's `create_lease_agreement` deploy (→ `LeaseCommitIds.invoiceIds`); `useResolvedOnchainInvoiceId` maps them positionally to the lease's invoices (deposit-first, deadline ASC) and prefers the backend value when present. `PayInvoiceDialog`/`useInvoicePayment` pay against the resolved id; the list/dashboard offer **Pay** for any non-settled invoice (the dialog resolves the id, showing "Checking on-chain…" / "not on-chain yet" as needed). ⚠️ Settlement still POSTs by invoice UUID and the contract reverts back-stop correctness, but the backend won't reconcile final paid-state until the indexer binding is fixed (the real fix is backend-side). 🟢 my code typechecks clean; parser test 5/5.

**Phase 4 — polish / fast-follow**

- [ ] **P-4.1** Optimistic React Query invalidation after `/settlement`; auto-refresh until indexer flips to `paid`. Empty/loading/error states; money + address formatting (truncation rules).
- [ ] **P-4.2** (fast-follow) Landlord read-only payments view + `summary?landlordId=me` cards on the same hooks.

## §3.6 Termination

- [ ] **Tenant or landlord initiates move-out** — 🔴 MISSING + ⛔ BE
  - `LeaseTerminationRequest`/`moveOutDate` types exist, but no UI flow (form/dialog: reason, date, inspection). Only a mock handler in `pages/lease/dashboard.tsx`.
- [ ] **Equity settled/transferred per lease terms** — ⛔ BE-BLOCKED
  - FE: equity settlement/confirmation screen at termination.
- [ ] **Lease → TERMINATED status (on-chain)** — ⛔ BE-BLOCKED
  - FE: render `terminated` status (already in lists) after backend confirmation.
- [ ] **Dashboards update after termination** — ⛔ BE-BLOCKED (depends on §3.7)

> _Design-reference cross-cut:_ **Task 21** parameterizes `<PreSignatureConfirmation/>` for the `TerminationNotice` EIP-712 ceremony. Termination UI itself is not in the Critical 6 spine — track here, build alongside §3.4.

## §3.7 Dashboards & Accounting

- [ ] **Tenant dashboard (agreed price, paid, equity, balance, interest breakdown)** — 🟠 MOCK + ⛔ BE
  - `src/pages/tenant/TenantDashboard.tsx` on `MOCK_LEASE`/`MOCK_PAYMENTS`; no equity/interest breakdown. Add breakdown components + rewire to `/api/v1/leases`.
- [ ] **Landlord dashboard (rent received, paid/overdue/partial, termination controls)** — 🟠 MOCK + ⛔ BE
  - `src/pages/landlord/LandlordDashboard.tsx` — runs on `MOCK_LANDLORD_*` fixtures (`src/data/landlordMockData.ts`); no Supabase calls remain. No termination controls (see §3.6). TODO(BE): wire to the Rust API.
- [ ] **PM dashboard (aggregated + drill-down)** — 🔴 MISSING
  - No PM role (§3.2). Needs aggregated dashboard across managed properties + per-property drill-down.
- [ ] **Full transparency of all amounts (principal/interest/equity, no hidden fees)** — 🔴 MISSING + ⛔ BE
  - Shared, reusable cost-breakdown component used across tenant/landlord/PM; data from backend.

> _Design-reference cross-cut:_ **Task 18** (Tenant home — single primary CTA, status-forward `Active lease` hero, auto-detection 0–1 vs 2+ leases), **Task 19** (Landlord/PM dashboard — 4 hero metrics, sortable portfolio table, clickable status pills as deep-links), **Task 25** (`<TransactionStatus/>` header pill mounted in both layouts).

## §3.8 Compliance & Privacy (FE part)

- [x] **Profile metadata comes from our backend (not on-chain)** — 🟢 REAL
  - Profile read via `getMe` (`/api/v1/users/me`), not from chain.
- [x] **No "investor" in MVP UI** — 🟢 REAL (with caveat)
  - Absent from roles/auth/profile. "Investor" remains in `TestimonialsSection.tsx` (testimonial copy) and `FractionalOwnership.tsx` (out of MVP scope). Remove/unlink these from MVP nav; purge any MVP-reachable copy.
- [ ] **KYC documents at Sumsub, not with us** — ⛔ BE-BLOCKED (tied to §3.1 KYC)
  - FE stores status only; widget streams docs browser→Sumsub directly. Depends on KYC integration.
- [ ] **File policy: avatar in S3 (✅), property docs on IPFS** — partly 🟢 / ⛔ BE-BLOCKED
  - Avatar → S3 via `uploadAvatar` 🟢. Property docs resolved (2026-05-21) to IPFS pin via `/api/v1/ipfs/pin` with mandatory client-side encryption for PII-bearing files (spec §5.2 / §5.5). FE encrypts client-side; blocked until the BE pin endpoint ships.
- [ ] **Tenant PII not accessible to external parties** — ⛔ BE-BLOCKED
  - Spec §3.8 / §5.2: public chain queries, other platform users, and third-party scrapers via our API must not link a tenant identity to a property/lease. FE part: never render another party's PII outside an authorized view; on-chain references use hashes/wallet addresses only. Enforcement is mostly BE/contract (no PII payloads on-chain, access-controlled API).
- [ ] **Audit trail of key actions (create/sign/pay/terminate)** — ⛔ BE-BLOCKED
  - Audit logic on BE/contract. FE part: render the audit feed once an endpoint exists.

> _Design-reference cross-cut:_ §9 "Compliance failure surface" (BSA §314) from the reference is **explicitly out of MVP scope** per Anthony 2026-05-20 (no AML/CDD/sanctions screening/biometric). See Task 17 Open Q #1.

## §3.9 Production deployment (FE part)

- [ ] **Hosting selected** — decision 🟢 RESOLVED (2026-05-21), FE deploy pending
  - AWS us-east-1 (ECS Fargate for BE/indexer); FE on Vercel/Amplify, CDN-fronted (spec §3.9 / §5.5 / §6 Resolved). The hosting question is closed; remaining FE work is the CI/CD pipeline + deploy below, so the box stays open until FE actually ships there.
- [ ] **FE CI/CD to production** — 🟠 `vercel.json` + `.vercel` (Vercel) exist but tied to the final hosting choice
  - Configure the pipeline for the chosen environment.
- [ ] **FE deployed to the chosen environment** — ⛔ depends on hosting choice

## §3.10 Geographic Pilot (Phase 1)

> Spec §3.10 — Phase 1 state pilot adopted into MVP scope. Pilot states: **Florida, Texas, Tennessee**. California explicitly blocked (Phase 4); all other US states "Coming soon". State flows into BE on every signup / property / lease write for defense-in-depth.

- [ ] **State selection required at sign-up (tenant, landlord, PM)** — 🔴 MISSING + ⛔ BE-BLOCKED
  - No `state` field on the sign-up / profile form. Add a required US-state selector; persisted via the profile write.
- [ ] **Sign-up allowed only from pilot states (FL, TX, TN)** — 🔴 MISSING + ⛔ BE
  - FE gate on the selected state; BE re-validates. No gating logic today.
- [ ] **Virginia gated (CO approval, out of MVP unless CO role lands)** — 🔴 MISSING + ⛔ BE
  - Tied to the Compliance-Officer role (§3.2 / §6 OQ#1); not buildable until that role exists.
- [ ] **California explicitly blocked with an explanatory screen** — 🔴 MISSING
  - Dedicated "Not yet available in California — Phase 4" screen on the CA branch.
- [ ] **All other US states blocked with a generic "Coming soon" screen** — 🔴 MISSING
  - Fallback screen for any non-pilot, non-CA state.
- [ ] **Property creation blocked unless property is in a pilot state** — 🔴 MISSING + ⛔ BE
  - Add a `state` field to the property form + FE pre-check; BE re-validates.
- [ ] **Lease creation blocked unless landlord, tenant, and property are all in pilot states** — 🔴 MISSING + ⛔ BE
  - FE pre-check across all three parties + BE re-validation.
- [ ] **State value stored on user profile and on property** — 🔴 MISSING + ⛔ BE
  - Persist `state` on both entities; flows into BE on every signup / property / lease write.

---

## "Now" backlog (can start without the backend)

1. ~~Email-verify UI~~ — ✅ DONE (VerifyEmail/ConfirmEmailChange + EmailVerificationCard, backend-integrated; see §3.1).
2. KYC Sumsub widget + status screen + action gate (widget streams browser→Sumsub; status display lands later).
3. `declared_mortgage_value` field on the property form.
4. "PM split %" field in the lease wizard.
5. Lease option block (form + types + live breakdown preview).
6. 120% cap FE validation.
7. Termination UI scaffold (form/dialog) — submit wired later.
8. Shared cost-breakdown component (principal/interest/equity).
9. `property_manager` role plumbing (enum/route/context).
10. `company tag` slot in the profile.
11. "investor" MVP-copy cleanup.
12. `<PreSignatureConfirmation/>` shared modal — parameterized for 6 EIP-712 ceremonies, pure FE (Task 21).
13. `<TransactionStatus/>` state machine + header pill — stub with mock states, integration later (Task 25).
14. `<FeeDisplay/>` shared breakdown component + canonical button-label format (Task 20).
15. `<KYCGate/>` wrapper + `useKYCStatus()` hook signature around the Sumsub WebSDK widget — provider-agnostic shape (default `APIKYCSource`); wire to the live Sumsub webhook status once BE ships (Task 26).
16. Tenant-home restructure with hero `Active lease` + recent-activity list — keep on existing `MOCK_LEASE`/`MOCK_PAYMENTS` until §3.7 BE lands (Task 18).
17. PM dashboard portfolio table + status-pill deep-links — runs on `MOCK_LANDLORD_*` fixtures (Task 19).

## Blocked by backend (only auth + profile ready)

Properties CRUD/search, Leases (create/sign/finalize/terminate), Payments/Stripe + disbursement, dashboard data (tenant/landlord/PM), audit trail. Each UI either already exists (on Supabase/mocks, needs rewire) or is missing — see items above.

## Resolved spec questions (§6) — no longer blocking

All three former §6 blockers were resolved 2026-05-21 (spec §6 "Resolved"):

- ✅ Property-doc storage → IPFS pin via `/api/v1/ipfs/pin` with mandatory client-side encryption (§5.2 / §5.5). Mortgage-document upload (§3.3) is now BE-blocked on the pin endpoint, not spec-blocked.
- ✅ Hosting → AWS us-east-1 + FE on Vercel/Amplify (§3.9 / §5.5).
- ✅ Lease signing mechanism → EIP-712 typed signing via `casper-eip-712`, shared `@leasefi/types` (§5.6). Cryptographic signing (§3.4) is now BE-blocked on the shared types package + finalize call.

Spec §6 still lists two genuinely open questions, but neither blocks FE MVP work: (1) mortgage-document **authenticity** review process, (2) private sale for accredited investors (Phase 4).

## Design-reference implementation notes (don't forget)

> Distilled from [`docs/client-doc/leasefi-design-reference.html`](./client-doc/leasefi-design-reference.html) (Phase 1 "Critical 6" visual spine). **Authority:** the HTML is authoritative for **visual** implementation, but **the specs under `/docs/` win on any conflict.** Confidential — do not share externally. Tags: ⭐ = Phase-0-relevant, otherwise MVP/later.

**Cross-cutting (every surface)**

- **One primary CTA per surface.** ⭐
- **Never signal status with color alone** (WCAG 2.1 AA). Status = color **+** icon/label. **Never red for "outstanding"** — red = escalation; outstanding = amber, collected = green, dispute = blue (informational).
- **Money amounts in JetBrains Mono** (decimal alignment; sans-serif numerals shift). ⭐
- **Empty states:** render the empty-state pattern, not an empty card with a disabled CTA. Template once, reuse. (tenant "No active lease", PM "No properties yet", "No disputes".)
- **Skeletons:** template once via shadcn `Skeleton`; don't invent per-component.
- **Wallet address:** never show the full address in greeting copy. Full address lives only in the sidebar wallet widget (expand → copy / disconnect / KYC tier). ⭐
- **Draft state lives on the server, never the browser.** Wizards resume from the server-persisted draft — `localStorage`/`sessionStorage` draft is **forbidden**. (#1 Playwright regression target.) ⭐
- **Tx state in `sessionStorage` only** (must not survive a browser session) — distinct from drafts (server). ⭐

**FeeDisplay (regulatory — PRD FR-1.4.3.12)**

- Format is **regulatory-mandated**: don't reformat the layout, don't drop the percentage, don't rename "Total" → "Subtotal". Fee must be **inline and visible**, never in a tooltip/modal.
- **Button label includes the exact total** — never "Submit" / "Pay now". ⭐
- Pre-flight **"Balance OK" pill** is the result of an on-chain read — don't open a wallet popup just to fail on balance.
- **Path B fiat on-ramp link always present**, even when balance suffices.
- Show **display currency (USDC) vs on-chain (CEP-18)** + the "your wallet will show the same amount" note.
- One component reused across rent / late fee / buyout / deposit funding / dispute.

**PreSignatureConfirmation (the highest-stakes surface)**

- **Build once, parameterize for all six EIP-712 ceremonies** (LeaseAgreement, TerminationNotice, BuyoutAgreement, DepositRelease, PMAuthorization, Authentication). **Do not build six variants.** ⭐ (Authentication ceremony is Phase-0-relevant.)
- Fires **before any wallet popup**; **three-stage confirmation is the trust spine — never collapse it.**
- **"Cross-check before signing" copy is mandatory** — don't reword, move, or hide it.
- **Show ALL EIP-712 fields** (truncation is how signature-confusion attacks succeed) + the verifying contract (canonical address).
- **Cancel/reject = silent return to idle.** Rejected ≠ failed: no toast, no Sentry, no error UI. ⭐

**TransactionStatus / state machine**

- **Three stages, never collapsed:** submitted → in-block (~16s) → finalized (8 blocks, ~2 min). ⭐
- **GlobalTxIndicator persists across navigation** (header badge, click-to-return).
- **Pre-flight order is deliberate:** build-args → KYC → OFAC → velocity → balance → allowance → sign (reordering leaks compliance state via timing).
- Reorg: roll back in-block → pending; orphan timeout 32 blocks → failed.

**Lease invitation & signing**

- **Render full lease terms before any wallet popup** (anti-phishing) + show the canonical `lease.fi` domain pill. ⭐
- **Lease activation = two on-chain tx:** Tx A `LeaseFactory.create_lease` (verifies both EIP-712 sigs inline, mints NFTs, takes 2% fee) + Tx B `DepositVault.deposit_funds` (separate, no sigs). **Track independently**; render an explicit **"lease created · awaiting deposit"** transitional state. ⭐ (stranded-lease risk — confirm a `cancel_unfunded` path with the SC team.)
- **EIP-712:** use `@leasefi/types` builders only (no inline typed-data); `verifyingContract` = `LeaseFactory`. ⭐
- **Async handoff:** the "waiting" state is steady-state, not a spinner; don't lock the landlord's session. Resend rotates the token (old link → 404).
- **SHA-256 (on-chain `lease_document_hash`) ≠ IPFS CID** (retrieval address only). Always re-hash the retrieved PDF and compare before trusting; never trust the CID alone. IPFS pin tokens are **server-issued, 5-min TTL** — FE never holds Pinata/web3.storage keys.
- **FL security-deposit cap = 2× monthly rent** (validate client + contract + submission).

**KYC / compliance**

- Consume **`useKYCStatus(address)` only** — never the KYC source directly (default `APIKYCSource`). ⭐
- **Pending-attestation state is mandatory** (skipping it → "I verified but the app says I'm not" tickets).
- Compliance-failure surface: **no retry button** (single CTA "Contact support"); all compliance reverts collapse to one `ofac-restricted` class; **CO sign-off required** to change copy/layout; **no Sentry with specifics**. **Tier insufficiency ≠ compliance failure** (surface the real "Tier 1 required").

**Dashboards (landlord/PM)**

- **Auto-detect by ownership:** 0–1 leases → tenant-style layout; 2+ → PM-style table. **No user-facing mode toggle.**
- **PMs work in tables** (sort / filter / multi-select), not cards.

**Architecture baked in (do not invent alternatives)**

- Listings off-chain (PostgreSQL + IPFS photos) — **no on-chain footprint until counter-sign** (Phase 2 marketplace).
- **Tenant signs first** (acceptance = application); **landlord counter-signs to commit** — don't invert.
- **Privacy gate:** pre-counter-sign = pseudonymous (badges + criteria-match boolean only); full identity **only** post-counter-sign. Never expose tenant PII before commit.

## Note on scope

Out-of-scope pages and the dead Supabase cleanup are **not** in this tracker (scope = §3 DoD only) — but they are real work the team should budget separately. Mobile-perfect responsive is out of scope per spec §4 (only critical nav bugs fixed).
