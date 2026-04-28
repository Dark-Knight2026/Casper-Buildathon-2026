# Client Review Feedback — Backlog

This document tracks the 7 tasks derived from the client's product-review email
on the Tenant flow. Tasks 1–5 have shipped (some as full implementations, some
as demos with a documented backend gap). Tasks 6 and 7 remain.

| # | Task                                                      | Status        |
|---|-----------------------------------------------------------|---------------|
| 1 | Extended search filters (bedrooms, bathrooms, sqft, type) | ✅ shipped    |
| 2 | My Properties — current + past lease agreements           | ✅ shipped    |
| 3 | Nested Property Detail tabs (Leases / Payments / …)       | ✅ shipped    |
| 4 | 6-month lease-extension intent banner                     | ✅ demo¹      |
| 5 | T-91 decision banner + landlord listing actions           | ✅ demo¹      |
| 6 | Property recommendations 6 months before lease ends       | 🔲 pending    |
| 7 | Tenant Score System                                       | 🔲 pending    |

¹ Demo = UI is final, but the backend integration is mocked. Open product
questions and required endpoints are documented at the top of
`src/data/leaseExtensions.ts`.

---

## Task 6 — Property recommendations 6 months before lease ends

### Client request (verbatim)

> "Additionally, 6 months from lease expiration the tenant will be able to see
>  other properties for rent that meet their predefined requirements (should be
>  a part of their profile) with move-in dates starting the same month that
>  their current is expiring."

### Goal

When a tenant's active lease is within 180 days of ending, surface a
"Recommended for you" list of available properties that match their saved
profile preferences and become available the same month (or later) that the
current lease ends.

### Acceptance criteria

- Tenant profile has a **Rental Preferences** section with editable fields:
  - Budget range (min / max monthly rent)
  - Bedrooms (minimum)
  - Bathrooms (minimum)
  - Square footage (minimum)
  - Locations (city / state, multi-select)
  - Property types (multi-select: House, Condo, Townhouse, Apartment, Studio, Loft)
  - Must-have amenities (multi-select from `ALL_AMENITIES` in `src/types/property.ts`)
- A `getRecommendedProperties(preferences, currentLeaseEndDate)` function:
  - Filters `FEATURED_PROPERTIES` (or `propertyService.search(...)` once backend
    is ready) where every active preference is satisfied (AND across categories,
    OR within multi-select).
  - Filters `availableDate ≥ first day of the month the current lease ends`.
  - Sorts by a simple match score (e.g. count of preference categories matched
    + budget tightness) — final scoring algorithm TBD.
- A `<RecommendedProperties>` component:
  - Renders only when at least one active lease has `daysUntil(endDate) ≤ 180`.
  - Reuses `PropertyCard` from `@/components/property/PropertyCard`.
  - Shows up to 6 cards, with a "See all matches" link to a full results page.
  - Empty state: "No matches yet — try widening your preferences" with a CTA
    that opens the preferences form.
- Mounted in:
  - `TenantDashboard` (compact section, max 3 cards)
  - `MyProperties` page (separate "Recommended for you" section under Past)
  - `MyPropertyDetail` Overview tab (single best match preview, optional)
- Profile preferences UI:
  - Add a new card to `TenantProfile.tsx` with the form fields above
  - On save, persist via `PUT /api/v1/users/me/preferences` (mock for demo)

### Open product questions

1. **Match logic strictness.**
   Is the match strict (every preference must be satisfied) or fuzzy (rank by
   how many match)? Most rental sites use fuzzy + sort. The spec says "meet
   their predefined requirements" which sounds strict. Confirm.
2. **Move-in date interpretation.**
   "Starting the same month that their current is expiring" — does this mean
   *exactly* that month, or *that month or later*? The latter is more useful
   (tenant might want a flexible buffer); the former is what the words say.
3. **Multiple active leases.**
   If the tenant rents two units (e.g. our `lease-current-1` + `lease-current-2`
   demo), do we show recommendations for both end dates? Show the earliest?
   Let the tenant pick from a dropdown?
4. **Notification component.**
   The spec says the tenant "will be able to see" — is this passive (visible
   when they navigate to the dashboard) or active (in-app + email push when
   they enter the 180-day window)? The latter is consistent with Task 4's
   notification model and may share the same cron job.
