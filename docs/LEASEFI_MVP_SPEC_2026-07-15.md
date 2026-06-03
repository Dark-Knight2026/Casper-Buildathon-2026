# LeaseFi MVP — Specification

> This document is the source of truth for the **MVP**. Hour/day estimates are not included — each engineer prepares their own estimate against this scope.
> Delivery target — **2026-07-15**.

---

## §1. High-Level Objective

Build the LeaseFi MVP, in which **tenant, landlord, and property manager** can go through the full rental lifecycle (from application to termination) with a transparent **lease option (lease-to-own with equity accrual)**, **automatic rent split into 2% LeaseFi fee / property manager / landlord** (logic recorded in Casper smart contracts, actual money moves over the fiat rail via Stripe), mandatory **KYC compliance**, and **basic fiat payment intake through Stripe** — in a mode that **complies with the US Clarity Act** (big token = commodity, not security; PII off-chain).

> **Glossary** (for consistent terminology across the team):
> - **Lease option (equity)** — a clause in a lease agreement giving the tenant the right to buy out the property through accrued equity. The tenant pays regular rent + an additional mortgage portion; each mortgage payment credits the tenant an ownership share (equity). Anti-scam protection: 120% cap, transparent breakdown, equity does not "burn" on move-out that is not the tenant's fault.
> - **2% LeaseFi fee** — fixed commission deducted from every rent transaction. The sole LeaseFi revenue stream in MVP; no separate application or administration fee exists.
> - **Rent disbursement** — automatic split of an incoming rent payment into 3 (or 4 with lease option) parts: **2% LeaseFi fee → PM split % → landlord** (+ mortgage portion if lease option is active). The **logic** of the split is recorded in Casper smart contracts (audit trail, immutable record); **actual fiat money** in the MVP moves through Stripe Connect / split payments (fiat rail). Fiat↔crypto conversion is **deferred to Phase 1.2**.

**In scope MVP:** tenant / landlord / property manager profiles, lease creation, lease option with equity, **rent intake in fiat via Stripe** + automatic 3-way disbursement, lease termination, KYC, accounting dashboards for all 3 roles.

**Out of scope MVP** (summary; full list with rationale — see §4): AI agents, DAO governance, outside investors, REITs, fractional investing, brokers, maintenance requests, in-app chat, full Stripe / alternative payment methods, fiat ↔ crypto on/off-ramp, multi-currency payout UI, ICO.

---

## §2. Stakeholders / Personas (MVP)

| Persona | Description | Interface |
|---|---|---|
| **Tenant** | Renter who applies, signs lease, pays rent, optionally builds equity via lease option | Web/mobile dashboard |
| **Landlord** | Property owner who lists property, accepts applications, receives rent, configures lease option | Web/mobile dashboard |
| **Property Manager** | Manages one+ property on behalf of landlord, receives a % of rent | Web/mobile dashboard |
| **LeaseFi (platform)** | Receives 2% LeaseFi fee on every rent transaction (sole platform revenue stream) | System level |
| **Sumsub** | External KYC/AML provider. Holds KYC documents; returns identity verification status. Privacy guarantee — see §5.2. | API + webhook |
| **Stripe** | Fiat payment gateway | API + webhook |
| **Casper blockchain** | Stores lease records, executes escrow / revenue distribution | On-chain |

> ⚠️ **The word "investor" is not used anywhere** — not in UI, not in whitepaper, not in commit messages. Replace with: "owner", "buyer", "participant". Reason — Clarity Act.

---

## §3. Definition of Done on 2026-07-15

The list of items that **must work** in production by release date. This is also the basis for UAT with Anthony.

### 3.1 Auth & Onboarding
- [ ] Sign-up and sign-in via CSPR.click (Google / Apple)
- [ ] Wallet is provisioned transparently (the user does not see a "create/connect wallet" CTA)
- [ ] KYC flow is completable — without KYC, the user cannot create a lease or make a payment
- [ ] Email verification via Postmark
- [ ] Profile is editable (avatar, personal data)

### 3.2 Profiles (3 roles)
- [ ] Tenant profile with lease history, payment history, equity balance
- [ ] Landlord profile with owned properties, active leases, received rent
- [ ] Property Manager profile with aggregated view (all managed properties)
- [ ] All 3 profile types contain a slot for `company tag` (groundwork for Phase 1.1 multi-property admin)

### 3.3 Properties
- [ ] CRUD operations for properties (landlord/PM only)
- [ ] `declared_mortgage_value` numeric field on a property (groundwork that does not depend on the storage decision)
- [ ] Upload of mortgage documentation — mandatory to enable lease option. Stored on IPFS via `/api/v1/ipfs/pin` (BE-proxied), with client-side encryption for PII-bearing content (see §5.2).
- [ ] Property search + filtering
- [ ] Property detail page with Google Maps link
- [ ] Disclaimer block

