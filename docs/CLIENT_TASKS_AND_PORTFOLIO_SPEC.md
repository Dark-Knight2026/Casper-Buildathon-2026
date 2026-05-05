# Client Tasks & Portfolio Accounting Spec

**Source:** LeaseFi Project Thursday Recurring Meet — 2026-04-30
**Participants:** Anthony Batten (client), Chris, Kenneth, Anastasia, Oleksandra
**Owner:** Anastasia (FE), Ivan (BE), Kenneth (contracts)

**Related docs:**
- [CASPER_NAME_PAYMENT_FLOW.md](./CASPER_NAME_PAYMENT_FLOW.md) — payment flow for Casper.name purchase (post-KYC, fiat → on-chain via Stripe + relayer)

---

## Table of Contents

1. [Full client task list](#1-full-client-task-list)
2. [Phase 1 — MVP priorities](#2-phase-1--mvp-priorities)
3. [Phase 2 — after first breaking point](#3-phase-2--after-first-breaking-point)
4. [Phase 3 — strategic](#4-phase-3--strategic)
5. [Architectural decisions (locked at the meeting)](#5-architectural-decisions-locked-at-the-meeting)
6. [Detailed spec: Portfolio Accounting](#6-detailed-spec-portfolio-accounting)
7. [Open questions for the client](#7-open-questions-for-the-client)
8. [Changelog](#8-changelog)

---

## 1. Full client task list

### 1.1. Frontend UX (Phase 1)

| # | Task | Page | Size |
|---|---|---|---|
| FE-01 | **Price input in the filter** — add a text field for exact price entry (e.g. 1635), not just a slider. Anthony: it's hard to set a precise number with the slider | Marketplace / Search filters modal | S |
| FE-02 | **Help/Onboarding tab** with quick-action cards: `Create landlord account`, `Create tenant account`, `Create property manager account`, `List property`, `Look for property`, `Create wallet`. Should walk the user through the main flows in 1-2 clicks | Global (header or dashboard) | M |
| FE-03 | **Seamless fiat→crypto UX** — gas and token payments should feel like tapping Apple Pay, with no visible transitions. Currently gas is paid by the landlord (see decision §5) | Property listing flow, transaction flows | M |
| FE-04 | **Portfolio Accounting tab (slim)** for tenants and landlords — see detailed spec §6 | `/landlord/portfolio`, `/tenant/expenses` | L |
| FE-05 | **Casper.name picker UI** (post-KYC step) — name input, debounced availability check, price display | KYC completion flow | M |
| FE-06 | **Stripe Checkout integration** for Casper.name purchase | KYC completion flow | S |
| FE-07 | **Registration progress modal** — multi-step states `Preparing → Registering → Done` with success/failure | KYC completion flow | S |

### 1.2. Backend + contracts (parallel tracks)

| # | Task | Owner | Status |
|---|---|---|---|
| BE-01 | Auth foundation: refresh/logout tokens, user profile endpoint | Ivan | 🔄 |
| BE-02 | Auth methods and verification (password, Google OAuth, gating, OpenAPI docs, integration tests) | Ivan | ❌ |
| BE-03 | KYC integration with Sumsub | Ivan | ❌ planned |
| BE-04 | Casper.name integration on backend (identity layer) | Ivan | ❌ planned |
| BE-05 | Endpoints for Portfolio Accounting (see §6) | Ivan | ❌ planned |
| BE-06 | Stripe integration: Checkout Session + webhook handler + idempotency | Ivan | ❌ planned |
| BE-07 | Treasury wallet + signer service (KMS-managed key) | Ivan | ❌ planned |
| BE-08 | Casper.name reservation + registration job (with retry/refund) | Ivan | ❌ planned |
| BE-09 | Refund flow + ops alerts (CSPR balance, failed registrations) | Ivan | ❌ planned |
| SC-01 | ERC-3643 suite: Compliance Policy, Property Fraction Token, Revenue Distribution contracts | Kenneth | 🔄 |
| SC-02 | Lease/Escrow integration for automated rent routing | Kenneth | ❌ |
| SC-03 | Possibly rename Investor Registry → Identity Registry with Casper.names support | Kenneth | 🔄 investigation |

---

## 2. Phase 1 — MVP priorities

Focus: **lease-to-own + fractional equity for the tenant** (e.g. after 10 years of renting — 30% equity if the landlord agrees).

**Included in Phase 1:**
- FE-01 (price input)
- FE-02 (help/onboarding tab)
- FE-04 (Portfolio Accounting — slim version, see §6)
- FE-05, FE-06, FE-07 (Casper.name purchase UI — see [CASPER_NAME_PAYMENT_FLOW.md](./CASPER_NAME_PAYMENT_FLOW.md))
- BE-01, BE-02 (auth)
- BE-05 (portfolio endpoints — slim)
- BE-06, BE-07, BE-08, BE-09 (Casper.name payment infra)
- Property archival flag (status: active/archived/sold)
- CSPR.click login (Google/Apple/email) + Sumsub KYC + Casper.name identity

**NOT in Phase 1:**
- REIT functionality (fractional ownership of portfolios)
- AI Agents (Anthony is building them himself)
- EVM bridge / parallel chains
- Marketplace (buy/sell properties)
- Property fractional ownership UI

---

## 3. Phase 2 — after first breaking point

(after MVP release and feedback collection)

| # | Task | Description |
|---|---|---|
| P2-01 | REIT functionality | Fractional ownership of property portfolios via property token. Keep separate from lease-to-own equity (REIT = security under SEC) |
| P2-02 | Marketplace for buy/sell | Anthony: keep transactions in Phase 2/3, focus on lease in Phase 1 |
| P2-03 | AI Agents — first wave | Anthony builds them himself; team handles deploy/integration |
| P2-04 | Portfolio Accounting — full version | AI auto-categorization, receipt OCR, bank feed (Plaid), Schedule E auto-fill, depreciation, CPA portal, e-filing |
| P2-05 | Server-side email with SMTP + PDF attachment | Phase 1 — `mailto:`, Phase 2 — real mail |
| P2-06 | Multi-currency support | Phase 1 — USD only |
| P2-07 | Recurring expense templates | "Each month auto-add HOA $250" |

---

## 4. Phase 3 — strategic

| # | Task | Description |
|---|---|---|
| P3-01 | Parallel chains / EVM bridge | Mirror contracts on Ethereum so the platform isn't locked to a single chain. Defense against exploits. Anthony: "Phase 3 ish" |
| P3-02 | AI Agents — full roadmap | ~45 agents, 9 tiers, 36-month rollout |
| P3-03 | Quantum security | Mentioned by Anthony in the AI agent tier list |

---

## 5. Architectural decisions (locked at the meeting)

### 5.1. Identity stack
| Layer | Technology | Coverage |
|---|---|---|
| Login | **CSPR.click** | Google / Apple / Email. **No Casper Wallet** for login in MVP |
| KYC | **Sumsub** | Separate backend layer, data is not on-chain |
| Public identity | **Casper.name** | Users only (NOT properties in MVP). User picks the name themselves. **User pays the cost** — purchased via Stripe with backend relayer registering on-chain. Full flow: [CASPER_NAME_PAYMENT_FLOW.md](./CASPER_NAME_PAYMENT_FLOW.md) |

### 5.2. Gas and tokens
- **Landlord pays gas** when listing a property and minting the lease agreement NFT
- Rationale: cheap (~$1 per listing), protects against bots/multi-accounts
- UX must hide the fiat→crypto transition (Apple Pay-like)

### 5.3. Tokens
- **Property Token ≠ BIG Token** — fully separate contracts
- Property Token represents fractional ownership of a specific property
- BIG Token — separate platform token

### 5.4. ERC-3643 (postponed)
- KYC handled via Sumsub on the backend
- ERC-3643 is only needed for fractional ownership (REIT) → Phase 2
- Kenneth confirmed this with Anthony — locked

### 5.5. Smart contract suite (5 contracts for ERC-3643)
1. ✅ Investor Registry (possibly renamed → Identity Registry)
2. ✅ Property Registry
3. 🔄 Property Fraction Token
4. 🔄 Revenue Distribution
5. 🔄 Compliance Policy

---

## 6. Detailed Spec: Portfolio Accounting

### 6.1. Goal and constraints

Anthony asked us to give tenants and landlords a place to view income/expenses, with CPA export and per-property history retention. In MVP we **do not build** AI agents, receipt OCR, bank feeds, or Schedule E auto-fill.

**Phase 1 principle:** anything the platform already knows (rent payments, maintenance fees, lease dates) is pulled in automatically. Everything else (utilities, HOA, other expenses) is manual entry. No third-party integrations.

> **Important:** existing components (`IncomeExpenseTracker`, `BudgetDashboard`, `TenantTaxDashboard`, `TaxDashboard`, `TaxReportExporter`) are entirely on mock data. Phase 1 is built greenfield, not by reusing them.

---

### 6.2. Data model (new backend tables)

#### `property_expenses`
```sql
id              uuid PK
property_id     uuid FK → properties(id)
landlord_id     uuid FK → users(id)
date            date NOT NULL
category        enum NOT NULL
amount          numeric(12,2) NOT NULL
currency        char(3) DEFAULT 'USD'
vendor          text                    -- "ConEdison", "Joe's Plumbing"
description     text
receipt_url     text                    -- external link, S3 — Phase 2
is_recurring    boolean DEFAULT false
created_at      timestamptz DEFAULT now()
updated_at      timestamptz

INDEX (landlord_id, date DESC)
INDEX (property_id, date DESC)
```

`category` enum: `utilities | maintenance | hoa | property_tax | insurance | other`

#### `tenant_expenses`
```sql
id              uuid PK
tenant_id       uuid FK → users(id)
property_id     uuid FK → properties(id)   -- nullable for periods between leases
lease_id        uuid FK → leases(id)        -- snapshot of lease at the time of the expense
date            date NOT NULL
category        enum NOT NULL
amount          numeric(12,2) NOT NULL
currency        char(3) DEFAULT 'USD'
description     text
receipt_url     text
created_at      timestamptz DEFAULT now()
updated_at      timestamptz

INDEX (tenant_id, date DESC)
INDEX (lease_id)
```

`category` enum: `rent | utilities | internet | renters_insurance | hoa | maintenance | other`

#### Property archival
```sql
ALTER TABLE properties ADD COLUMN status enum DEFAULT 'active';
-- 'active' | 'archived' | 'sold'
ALTER TABLE properties ADD COLUMN archived_at timestamptz;
```
A property with expenses/payments is **never deleted** — only `status='archived'`.

---

### 6.3. API endpoints

#### Landlord
```
GET    /api/portfolio/landlord/summary
       ?from=&to=&propertyId=&includeArchived=
       → { totalIncome, totalExpenses, netOperatingIncome, byProperty: [...] }

GET    /api/portfolio/landlord/properties/:id?from=&to=
       → { property, income: [...], expenses: [...], maintenance: [...] }

POST   /api/portfolio/landlord/expenses
       body: { propertyId, date, category, amount, vendor?, description?, receiptUrl? }

PATCH  /api/portfolio/landlord/expenses/:id
DELETE /api/portfolio/landlord/expenses/:id

GET    /api/portfolio/landlord/export?format=csv|pdf&from=&to=&propertyId=
       → file stream
```

#### Tenant
```
GET    /api/portfolio/tenant/summary?from=&to=
       → { totalExpenses, byCategory, byProperty: [...] }

GET    /api/portfolio/tenant/transactions?from=&to=&propertyId=
       → { items: [...], page, total }

POST   /api/portfolio/tenant/expenses
       body: { propertyId?, leaseId?, date, category, amount, description?, receiptUrl? }

PATCH  /api/portfolio/tenant/expenses/:id
DELETE /api/portfolio/tenant/expenses/:id

GET    /api/portfolio/tenant/export?format=csv|pdf&from=&to=
       → file stream
```

**Income (rent payments)** for both roles is read from the **existing** `payments` module — backend aggregates internally, frontend doesn't need to know the source.

---

### 6.4. Frontend structure

#### Routes
```
/landlord/portfolio                    → PortfolioOverviewPage
/landlord/portfolio/:propertyId        → PropertyAccountingPage
/tenant/expenses                       → TenantExpensesPage
```

#### Files (new)
```
src/pages/landlord/portfolio/
  PortfolioOverviewPage.tsx
  PropertyAccountingPage.tsx
src/pages/tenant/expenses/
  TenantExpensesPage.tsx

src/components/portfolio/
  shared/
    SummaryCard.tsx           — KPI cards (income/expenses/net)
    PeriodPicker.tsx          — This Month / YTD / Last Year / Custom
    CategoryBadge.tsx
    ExportButton.tsx          — dropdown CSV/PDF/Email-CPA
    ExpenseTable.tsx          — generic, props-driven
    AddExpenseDialog.tsx      — generic, role-aware
    DeleteExpenseDialog.tsx
  landlord/
    PropertyBreakdownTable.tsx
    PropertyDetailTabs.tsx    — Income | Expenses | Maintenance | Documents
  tenant/
    TenantPropertyHistoryTabs.tsx  — Current | Past Properties
    TenantTransactionList.tsx

src/services/portfolio/
  portfolioApi.ts             — fetch wrappers
  exportService.ts            — CSV builder, PDF trigger

src/hooks/portfolio/
  useLandlordPortfolio.ts
  useTenantPortfolio.ts
  usePortfolioExpenses.ts     — CRUD mutations

src/types/portfolio.ts        — types for the whole module
```

---

### 6.5. UI structure (text wireframes)

#### `/landlord/portfolio`
```
┌─────────────────────────────────────────────────────────┐
│ Portfolio Accounting          [Period: YTD ▾] [Export ▾]│
├─────────────────────────────────────────────────────────┤
│ [Total Income] [Total Expenses] [Net OI] [# Properties]│
├─────────────────────────────────────────────────────────┤
│ [Search] [☐ Include archived] [+ Add Expense]          │
├─────────────────────────────────────────────────────────┤
│ Property         Tenant     Income   Exp.    Net    →  │
│ 123 Main St      J. Smith   $24,000  $3,200  $20,8  →  │
│ 456 Ocean Dr     vacant     $0       $1,100  -$1,1  →  │
└─────────────────────────────────────────────────────────┘
```

#### `/landlord/portfolio/:propertyId`
```
< Back to Portfolio
┌─────────────────────────────────────────────────────────┐
│ 123 Main St — Portfolio                  [Export ▾]    │
│ Status: Active   Lease: J.Smith → 2026-12-31           │
├─────────────────────────────────────────────────────────┤
│ [Income] [Expenses] [Maintenance] [Documents]          │
├─────────────────────────────────────────────────────────┤
│  (active tab content)                                   │
└─────────────────────────────────────────────────────────┘
```

#### `/tenant/expenses`
```
┌─────────────────────────────────────────────────────────┐
│ My Housing Expenses    [Period: YTD ▾] [Export ▾]      │
├─────────────────────────────────────────────────────────┤
│ [Total Spent] [Rent] [Utilities] [Other]               │
├─────────────────────────────────────────────────────────┤
│ [Current Property] [Past Properties (2)]               │
├─────────────────────────────────────────────────────────┤
│ Date       Category    Property      Amount    Actions │
│ 2026-04-01 Rent        123 Main St   $2,000    ⋯       │
│ 2026-04-05 Utilities   123 Main St   $145      ⋯       │
│                              [+ Add Transaction]       │
└─────────────────────────────────────────────────────────┘
```

---

### 6.6. Acceptance criteria

#### Landlord
- [ ] Sees total income/expenses for the selected period across the whole portfolio
- [ ] Income is auto-pulled from the payments module (rent, late fees) — no manual entry
- [ ] Expenses from the maintenance module appear automatically in the `Maintenance` tab on the property detail (read-only links)
- [ ] Add Expense dialog: all 6 categories, validation `amount > 0`, `date ≤ today`
- [ ] Edit/Delete for own expenses works
- [ ] Export CSV: `Date | Property | Category | Amount | Vendor | Description`
- [ ] Export PDF — 1-page summary with totals per category + per property
- [ ] Email-to-CPA: opens `mailto:` with pre-filled subject `LeaseFi Portfolio Report — {period}` and CSV in the body (Phase 1)
- [ ] `status=archived` properties are shown only when the filter is enabled
- [ ] Last-year export includes data for archived properties
- [ ] Period picker: This Month / YTD / Last Year / Custom

#### Tenant
- [ ] Sees total housing expenses for the period
- [ ] Rent payments come automatically from the payments module
- [ ] Manual entry for utilities/internet/insurance/HOA
- [ ] `Past Properties` tab shows leases with `status=ended`
- [ ] Export contains per-property breakdown (important — Anthony said that if a tenant moves mid-year, both periods must be visible)
- [ ] Add Transaction: all 7 categories, required `date+amount+category`

#### General
- [ ] CSV opens cleanly in Excel/Google Sheets (UTF-8 BOM, proper comma escaping)
- [ ] Period picker defaults to YTD
- [ ] Empty states: "No expenses yet — add your first one" with CTA
- [ ] Loading states (skeletons) for all tables/cards
- [ ] Mobile responsive

---

### 6.7. Edge cases

| Case | Behavior |
|---|---|
| Landlord deletes an expense from a past tax year | Phase 1: allowed, with a warning in the confirm dialog |
| Tenant pays rent through an external method (cash/Venmo) | Manual entry with category `rent` is allowed |
| Property sold mid-period | Income/expenses up to and including sale date, zero after |
| Tenant moves mid-month | Expenses are tied to the `lease_id` snapshot → correctly displayed in Past Properties |
| Export for a period with no data | CSV with headers + 1 row "No data" / PDF "Empty period" |
| Currency mismatch | Phase 1: hardcoded USD, no conversion |
| Invalid receipt URL | Stored as-is, not validated |

---

### 6.8. Effort estimate (rough)

| Block | Backend | Frontend |
|---|---|---|
| DB migrations + `property_expenses` CRUD | 1d | — |
| `tenant_expenses` CRUD | 0.5d | — |
| Aggregation endpoints (summary) | 1d | — |
| Export CSV/PDF | 1d | 0.5d (trigger+download) |
| Property archival flag + filter | 0.5d | 0.5d |
| Landlord overview page | — | 1.5d |
| Landlord property detail page | — | 1.5d |
| Tenant expenses page | — | 1.5d |
| Add/Edit/Delete dialogs (shared) | — | 1d |
| Period picker + filters | — | 0.5d |
| Wiring real API | — | 1d |
| QA + edge cases | 0.5d | 1d |
| **Total** | **~5d** | **~9d** |

≈ **2 working weeks frontend + 1 week backend** (in parallel — ~2 weeks calendar time).

---

### 6.9. Other tasks (FE-01, FE-02, FE-03)

#### FE-01: Price input in the filter
- **Where:** Marketplace search filters modal (existing)
- **What:** add two text inputs `Min Price` / `Max Price` next to the slider, with both edit paths kept in sync
- **Validation:** numeric, `min ≥ 0`, `max ≥ min`
- **Estimate:** 0.5d FE

#### FE-02: Help/Onboarding tab
- **Where:** global component (header dropdown or dashboard widget)
- **What:** button/tab with 6 quick-action cards:
  - Create landlord account → registration with `role=landlord`
  - Create tenant account → registration with `role=tenant`
  - Create property manager account → registration with `role=manager`
  - List property (for landlord) → `/landlord/properties/new`
  - Look for property (for tenant) → `/marketplace`
  - Create wallet → CSPR.click flow
- **UX:** show only the cards relevant to the user's role/auth state
- **Estimate:** 1.5d FE

#### FE-03: Seamless gas/token UX
- **Where:** transaction confirmation dialogs (lease signing, property listing)
- **What:**
  - Hide raw CSPR amounts, show $ equivalent
  - Button copy "Pay Gas Fee ($1.20)" instead of "Sign Transaction"
  - Progress bar with human-readable statuses: `Preparing... → Signing... → Confirmed ✓`
- **Estimate:** 2d FE (needs design from client)

---

## 7. Open questions for the client

1. **Tenant Portfolio scope:** housing only (rent/utilities/insurance/HOA/maintenance) or full personal budget? **We recommend housing only**.
2. **CSV format:** generic columns or Schedule E mapping?
3. **Email-to-CPA Phase 1:** `mailto:` acceptable?
4. **Receipt upload Phase 1:** URL only or S3 upload?
5. **Maintenance integration:** auto-pulled from the maintenance module — read-only or editable?
6. **Edit cutoff:** allow editing expenses from previous tax years?
7. **FE-03 Seamless UX:** is there a design from the client, or do we propose-and-iterate?

---

## 8. Changelog

- **2026-04-30** — first version, after the Thursday recurring meet