5. **Match score visibility.**
   Should each recommended card show an explicit score / why it matches
   (e.g. "Matches 4/5 preferences: 3 bed, 2 bath, $2,400/mo, downtown")?
   Improves transparency but adds UI clutter.
6. **Saved searches integration.**
   The codebase already has `src/components/SavedSearches.tsx` and a
   `SearchContext`. Should preferences hook into that system, or stay separate
   as a profile-level config? They overlap conceptually.
7. **Default values for new tenants.**
   What should preferences default to before the tenant fills them in? Empty
   (no recommendations) or seeded from the current property (broadens to
   similar properties in same area)?

### Backend endpoints required

- `GET /api/v1/users/me/preferences` → tenant's saved preferences
- `PUT /api/v1/users/me/preferences` → update preferences
- `GET /api/v1/properties/recommended?leaseId=…` → server-side filtering and
  ranking (preferences + lease end month + availability)
- Daily cron at T-180:
  - For each tenant entering the 180-day window: deliver an in-app + email
    notification "New properties match your preferences" with a link to
    `/tenant/properties` or a dedicated `/tenant/recommended` page

### Demo files (when implemented)

- `src/data/tenantPreferences.ts` — type, mock store, recommendation function
- `src/components/tenant/RecommendedProperties.tsx` — section component
- `src/components/tenant/TenantPreferencesForm.tsx` — edit form
- `src/pages/tenant/TenantProfile.tsx` — mount preferences card
- `src/pages/tenant/TenantDashboard.tsx`, `MyProperties.tsx`,
  `MyPropertyDetail.tsx` — mount `<RecommendedProperties>`

### Estimated effort

Medium (~M). UI is straightforward (reuses `PropertyCard`); the bulk of work
is the preferences form, the matching algorithm, and reconciling with the
existing `SearchContext` / `SavedSearches`.

---

## Task 7 — Tenant Score System

### Client request (verbatim)

> "I would like to create a tenant score system based on time rent payments,
>  maintenance documentation (changing out air filters, mowing grass, home
>  repairs or improvements), renting long term (longer the tenant stays in one
>  property the higher the score). The idea behind this scoring system would be
>  two fold; one used this system of human behavior over credit scores to
>  determine preferred tenants. Two this system can be a gate to prevent
>  landlords from renting to unfavorable tenants."

### Goal

A behavioral reputation metric for tenants, computed from in-platform activity,
used in two directions:

1. **Tenant-facing positioning.** Brand message: "human behavior over credit
   scores". Tenant sees their own score and component breakdown.
2. **Landlord gate.** Landlord can set a minimum-score threshold per property;
   applications below that score are automatically filtered or flagged.

### Score components (from client)

- **On-time rent payments** — % of payments made on or before due day vs late.
- **Maintenance documentation** — verified routine maintenance the tenant logs
  (e.g. air filter replacements, lawn care, repairs, improvements). Each entry
  with photo / receipt / landlord acknowledgement contributes.
- **Tenancy duration** — longer continuous tenancy in a single property
  weighted higher than frequent moves.

Future components likely (not in spec, recommend asking):

- Maintenance request response (tenant followed up vs ignored)
- Communication responsiveness (replied to landlord messages within X)
- Property condition at move-out (final inspection)
- Application completeness / verification

### Open product questions (must be answered before any work starts)

1. **Scale.**
   - 0–100 (FICO-shaped from 300–850 is alternative)
   - 5-star
   - A–F letter grades
   The choice impacts every UI surface. Recommend discussing this first.
2. **Component weights.**
   What % does each factor contribute?
   - Initial proposal: 50% on-time payments, 30% tenancy duration, 20%
     maintenance documentation. Needs client sign-off and should be
     **configurable** (e.g. via admin settings) to retune later.
3. **Cold start — new tenants.**
   - "Unscored" badge until N events accumulate?
   - Neutral starting score (e.g. 70/100) that drifts based on behavior?
   - Inherit from external KYC / credit when available?
   Pick a policy.
4. **Maintenance documentation verification.**
   Tenant uploads a photo of a replaced air filter. Trust-based, or does
   landlord need to acknowledge ("Yes, I verified this")? Trust-based is
   gameable; landlord-verified adds friction. Hybrid: auto-trust low-impact
   items, require landlord ack for high-impact ones.
5. **Manual override.**
   Can platform admins (or landlords) adjust a score manually to correct
   errors / handle disputes? Probably yes — needs an audit trail.