### 3.4 Lease Agreement
- [ ] Create lease form (landlord → tenant) with fields: rent amount (USD), term, PM split %
- [ ] Optional lease option block: mortgage value, sale price, monthly payment, interest rate, term
- [ ] 120% cap enforced at FE / BE / smart contract layers — full rule and prerequisites in §5.3.1
- [ ] Lease is recorded on-chain only when finalized; drafts stay off-chain
- [ ] Both parties cryptographically sign the lease before on-chain recording — mechanism per §5.6
- [ ] Lease parameters immutable after signing — see §5.3.2

### 3.5 Payments & Disbursement (fiat-first)
> Architecture and rationale — see §5.7.
- [ ] Stripe basic integration (payment intent + webhook)
- [ ] Stripe Connect / split payments for 3-way disbursement (2% LeaseFi fee / PM % / landlord)
- [ ] Recurring monthly schedule
- [ ] Smart contract records each payment event, computes the split, credits tenant equity on every mortgage payment
- [ ] Payment order rent FIRST → mortgage SECOND, enforced in both Stripe split logic and contract state

### 3.6 Termination
- [ ] Tenant or landlord can initiate move-out
- [ ] Equity is settled or transferred per lease terms
- [ ] Lease transitions to TERMINATED status on-chain
- [ ] Dashboards update accordingly

### 3.7 Dashboards & Accounting
- [ ] Tenant dashboard: total agreed price, paid amount, equity earned, balance owed, monthly interest breakdown
- [ ] Landlord dashboard: rent received per property, payment status (paid / overdue / partial), termination controls
- [ ] PM dashboard: aggregated view + per-property drill-down
- [ ] All amounts are transparent (principal vs interest vs equity, no hidden fees)

### 3.8 Compliance & Privacy
- [ ] Profile metadata (names, emails, roles, property/lease links) — in our backend (Supabase Postgres). On-chain — hashes only.
- [ ] KYC documents are held by Sumsub, not by us (see §5.2 for the privacy guarantee).
- [ ] File storage policy honored: avatars in S3, property docs on IPFS (encrypted pin via `/api/v1/ipfs/pin`; see §5.2 / §5.5 / §6 Resolved).
- [ ] Tenant PII is not accessible to external parties (public chain queries, other platform users, third parties via our UI).
- [ ] No instance of the word "investor" in UI
- [ ] Audit trail for key actions (lease create / sign / pay / terminate)

### 3.9 Production deployment
- [ ] Hosting: AWS us-east-1 — ECS Fargate (BE, indexer), managed Postgres (Supabase), ElastiCache Redis, Secrets Manager. FE on Vercel/Amplify, CDN-fronted. (Per Off-Chain Architecture §9.)
- [ ] CI/CD to production
- [ ] FE + BE + indexer deployed
- [ ] Smart contracts deployed to Casper **testnet at MVP launch**. **Mainnet target Q4 2026, post-audit** (per PreFlight Checklist §1.4). Engineering goal for 2026-07-15 is a stable testnet build that passes UAT.

### 3.10 Geographic Pilot (Phase 1 — adopted from client docs)
> **Source:** `CO/GC Onboarding Pack §4.5`, `PRD §4.4.3 (L315-322)`, `Smart Contract Spec §3.3`. Phase 1 state pilot adopted into MVP scope. Out-of-pilot states deferred to Phase 1.1+; California deferred to Phase 4 (DFPI MTL required).

- [ ] State selection is a required field at sign-up (tenant, landlord, PM)
- [ ] Sign-up allowed only from pilot states: **Florida, Texas, Tennessee**
- [ ] Virginia gated — CSV-allowed only after Compliance Officer approval (out of MVP unless CO role lands; see §3.2 / §6 OQ#1)
- [ ] **California explicitly blocked** at sign-up with an explanatory screen ("Not yet available in California — Phase 4")
- [ ] All other US states blocked with a generic "Coming soon" screen
- [ ] Property creation blocked unless the property is located in a pilot state
- [ ] Lease creation blocked unless landlord, tenant, and property are all in pilot states (FE pre-check + BE re-validation)
- [ ] State value is stored on user profile and on property; flows into BE on every signup / property / lease write for defense-in-depth validation

---

## §4. Out of Scope (Phase 1.2+ / Phase 2)

The following is **not included** in the 2026-07-15 MVP and is **not estimated**:

- **AI agents** (Phase 1.2-1.5). Deferred until the field matures and users adopt the product without AI.
- **DAO governance contracts** (Phase 2). Separate DAOs for the platform, properties, and HOAs — all deferred.
- **Outside investors** / fractional ownership beyond the landlord–tenant pair.
- **REITs / portfolios.**
- **Broker ↔ realtor hierarchy** with admin portal.
- **Maintenance requests.**
- **In-app chat** (landlord ↔ tenant ↔ PM).
- **Full Stripe** integration (all features, subscription plans, etc.) — MVP uses only the basics.
- **Airwallet / Apple Pay / Google Pay / PayPal.**
- **Fiat ↔ token on-ramp / off-ramp** with conversion — Phase 1.2.
- **Multi-currency payout UI per recipient** (CSPR / big / stablecoin dropdown). The smart contract supports it as a flexible config, but the UI does not expose it in MVP — payout is in fiat for all recipients.
- **Mobile-perfect responsive** — in MVP, mobile UI is allowed to be imperfect (critical navigation bugs are still fixed).
- **Multi-property Company Admin portal** (Phase 1.1) — we only lay the groundwork with a `company tag` field in profiles; full portal — later.

---

## §5. Implementation Notes — non-negotiable guardrails

### 5.1 Compliance (Clarity Act)
- Big token = **commodity**, strictly rewards/payout. **No tie to real estate.**
- Property NFT — **a separate token** in a separate contract (Property Fraction Token, already complete).
- No internal participant (founder, advisors, treasury) **can own > 20%** of the big token. Tokenomics needs to be recalculated — owned by the client, outside the engineering scope, but must be settled before release.
- KYC + AML — **critical gating**. Without approved KYC, no payment/lease action runs.
- **Sideline holders → no rewards. Stakers → rewards permitted.** A *sideline holder* is someone who bought big token and just holds it in their wallet without any on-chain activity; they **do not receive rewards**, otherwise the big token gets classified as a security (SEC red flag — "passive income from holding an asset"). *Staking* counts as a transaction under the Clarity Act — a holder who stakes is actively participating in the network, so rewards are permitted for them. Private sale buyers are auto-vested + auto-staked → they fall into the stakers category. This is an **interpretation of the Clarity Act, not our design decision**. **Implication for UI/marketing:** describe the big token as a *transactional reward token tied to network participation*, NOT as *"buy and earn passive income"* — the latter is automatically a security pitch.

### 5.2 Privacy
- **No PII on-chain.** Names, emails, profile metadata — in Supabase Postgres with access control. On-chain — hashes only.
- **KYC documents (passport, selfie, proof of address) — stored at Sumsub, NOT in our database.** We keep only `sumsub_applicant_id`, `kyc_status`, and timestamp. This removes the GDPR/AML compliance burden for the documents themselves from us. **Integration shape:** BE creates applicants and handles the verification webhook; FE embeds the Sumsub widget so documents flow browser → Sumsub directly without passing through our infrastructure.
- **Avatar** is stored in S3 (our storage, with access control).
- **Mortgage documents, signed lease PDFs, and other property-related files** (property photos) — stored on **IPFS via a BE-proxied pin endpoint** `/api/v1/ipfs/pin` (per Off-Chain Architecture §7.3, PreFlight §12.5). Pinning provider TBD with DevOps (Pinata / web3.storage / Filebase). **Client-side encryption is mandatory** for any file containing PII (signed lease PDFs, mortgage statements with personal data, applicant docs). Only the encrypted blob + sha256 hash anchor go on public IPFS; the decryption key lives in our backend, gated by role-based access. On-chain we store only the IPFS CID + hash. Property *photos* (no PII) may be pinned without encryption. Avatars remain in S3.
- **Tenant identity is not accessible to external parties.** Public chain queries, other platform users, third-party scrapers via our API — cannot link a tenant identity to a specific property / lease. On-chain references use only hashes or wallet addresses, with no PII payload. (Landlord knows the tenant from physical interaction — this is outside our control; we guarantee only that **our platform** does not publish PII and does not give external parties a queryable identity.)
- The avatar may obscure the user's real-world appearance.

### 5.3 Anti-scam guardrails

#### 5.3.1 120% cap on lease option sale price
**Rule.** Total sale price in a lease option ≤ **120%** of the declared mortgage value of the property. Formula:
```
lease_option_total_sale_price ≤ declared_mortgage_value × 1.20
```

**Where the number comes from.** Analogous to the banking 80% LTV rule: banks lend up to 80% of property value, leaving a 20% cushion for market drops. This is the mirror rule: the landlord cannot mark up the sale price by more than 20% over the actual mortgage value.

**What this protects against.** The classic lease-to-own scam: property is actually worth $100k, landlord lists it in a lease option for $250k, the tenant pays "equity" for years, then cannot close the gap → option avoid → equity burns. With the 120% cap, the maximum would have been $120k.

**How it is enforced (3-layer redundancy):**
1. **FE** — disable submit + inline error when exceeded. UX validation.
2. **BE** — returns 422 problem+json even if FE is bypassed.
3. **Smart contract** — immutable rule in `lease.create()`. Source of truth.

**Prerequisites for the rule to work:**
- Landlord must upload a mortgage document before activating the lease option (without it, the toggle is disabled).
- `declared_mortgage_value` field on the property is populated from the document. **In MVP — manual review** (we confirm the document is genuine). Long-term — a third-party appraisal API.
- The lease option block in the form has a clear `total_sale_price` field (NOT "charge", not monthly payment).

#### 5.3.2 Other anti-scam guardrails
- Mortgage documentation is **mandatory** from the landlord to activate a lease option. Without it, the option is not available.
- **Pay rent FIRST, mortgage SECOND.** If the tenant paid less than the full amount, the shortage always lands on the mortgage portion, never on rent. The contract enforces this.
- Transparent breakdown in the tenant UI: `mortgage_value` / `total_sale_price` / `markup_%` / `paid_to_date` / `principal_paid` / `interest_paid` / `equity_earned` / `balance_remaining`. No hidden fees.
- On termination not at the tenant's fault, equity must not "burn" (as in classic lease-to-own scams). In MVP, equity is settled in fiat per lease terms; on-chain fractional equity transfer is Phase 2.
- **Lease parameters are immutable after signing.** If the landlord wants to change the sale price, refinance, etc. — only via termination + a new lease.

### 5.4 Architecture
- **On-chain — the minimum.** Only what requires permanent storage or autonomous execution.
- **Off-chain (SQL backend)** — everything else: queries, search, dashboards, history. The platform is not dogmatic about blockchain — if the backend is faster/cheaper, we use the backend.
- Lease draft / negotiation — off-chain. **Only the finalized lease is recorded on-chain** (analogous to the DocuSign final email).
- The indexer on the backend pulls data from smart contracts and caches it in Supabase Postgres for fast queries.

### 5.5 Tech Stack constraints
- **Frontend:** React + TypeScript + CSPR.click SDK (for auth + wallet).
- **Backend:** Rust (axum) + **Supabase Postgres** (via sqlx) + Redis (cache) + **S3** (avatars) + Postmark (email).
- **Smart Contracts:** Casper + Odra framework.
- **Indexer:** a separate Rust service that pulls on-chain events and caches them in the same Supabase Postgres.
- **Payments:** Stripe (basic SDK + Stripe Connect for split payments).
- **KYC:** Sumsub (privacy details — §5.2).
- **Property docs storage:** IPFS pin via BE-proxied `/api/v1/ipfs/pin` endpoint (Pinata / web3.storage / Filebase — pinning provider TBD with DevOps). Mandatory client-side encryption for PII-bearing files (see §5.2). Avatars in S3.
- **Hosting:** AWS us-east-1 — ECS Fargate for BE + indexer, Supabase managed Postgres, ElastiCache Redis, Secrets Manager. FE on Vercel/Amplify (CDN-fronted).

### 5.6 Casper signing mechanism

- Casper plans its own EVM — for future integrations.
- **HTTP 402** mechanism — coming online.
- **Lease signing mechanism: EIP-712 typed signing** via the `casper-eip-712` crate (per Smart Contract Spec v1.4.4 §18.1, PreFlight §4.10, Off-Chain Architecture §6). Both parties sign typed data via CSPR.click. Schemas defined for: `LeaseAgreement` (incl. execution fee, currency, protocol fee bps), `TerminationNotice`, `BuyoutAgreement`, `DepositReleaseAuthorization`, `PMAuthorization`, `Authentication`. FE consumes the EIP-712 builders from the shared `@leasefi/types` package codegen'd from Rust — no hand-rolled typed-data builders on FE. Sibling-sweep CI job enforces Rust↔TS schema parity.

### 5.7 Money rail in MVP (fiat-first) — critical decision

The MVP separates **who moves money** from **what records the truth**:

- **Stripe moves the money.** Tenant pays fiat; Stripe Connect / split payments routes fiat directly to landlord / PM / LeaseFi bank accounts.
- **Smart contract is the audit ledger.** It records every payment event, computes the split, maintains lease state, tracks equity, records termination. It does NOT move real fiat money in MVP. Architecturally it is left extendable per recipient, so Phase 1.2 can add crypto payouts (Casper USD, big token, CSPR) without redesign.

Items that fall outside this fiat-first model (multi-currency payout UI, fiat↔crypto on/off-ramp) are listed in §4 Out of Scope.

**Priority order:** KYC > Stripe > everything else. A +2–3 week buffer for full Stripe integration is acceptable rather than shipping a limited home-grown solution.

---

## §6. Open Questions / Risks / Dependencies

### Open Questions
1. **Mortgage document authenticity** — how do we verify that an uploaded mortgage doc is genuine? Manual review by ops? Sumsub additional docs? Client docs (CO/GC §5.2) imply Compliance Officer review against state licensing databases, but the CO role itself is not in the MVP §2 personas list — needs a decision on who performs the review in MVP if no CO is hired.
2. **Private sale for accredited investors** — awaiting the client's legal counsel. Phase 4 in client docs (CO/GC §6.1 KYC Tier 3). Does not block MVP.

### Resolved (2026-05-21, from client doc set)
- ~~**Property docs storage backend**~~ → IPFS pin via BE-proxied `/api/v1/ipfs/pin` endpoint with mandatory client-side encryption for PII-bearing files. See §5.2, §5.5. *(Source: Off-Chain Architecture §7.3, PreFlight §12.5.)*
- ~~**Production hosting**~~ → AWS us-east-1 (ECS Fargate for BE/indexer; Vercel/Amplify for FE). See §3.9, §5.5. *(Source: Off-Chain Architecture §9.)*
- ~~**Mainnet vs Testnet deployment**~~ → Casper testnet at MVP launch (2026-07-15); mainnet Q4 2026 post-audit. See §3.9. *(Source: PreFlight §1.4.)*
- ~~**Lease signing mechanism**~~ → EIP-712 typed signing via `casper-eip-712` crate, schemas codegen'd into shared `@leasefi/types` package. See §5.6. *(Source: SC Spec §18.1, PreFlight §4.10, Off-Chain Arch §6.)*
- ~~**Tokenomics recalculation**~~ → Phase 2 token architecture (FeeDistributor, staking sequencing, liquidity provisioning) fully scoped in Whitepaper v4.5.4 + PreFlight Appendix A.1-A.3. *(Outside engineering scope; does not block MVP delivery.)*

### Risks
- **R-1 Funding shortage.** ICO blocked by the Clarity Act, project budget is limited. Mitigation: keep MVP scope tight, no creep.
- **R-2 Token 2049 deadline (October 2026).** MVP must be ready for the conference. If 2026-07-15 slips, there is ~2.5 months of margin, but every week matters.
- **R-3 Stripe approval timeline.** Stripe may require compliance docs / business verification — can take 1–2 weeks. Start registration immediately.
- **R-4 Postmark approval.** Up to 24 hours of review, but plan a buffer.
- **R-5 Casper SDK limitations.** CSPR.click currently supports only **Google + Apple** social logins. Email, Facebook, X, Discord are NOT supported. Additional methods (e.g. Passkey) may arrive in a future SDK version. For MVP, Google + Apple is sufficient.
- **R-6 Bug fixes after UAT.** If UAT surfaces a large list of blockers, the release slips.

### Dependencies (what we are waiting on)
- DevOps hosting recommendation — by 2026-05-22.
- Stripe production approval — in parallel, start registration ASAP.
- Postmark production approval — in parallel.
- Tokenomics recalculation on the client side — does not block engineering but blocks the token sale release.

---

## §7. Working Principles

### Judgment call rule
When choosing between a "user-friendly default" and "transparency for a novice user", always choose **transparency**. The MVP is deliberately built to make classic lease-to-own scam patterns impossible on-platform — surface every cost, every fee, every equity number to the user.

### Cadence
- Recurring meeting — every Thursday.
- Each Thursday call checks whether we are on track for 2026-07-15.
- If we are not on track — we revise the approach, not the deadline (for now).

---

## §8. Acceptance / Sign-off

The MVP is considered release-ready when:
1. ✅ Every item in §3 (Definition of Done) is done and working in production.
2. ✅ End-to-end happy path test passes (full lifecycle: registration → KYC → property search → lease creation → sign → first rent payment → disbursement → equity → termination).
3. ✅ UAT with Anthony (~2026-07-10 to 2026-07-12) — no blocker bugs by 2026-07-14.
4. ✅ Audit trail and PII off-chain checks (§3.8) — passed.
5. ✅ Production deployment (§3.9) — stable for 48 hours before release.

Sign-off: Anthony (client — final approve) + Oleksandra (PM gate) + Kenneth (smart contracts) + Ivan (BE) + Anastasia (FE).