6. **Score recomputation cadence.**
   Real-time on every event, nightly batch, or hybrid (event-driven for big
   changes, batch for tenancy-duration drift)? Hybrid is most efficient.
7. **Privacy and visibility.**
   - Tenant always sees their own score and breakdown.
   - Does landlord see numeric score on every application, only a band
     ("Excellent / Good / Fair / Poor"), or just a pass/fail vs threshold?
   - Does tenant see who has viewed their score (consent / transparency)?
   - GDPR / data retention — how long is score data kept after tenant
     leaves the platform? Right to delete?
8. **Discrimination + fair-housing risk.**
   A score gate is functionally similar to credit-score gating — needs
   **legal review** in jurisdictions with fair-housing laws. The "renting
   long term" weight, in particular, may disadvantage protected classes.
   This isn't a code question — it's a product / compliance question that
   should be answered before implementation, not after.
9. **Dispute / appeal flow.**
   If a tenant believes a payment was wrongly marked late or a maintenance
   entry was rejected, how do they contest it? UI + landlord workflow needed.
10. **Score portability.**
    Does the score travel if the tenant moves to a different property
    (assumed yes, since it's tenant-keyed). What about across platforms /
    export to PDF for off-platform applications?
11. **Threshold semantics for landlord gate.**
    - Soft gate: applications below threshold are flagged but still visible.
    - Hard gate: applications below threshold are auto-rejected / hidden.
    Hard gate is closer to the spec ("prevent landlords from renting"); soft
    gate is safer legally. Pick or make it configurable per landlord.
12. **What about new properties / new landlords?**
    The threshold gate is only useful when the tenant has a score. For a new
    tenant + new landlord both, the gate is no-op. Default behavior?

### Acceptance criteria (high-level — needs refinement after Q&A)

- A `tenantScoreService` (backend) computes and stores scores from event
  streams (payments, maintenance logs, lease events).
- Tenant sees a **Score** section in `TenantProfile`:
  - Current numeric score + band
  - Component breakdown with explanations
  - History chart (score over time)
- Landlord sees the score on **applications** they receive:
  - On `MyApplications` / landlord application detail screens
  - Numeric or band, depending on Q7
- Landlord property settings include `min_tenant_score` field:
  - Set per property
  - Applications below threshold are gated per Q11
- Audit log of every score change, every score view, every threshold gate hit.

### Backend endpoints required (sketch — depends on Q&A)

- `GET /api/v1/users/:id/score` → current score + breakdown
- `GET /api/v1/users/:id/score/history` → time series
- `POST /api/v1/users/:id/score/dispute` → start dispute flow
- `POST /api/v1/maintenance-logs` → tenant logs maintenance event (photo upload)
- `PATCH /api/v1/maintenance-logs/:id/verify` → landlord verifies
- `PATCH /api/v1/properties/:id/score-gate` → set per-property threshold

### Demo files (when implemented)

- `src/data/tenantScore.ts` — type, mock score, recompute function (mock)
- `src/components/tenant/TenantScoreCard.tsx` — score display + breakdown
- `src/components/tenant/MaintenanceLogForm.tsx` — tenant logs filter change etc.
- `src/components/landlord/ApplicationScoreBadge.tsx` — show on applications
- `src/pages/tenant/TenantProfile.tsx` — mount score card
- `src/pages/landlord/properties/PropertyEdit.tsx` — `min_tenant_score` field

### Estimated effort

Large (L+). This is the biggest task in the backlog and the most cross-cutting.
**Recommend a discovery / design pass before implementation:**

- Product Q&A session covering questions 1–12 above
- Legal / fair-housing review of the gating mechanism
- Score formula prototype + walkthrough with 5–10 sample tenant histories
- UI design pass for tenant view, landlord view, and dispute flow

Implementation should not start until at least questions 1, 2, 3, 7, 8, and
11 are answered in writing.

---

## Notes

- Tasks 4 and 5 share the same demo module (`src/data/leaseExtensions.ts`)
  with their own verbatim client quotes and open questions documented at the
  file top. Tasks 6 and 7, when implemented, should follow the same pattern:
  inline `// DEMO-ONLY` block at the top of the data module + quote + Q&A list.
- All tasks reuse mock data conventions established in Tasks 2–5
  (`src/data/featuredProperties.ts`, `src/data/tenantLeases.ts`, etc.) until
  the corresponding backend endpoints are available.
