# Client Review Feedback — Backlog

This document tracks tasks derived from client product feedback. Tasks 1–7
came from the original Tenant-flow review email; tasks 8–13 were captured
during the LeaseFi recurring meeting on **2026-05-07** with Anthony Batten
and Chris. Tasks 14–16 are explicitly post-MVP (phase 2 / blocked on legal).
Tasks 17–26 were captured on **2026-05-26** after Anthony shared
`docs/client-doc/leasefi-design-reference.html` and clarified scope via Slack.
Task 30 was captured at the **2026-05-28** recurring meeting after a
CSPR.click account lockout exposed the identity/wallet coupling problem.

| #  | Task                                                       | Status            |
|----|------------------------------------------------------------|-------------------|
| 1  | Extended search filters (bedrooms, bathrooms, sqft, type)  | ✅ shipped        |
| 2  | My Properties — current + past lease agreements            | ✅ shipped        |
| 3  | Nested Property Detail tabs (Leases / Payments / …)        | ✅ shipped        |
| 4  | 6-month lease-extension intent banner                      | ✅ demo¹          |
| 5  | T-91 decision banner + landlord listing actions            | ✅ demo¹          |
| 6  | Property recommendations 6 months before lease ends        | 🔲 pending        |
| 7  | Tenant Score System                                        | 🔲 pending        |
| 8  | User Onboarding Tour (post-registration tooltips)          | 🔲 pending        |
| 9  | Extended search — in-home + surrounding-area filters       | 🔲 pending        |
| 10 | Property page verification disclaimer                      | 🔲 pending        |
| 11 | Landlord-owned surrounding-area data entry                 | 🔲 pending²       |
| 12 | Terminology pass — "Tokens" → "Equity" in user-facing copy | 🔲 pending        |
| 13 | Equity gating — tenant–landlord lease option only          | 🔲 pending        |
| 14 | Bidirectional tenant ↔ landlord reviews (Uber-style)       | 🕓 phase 2        |
| 15 | Admin moderation panel for reviews                         | 🕓 phase 2        |
| 16 | Equities marketplace UI (public buy-in, secondary market)  | 🚫 blocked³       |
| 17 | Design-reference scope decision (header / wallet-invisible)| ✅ confirmed⁴     |
| 18 | Tenant home alignment with design reference §1             | 🔲 pending        |
| 19 | Landlord / PM dashboard alignment with §2                  | 🔲 pending        |
| 20 | Pay rent + `<FeeDisplay/>` canonical breakdown (§3)        | 🔲 pending        |
| 21 | `<PreSignatureConfirmation/>` shared modal (§4)            | 🔲 pending        |
| 22 | Lease invitation landing — pre-auth, anti-phishing (§5)    | 🔲 pending        |
| 23 | Lease signing journey — wizard + counter-sign (§6)         | 🔲 pending        |
| 24 | Dispute filing UI (§7)                                     | 🔲 pending⁵       |
| 25 | `<TransactionStatus/>` shared state-machine (§8)           | 🔲 pending        |
| 26 | `<KYCGate/>` around Sumsub WebSDK  (§10)                   | 🔲 pending        |
| 27 | ICO page rebrand — Token Sale → Big Token Dashboard        | 🚧 partial⁶       |
| 28 | Apply Now duplicate on tenant Property Detail              | ✅ shipped        |
| 29 | MVP role narrowing — purge buyer/seller/agent/broker UI    | 🔲 pending⁷       |
| 30 | Auth/wallet decoupling — backend identity + sign-time wallet| 🔲 pending⁸       |

¹ Demo = UI is final, but the backend integration is mocked. Open product
questions and required endpoints are documented at the top of
`src/data/leaseExtensions.ts`.

² Pending alignment with Anthony — confirm landlord is the source of truth
for surrounding-area POIs (Chris suggested it on 2026-05-07; Anthony agreed
in principle but exact ownership not yet locked).

³ Blocked on SEC licensing and DAO-structure decisions. Anthony explicitly
deferred this to post-MVP because offering equity outside a tenant–landlord
lease option agreement turns the platform into a securities offering.

⁴ Anthony confirmed on 2026-05-26 via Slack that we take **flow / information
displayed / copy rules** from the design reference, and **keep current
header layout, palette (emerald/navy), fonts (Inter), icons (lucide), and
invisible-wallet UX**. See Task 17 for the verbatim exchange.

⁵ Phase-1 inclusion is unconfirmed — Kenneth's DisputeModule (ADR-005) lands
on-chain in Phase 0, but the FE filing UI is not in the Critical 6 spine.
Defer to Phase 1.1 unless Anthony explicitly pulls it forward.

⁶ Driven by Anthony's 2026-05-20 recurring meeting (Clarity Act compliance):
"sales" / "investor" / "ICO" terminology cannot remain in MVP-reachable
copy without triggering securities classification. ICO page itself is
**not deleted** — it is repurposed as a rewards dashboard surface.

⁷ MVP audience is **tenant + landlord/PM only**. Buyer / seller / agent /
broker (and the associated attorney / inspector / escrow / title / CPA /
mortgage / insurance dashboards) are pre-LeaseFi-pivot scaffolding that
remained in the tree. They are not deleted from the repo — they are
unmounted from MVP routing and hidden from MVP navigation. See Task 29.

⁸ Captured at the **2026-05-28** recurring meeting after Anastasia's
CSPR.click lockout (forgot the wallet password → account inaccessible).
**Amends Task 17's invisible-wallet decision:** identity moves to a
backend-owned auth layer (own login, independent of any wallet); the
wallet becomes a separate, on-demand *signing* concern attached to the
profile. Backend login rewrite required (Ivan confirmed on the call).
Confirm final scope with Anthony before implementation; the CSPR.click
team question (Web3Auth factor mode per appId) is still open.

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

## Task 8 — User Onboarding Tour

### Client request (verbatim, meeting 2026-05-07)

> Anastasia: "After registration and like first login, the user automatically
> presented with interactive onboarding like Tour across the dashboard. So like
> step by step, tooltips, or modals attached to key interface elements like
> what the section or button does. Useful and what action the user can perform."
>
> Anthony: "Go for it. You got it. Go for it. I think it's a perfect idea."

### Goal

Walk first-time users through the dashboard immediately after their first
authenticated session, so the value of each section (especially the new
Tenant Score and Recommendations blocks) is discovered without requiring
the user to read documentation.

### Acceptance criteria

- Tour activates automatically on the **first authenticated session after
  registration**, per role.
- Step-by-step tooltips / modals attached to key interface elements:
  - Each step explains: *what* the section is, *what action* the user can
    perform, *why* it matters
  - Active element is highlighted (spotlight / dimmed background)
  - Keyboard navigation: `Esc` skips, `Enter` / arrows advance
- "Skip tour" and "Don't show again" persist per user (backend flag).
- Re-launchable from the Help page ("Restart tour" button).
- Per-step completion tracked so a partial tour can resume.
- Coverage:
  - **Tenant**: dashboard summary → Tenant Score → Recommendations → Profile → Help
  - **Landlord**: properties list → lease creation entry → Profile → Help
  - **Other roles**: dashboard + Profile + Help (extend as those flows mature)

### Open product questions

1. **Tour library vs custom.** Use a library (`react-joyride`, `intro.js`,
   `shepherd.js`) or build a thin custom layer? Library is faster but adds
   styling reconciliation work with Tailwind / shadcn.
2. **One tour or per-section tours?** A single linear tour covering the
   whole dashboard, or short tours that auto-trigger the first time the
   user lands on each major page?
3. **Mobile behavior.** Same tour adapted to small screens, a different
   short version, or skipped on mobile entirely?
4. **Re-trigger after major releases.** When we ship a significant new
   surface (e.g. ICO page), should returning users see a "What's new" mini
   tour, or only new users?

### Backend endpoints required

- `GET /api/v1/users/me/onboarding` → `{ completed_steps: string[], dismissed: bool }`
- `PATCH /api/v1/users/me/onboarding` → record step completion / dismissal

### Demo files (when implemented)

- `src/components/onboarding/OnboardingTour.tsx` — orchestrator
- `src/data/onboardingSteps.ts` — step definitions per role
- `src/hooks/useOnboarding.ts` — state + persistence
- `src/pages/Help.tsx` — "Restart tour" CTA

### Estimated effort

Small–Medium (S/M). The mechanics are well-trodden; bulk of work is writing
copy for each step and coordinating with future page changes.

---

## Task 9 — Extended Search: In-Home + Surrounding-Area Filters

### Client request (verbatim, meeting 2026-05-07)

> Chris: "Anthony's any thoughts on like having like, within a certain area
> filters? Like for example, if I want like a children's hospital or a hospital
> within like 15 miles because I have certain conditions… more in the area
> filters?"
>
> Anthony: "Click all of those features and then it's able to say like with
> what mileage… you can have certain categories that you would normally find
> within the home like, you know, refrigerator or garage… and then certain
> things like the gym or movie theaters, hospitals, whatever it is, you can
> put like a category or area of things within the neighborhood."

### Goal

Let tenants filter the property search by both **what's inside the unit**
and **what's nearby**, with a per-category proximity slider on the
surrounding-area filters.

### Acceptance criteria

- Filters split into two visually distinct groups on the search page:
  - **In-home amenities** (boolean toggles): heating, AC, natural light,
    pool, garage, in-building gym, pet-friendly, in-unit laundry,
    dishwasher, refrigerator, …
  - **Surrounding area** (toggle + per-category mile-range slider):
    hospital, school, gym, airport, park, grocery store, public transit
- Each enabled surrounding-area category exposes its own mile slider
  (e.g. "Hospital within 20 mi"). Default radius is configurable per
  category; user changes are remembered for the session.
- Property cards in results show the matched POI distance per category
  ("Nearest hospital: 12 mi").
- Filter state is reflected in the URL so searches are shareable.
- Empty / no-match state suggests widening the radius or removing filters.

### Dependencies

- Requires Task 11 (landlord-supplied surrounding-area data) to have data
  to query. Until that ships, the filter operates on mock POI data.

### Open product questions

1. **Match strictness for surrounding area.** AND across categories
   (must satisfy *all*) or rank by how many are satisfied?
2. **Mile-range presets.** Show preset buttons (5 / 10 / 20 / 50 mi) or
   a free slider only? Presets are faster on mobile.
3. **Imperial vs metric.** US-only for MVP, or allow km for international
   tenants?
4. **POI source for v2.** When we move beyond landlord-entered data, which
   provider — Google Places, Mapbox, custom dataset?

### Backend endpoints required

- `GET /api/v1/properties/search?…` — extend with:
  - Repeating `amenity_in_home[]` parameter
  - Repeating `amenity_nearby[<category>]=<miles>` parameters
- Server-side filtering of POIs by haversine distance from the property

### Demo files (when implemented)

- `src/components/search/InHomeAmenitiesFilter.tsx`
- `src/components/search/SurroundingAreaFilter.tsx`
- `src/data/amenityCategories.ts` — controlled lists for both groups
- `src/services/propertyService.ts` — extend `search` signature

### Estimated effort

Medium (M). UI is the bulk of work; per-category mile sliders need careful
mobile layout. Backend extension is straightforward.

---

## Task 10 — Property Page: Verification Disclaimer

### Client request (verbatim, meeting 2026-05-07)

> Chris: "I think we should have like some kind of disclaimer that the customer
> should double check or verify what they see because if they see that the
> landlord says, hey, there's a gym, two miles near, but then the customer has
> to go on Google Maps or something and say oh, that gym is available to the
> public or, nope, that gym is for certain people only."

### Goal

Limit liability on landlord-supplied amenity / proximity data and prompt
tenants to verify independently before signing a lease.

### Acceptance criteria

- A persistent disclaimer block on every property detail page, near the
  amenities and surrounding-area sections.
- Copy: short, plain English — *"Amenities and proximity information are
  provided by the landlord. Please verify independently before signing a
  lease."*
- Always visible (not dismissible) so a first-time visitor cannot miss it.
- Styled as an **informational notice** (neutral / blue), not a warning
  or error state.
- Same disclaimer surfaces on lease application screens that summarise
  property details.

### Open product questions

1. **Reading-level / localisation.** Should legal review the wording, or is
   plain product copy fine since it's not a contractual statement?
2. **Surface scope.** Only on property detail, or also in search result
   tooltips and the recommendation cards? Likely just detail page to avoid
   noise.

### Backend endpoints required

None — pure UI copy.

### Demo files (when implemented)

- `src/components/property/VerificationDisclaimer.tsx`
- Mounted in `src/pages/property/PropertyDetail.tsx` (or equivalent)

### Estimated effort

Small (S). Single component, two mount points.

---

## Task 11 — Landlord-Owned Surrounding-Area Data Entry

### Client request (verbatim, meeting 2026-05-07)

> Chris: "I think this would all be inputed by the landlord and somehow we're
> able to query for the customer to see."
>
> Anthony agreed: aligned with the broader principle that the landlord is
> responsible for the property's listing accuracy, with tenant verification
> via the disclaimer (Task 10).

### Goal

Capture surrounding-area POIs from the landlord at listing creation /
edit time, so the tenant filter (Task 9) has structured data to query.

### Acceptance criteria

- Property creation / edit form gains a **"Surrounding area"** section.
- Landlord can add POIs with:
  - Category (controlled list: hospital, school, gym, airport, park,
    grocery, transit, other)
  - Name (free text)
  - Distance (numeric, miles)
  - Optional note (e.g. "members-only gym, public pool nearby")
- Validation: distance is numeric ≥ 0; category from the controlled list;
  name length 1–80.
- Persisted with the property record.
- Surfaced on the property detail page (next to the disclaimer from Task 10)
  and consumed by the tenant filter (Task 9).
- Empty state: "No nearby points listed yet" — does not break tenant search.

### Open product questions

1. **Source of truth — confirm with Anthony.** Is the landlord the *only*
   data source for v1, or do we also let agents/admins edit on the
   landlord's behalf? Default: landlord + admin.
2. **Cap on entries per category.** Limit to e.g. 5 hospitals per property
   to prevent spam, or unlimited?
3. **Auto-suggest from a maps API.** Phase 2 — let landlord pick from
   nearby POIs auto-detected from the property's coordinates instead of
   typing manually. Out of scope for MVP.
4. **Verification badge.** Should manually-entered POIs show as
   "landlord-provided" while future API-sourced POIs show as "verified"?
   Phase 2 question, but the data model should accommodate.

### Backend endpoints required

- Extend property create / update payloads with `surrounding_area: SurroundingPOI[]`
- `GET /api/v1/properties/:id` returns the array
- No separate endpoint needed; ride on the existing property CRUD

### Demo files (when implemented)

- `src/components/property/SurroundingAreaEditor.tsx` — landlord form
- `src/components/property/SurroundingAreaList.tsx` — tenant-side display
- `src/types/property.ts` — add `SurroundingPOI` type
- `src/services/propertyService.ts` — extend create / update payloads

### Estimated effort

Medium (M). Form UX with dynamic rows + validation; tenant-side display
component; type plumbing through services.

---

## Task 12 — Terminology Pass: "Tokens" → "Equity"

### Client request (verbatim, meeting 2026-05-07)

> Anthony: "Could we — and I know that you guys are like coding development
> world — either we kind of swap that word out when we're communicating and
> say *equity*. So that kind of makes sense versus *tokens*… we're not
> talking tokens and splitting property into tokens and how many things, but
> it's just more so of asking the property owner: what percentage of equity
> are you willing to release to the public?"

### Goal

Align all user-facing copy with real-estate terminology. End users see
"equity" / "ownership share"; never "tokens", "supply", "wallet address",
or other blockchain jargon (CSPR.click SDK surfaces excepted — those are
wallet-level and outside our control).

### Acceptance criteria

- Audit confirms **zero occurrences** of `Token`, `tokens`, `supply`,
  `mint`, `burn`, `wallet address` in rendered UI strings outside the
  CSPR.click SDK boundaries.
- Equivalent equity-framed copy exists for every replaced phrase
  (e.g. "1% token" → "1% equity stake"; "Token supply" → "Total equity
  pool"; "Buy tokens" → "Purchase equity").
- Internal type names, variable names, and code comments may keep
  technical naming — the change is **presentation-layer only**.
- Tooltips, empty states, marketing pages, error messages, and
  notifications are all included in the audit.

### Approach

1. Grep pass on `src/**/*.{ts,tsx}` for blockchain terms in JSX text and
   string constants.
2. Replace with equity-framed copy; route uncertain cases through Anthony.
3. Add a lint rule (or test) that fails CI if forbidden terms reappear in
   user-facing files.

### Open product questions

1. **Glossary.** Confirm the canonical replacements with Anthony so the
   whole team uses the same language. Draft:
   - token → equity / ownership share
   - token supply → equity pool
   - mint → issue (equity)
   - burn → retire (equity)
   - wallet → account (where appropriate)
2. **Marketing pages.** ICO page is explicitly on-chain; does Anthony want
   it equity-framed too, or is it OK to keep "token" there since it's the
   public coin offering, not property fractionalization?

### Backend endpoints required

None.

### Demo files (when implemented)

- Codebase-wide string audit; no single new file.
- Optional: `src/lib/copy/equityGlossary.ts` documenting canonical terms.

### Estimated effort

Medium (M). Mechanically simple but spread across many files; review /
copy decisions per surface make it slower than a pure rename.

---

## Task 13 — Equity Gating: Tenant–Landlord Lease Option Only

### Client request (verbatim, meeting 2026-05-07)

> Anthony: "Equity splits would only be like a lease option agreement between
> the property owner and the actual tenant themselves. And so anybody outside
> of that would not be able to purchase equity within that property. Right
> now. So we can put like a gate or a toggle, or whatever it is — anything
> beyond that becomes a security and we have to create a Dow which puts us
> in a whole another category that we do not have licenses for."
>
> Chris: "Maybe it's only unlocked during a lease agreement. If the landlord
> clicks that Rent to own button or something like that."

### Goal

Prevent equity-purchase UI from appearing outside an approved tenant–landlord
lease option agreement, to keep the platform out of securities-regulation
scope until SEC licensing and DAO-structure questions are resolved.

### Acceptance criteria

- Equity controls are **hidden by default** on every property detail page.
- They unlock only when **both** conditions are true:
  1. The landlord has enabled "Rent to own" / lease option on the property.
  2. The current viewer is the tenant on the active lease for that property.
- Any other viewer (other tenants, agents, public, even other landlords)
  sees a "Not available" state — no marketplace, no public buy-in, no
  "interested" CTA.
- Gating is enforced **server-side** as well as client-side. The frontend
  should treat the API as authoritative; UI hiding is a usability layer,
  not a security layer.
- Public equities marketplace (Task 16) stays out of the navigation tree
  until the gate is lifted.

### Open product questions

1. **Audit log.** When a landlord enables / disables "Rent to own" on a
   property mid-lease, how is that change communicated to the tenant?
   In-app notification? Does it retroactively expose existing equity?
2. **Multi-tenant leases.** If a unit has two co-tenants, does equity
   split across both, or only the primary lease holder? Anthony's quote
   implies "the actual tenant" — likely primary holder, confirm.
3. **What happens at lease end?** Tenant-purchased equity persists past
   lease end (assumed yes — they own a piece of the asset). Confirm
   transferability rules or lock period.
4. **Soft launch / kill switch.** Need a feature flag so the entire
   equity surface can be turned off for a property type or region while
   we gather legal sign-off per jurisdiction.

### Backend endpoints required

- `GET /api/v1/properties/:id/equity` — returns 403 / empty unless caller
  is the gated tenant
- `POST /api/v1/properties/:id/equity/purchase` — same gating
- Property record gains `lease_option_enabled: bool`
- Lease record relationship is the source of truth for "who is the tenant"

### Demo files (when implemented)

- `src/hooks/useEquityAccess.ts` — encapsulates the gating predicate
- `src/components/property/EquitySection.tsx` — only renders when access granted
- `src/services/propertyService.ts` — `lease_option_enabled` field
- Feature-flag wiring (`src/lib/featureFlags.ts` or equivalent)

### Estimated effort

Medium–Large (M/L). UI itself is small; the gating predicate, server-side
enforcement, feature flag, and audit considerations push effort up.
Coordinate closely with Kenneth (smart-contract side) — the contract must
also enforce that equity transfers respect the same gate.

---

## Task 14 — Bidirectional Tenant ↔ Landlord Reviews (Phase 2)

### Client request (verbatim, meeting 2026-05-07)

> Anthony: "Tenants being able to leave like reviews, kind of like how you
> do an Uber. So we're not interested in Airbnb… the tenant can rate the
> property owner, and then the property owner can rate the tenant. Just
> kind of like that mechanism."

### Status

🕓 **Phase 2 — explicitly deferred.** Anthony said "I think that's a phase
two mechanism. I don't think that we need that right now."

### Sketch (for future spec work)

- Tenant rates landlord at lease end (1–5 stars + optional written review)
- Landlord rates tenant at lease end (1–5 stars + optional written review)
- Reviews are surfaced on profiles and on property detail (tenant-facing)
- Reviews feed into the Tenant Score System (Task 7) as a behavioral signal
- Pairs with Task 15 (admin moderation) — required, not optional, to ship.

### Why deferred

- Surface area is large (review forms, display, moderation, dispute flow).
- Depends on a stable Tenant Score model (Task 7) for proper integration.
- Legal review needed for defamation / fair-housing exposure.

---

## Task 15 — Admin Moderation Panel for Reviews (Phase 2)

### Client request (verbatim, meeting 2026-05-07)

> Chris: "We need like supreme rights to be able to remove non value added
> reviews. Like, if people are just commenting to drive up the reviews or
> they're just like putting up random letters on our reviews, we need to
> be able to delete that."
>
> Anthony: "I was going to bring that up because I think that's a phase two
> mechanism. I don't think that we need that right now. But it is something
> that we need in the future."

### Status

🕓 **Phase 2 — bundled with Task 14.** Cannot ship reviews safely without
moderation; cannot justify moderation without reviews.

### Sketch (for future spec work)

- Admin dashboard view of all reviews with filters (flagged, low-score,
  recent, by user).
- Bulk + single delete with **mandatory reason field** (audit trail).
- Soft-delete model: reviews remain in DB for compliance / dispute, hidden
  from public view.
- Automatic flagging heuristics: gibberish detection, all-caps ratio,
  duplicate text from same user, profanity, sentiment outliers.
- Audit log: who deleted what, when, why — surfaced on the user's profile
  to the user themselves (they should know if their review was removed).

### Why deferred

Coupled to Task 14; has no use case without it.

---

## Task 16 — Equities Marketplace UI (Blocked on Legal)

### Client request (verbatim, meeting 2026-05-07)

> Anthony: "We'd have to create another contract — and because we also have
> to create a secondary market, right? And so the secondary market would be
> equities market. The landlord will say, okay, I need more equity, I'm
> going to put my property up — or put 35% of my property up — for equity
> into the equities market and then everybody gets to pool in and kind of
> do what they need to do as far as buying pieces or whatever it is until
> they reach their 100%. So essentially, it's crowdfunding the percentage
> that you're willing to give up in equity. But that's down the road."

### Status

🚫 **Blocked.** Cannot ship until:

1. SEC / securities licensing is in place (Anthony: "anything beyond that
   becomes a security and we have to create a Dow which puts us in a
   whole another category that we do not have licenses for")
2. Custodial / KYC / accredited-investor flows are designed
3. Property-owner financial-disclosure requirements are designed
   (mortgage info, insurance proof, ownership verification — Anthony
   explicitly called these out as prerequisites)
4. Smart-contract side (Kenneth) has the secondary-market contract built

### Sketch (for future spec work)

- Landlord lists "X% of property Y available as equity" on the marketplace.
- Public buyers can pool funds toward that percentage (crowdfunding model).
- Order book / fill mechanism (continuous or batch).
- KYC + accreditation gate before any buy action.
- Settlement via Treasury / payment rails (see backend on-ramp work in
  progress with Stripe + Air Wallet).

### Why blocked

Legal exposure is open-ended without licensing; building the UI before
the legal scaffolding risks throwaway work or, worse, a launch that
violates securities law.

---

## Task 17 — Design-Reference Scope Decision

### Source

`docs/client-doc/leasefi-design-reference.html` (12 sections, "Critical 6"
spine). Confirmed by Anthony via Slack 2026-05-26 in response to three
scope questions (palette swap, sidebar vs header, wallet visibility).

### Decision

- **Take from the reference:** which surfaces exist; what information
  each shows (fields, status pills, hero metrics); flow between surfaces;
  copy rules (the `GOOD / BAD` callouts); the named shared components
  (`FeeDisplay`, `PreSignatureConfirmation`, `TransactionStatus`,
  `KYCGate`, `GlobalTxIndicator`).
- **Do NOT take from the reference:** blue #2563EB + orange palette,
  IBM Plex font, Tabler icons, left-sidebar layout, visible Casper-wallet
  address pill, user-facing "Casper Wallet" / "Connect your wallet"
  labels.
- **Keep our existing:** emerald + navy palette per `STYLE_GUIDE.md`,
  Inter font, lucide icons, top-header layout, invisible-wallet UX
  (CSPR.click auto-provisions; copy stays provider-agnostic).
- **Conflict rule:** when the reference contradicts `STYLE_GUIDE.md` or
  `LEASEFI_MVP_SPEC_2026-07-15.md`, the spec wins. The reference's own
  footer states this.
- Tasks 18–26 each inherit this scope.

### Open product questions

1. **Compliance failure surface (§9 of the reference).** Reference treats
   it as `Mandatory · Regulatory · BSA §314`. Anthony said on the
   2026-05-20 call: no AML / CDD list / sanctions screening / biometric
   handling. Treating §9 as **out of scope for MVP**. Confirm before any
   work on §9 is scheduled.
2. **Dispute filing UI (§7).** Critical 6 spine includes it; Anthony has
   not explicitly pulled it into Phase 1. Kenneth is building the SC
   side. Confirm whether FE files in Phase 1 or Phase 1.1.
3. **KYC scope (§10).** Anthony's 2026-05-20 call: Sumsub is the sole
   KYC service for MVP per ADR-002 (confirmed in Dev_Team_Brief item 4
   and ADR-004 §Phase 0). What he excluded are **additional compliance
   layers on top of Sumsub** — no separate AML / CDD list lookup, no
   standalone OFAC sanctions API, no extra biometric handling beyond
   what Sumsub does internally, no third-party screening. We hold only
   `sumsub_applicant_id + kyc_status + timestamp` in our DB; documents
   stream browser → Sumsub directly. Casper-name purchase as a separate
   KYC step is Phase 2.

### Backend endpoints required

None — scope decision, not implementation.

### Demo files (when implemented)

None — meta-task. Tracked here so subsequent tasks can reference it.

### Estimated effort

0 h — decision already captured. The hours land in Tasks 18–26.

---

## Task 18 — Tenant Home Alignment (Design Reference §1)

### Source

`docs/client-doc/leasefi-design-reference.html` §1 "Tenant home". Scope
inheritance: **Task 17** (information + flow + copy only; keep current
header layout, palette, invisible-wallet UX).

### Goal

Restructure `src/pages/tenant/TenantDashboard.tsx` so it matches the
Critical 6 information architecture: single primary CTA (Pay rent),
status-forward `Active lease` hero card, recent activity list, automatic
audience detection.

### Acceptance criteria

- Tenant view renders for wallets with **0–1 leases owned as landlord**.
  When the count crosses to 2+, auto-flip to the PM view (Task 19). One-time
  "Your view just changed" onboarding moment on the crossover.
- **One primary CTA per surface.** `Pay rent` is the only accent-color
  button on this page. All secondary actions are tertiary-styled.
- Hero `Active lease` card shows: property address, `Active` status pill
  (icon + color, not color alone — WCAG 2.1 AA), "Next rent due in N days",
  rent amount in monospace `$X.XX USDC`, single CTA.
- Recent activity list renders icon + label + ISO date + amount in mono.
  Items: `Rent paid`, `Lease signed`, `Deposit funded`. Reuse existing
  `tenantPayments.ts` and `tenantLeases.ts` demo data sources.
- Empty state ("no active lease") renders the empty-state pattern, **not**
  a disabled card with greyed-out CTA.
- Greeting line: `Welcome back, {firstName}` from profile. Fallback to
  shortened wallet address (`0x…4f3a`). Never the full wallet address.
- Drop the old `EnhancedTenantDashboard*` duplicate files
  (`src/pages/EnhancedTenantDashboard.tsx`,
  `EnhancedTenantDashboardWithPayments.tsx`,
  `EnhancedTenantDashboardWithOnboarding.tsx`) — confirmed orphans.

### Open product questions

1. Audience detection — does "lease owned as landlord" mean `landlordId === me`
   on any `Property`, or rows in a separate `leases` table? Tied to BE schema.
2. Crossover moment copy — what does "Your view just changed" toast/modal
   say exactly? Draft and confirm with Anthony.

### Backend endpoints required

- `GET /api/v1/leases?role=tenant&status=active` — already documented in
  spec §3.4 as BE-blocked.
- `GET /api/v1/payments/recent?limit=N` — activity feed source.

### Demo files (when implemented)

- `src/pages/tenant/TenantDashboard.tsx` — restructure (existing)
- `src/components/tenant/ActiveLeaseHero.tsx` — new hero card
- `src/components/tenant/RecentActivityList.tsx` — new activity feed
- Delete: `src/pages/EnhancedTenantDashboard*.tsx` (3 orphans)

### Estimated effort

~14 h. Existing page; mostly restructure + copy. New components are small.

---

## Task 19 — Landlord / PM Dashboard Alignment (Design Reference §2)

### Source

`docs/client-doc/leasefi-design-reference.html` §2 "Landlord / PM dashboard".
Scope inheritance: **Task 17**.

### Goal

Bring `src/pages/landlord/LandlordDashboard.tsx` to the Critical 6 layout:
four hero metrics, sortable portfolio table, clickable status pills as
deep-links. Stessa-functional density.

### Acceptance criteria

- Four hero metrics in a 4-column grid, color-coded by intent:
  - `Active leases` (neutral)
  - `Monthly rent` (neutral, mono number)
  - `Collected (Dec)` (success-green)
  - `Outstanding` (warning-amber — **not red**; red is escalation, not
    status)
- Sortable portfolio table: `Property / Tenant / Rent / Status / ⋮`.
- Status pills double as deep-links:
  - `Paid Dec 1` → payment detail
  - `Due Dec N` → upcoming-payment view
  - `3d late` → late-fee detail
  - `Dispute open` (info-blue, not red) → dispute view
  - `Confirming` → in-flight TransactionStatus (Task 25)
- `⋮` (dots-vertical) is reserved for **bulk actions only**. Single-row
  actions live on the status pill or `Property` cell.
- Header actions on the **right of our existing top header**: `Export`
  (secondary) and `Add property` (primary). Do not introduce a sidebar.
- Auto-detection on `wallet owns ≥2 leases as landlord`. No user-facing
  "switch view" toggle.

### Open product questions

1. Hero metric "Collected (Dec)" — does Dec mean current month or
   trailing 30 days? Trailing is more useful mid-month; calendar is the
   reference's choice.
2. Export format — CSV only, or PDF/XLSX too? CSV ships in Phase 1;
   others Phase 2.
3. Bulk-action set — which actions are bulk-capable? Suggest: mark
   communication sent, export selected rows, send reminder. Confirm.

### Backend endpoints required

- `GET /api/v1/landlord/dashboard/stats` — replaces
  `MOCK_LANDLORD_DASHBOARD_STATS` from `src/data/landlordMockData.ts`.
- `GET /api/v1/landlord/portfolio?sort=&filter=&page=` — table data.

### Demo files (when implemented)

- `src/pages/landlord/LandlordDashboard.tsx` — restructure (existing)
- `src/components/landlord/PortfolioTable.tsx` — new sortable table
- `src/components/landlord/StatusPill.tsx` — shared pill with deep-link

### Estimated effort

~22 h. Mock data already in `landlordMockData.ts`; bulk of the work is the
table component (sorting / filtering / multi-select) and pill deep-links.

---

## Task 20 — Pay Rent + `<FeeDisplay/>` Canonical Breakdown (Design Reference §3)

### Source

`docs/client-doc/leasefi-design-reference.html` §3 "Pay rent & FeeDisplay
component". Spec ref: `PRD FR-1.4.3.12`. Scope inheritance: **Task 17**.

### Goal

Promote the fee breakdown to a parameterized shared component reused
identically across rent, late fee, buyout, deposit funding, and dispute
filing. Make the button label include the exact total (regulatory
requirement).

### Acceptance criteria

- New shared component `src/components/payments/FeeDisplay.tsx` with API:
  `<FeeDisplay base={…} feePercent={2} label="Rent amount" currency="USDC" />`.
  Renders three rows: base / fee (with explicit `%`) / total (mono, bold).
- `MakePayment.tsx` consumes `<FeeDisplay/>` — drop the inline breakdown.
- Submit button label = `Pay $1,530.00 USDC` (the exact total, not "Submit"
  or "Pay now"). Constant-source the format helper so all fee-bearing
  flows stay identical.
- Before signing: wrap the submit in `<PreSignatureConfirmation/>`
  (Task 21).
- USDC only in MVP. **Not USDT** (Anthony, 2026-05-20 call).
- Path A (direct USDC) ships in MVP. Path B (fiat on-ramp) is Phase 2.

### Open product questions

1. Late fee percent — `2%` is the protocol fee on rent. The late-fee % is
   a per-lease setting. Confirm where it lives (lease record? global
   default? landlord-overridable?).
2. Currency display — always `USDC` suffix, or hide when single-currency?
   Reference shows it. Keep visible for now.
3. Rounding — bankers' rounding vs half-up? Stripe uses half-up. Confirm.

### Backend endpoints required

- `POST /api/v1/payments/rent` — submit (BE-blocked, payment integration TBD).
- `GET /api/v1/leases/:id/upcoming-payment` — fee preview source.

### Demo files (when implemented)

- `src/components/payments/FeeDisplay.tsx` — new shared component
- `src/pages/tenant/MakePayment.tsx` — refactor to use `<FeeDisplay/>`
- `src/lib/formatCurrency.ts` — shared formatter (likely exists; extend)

### Estimated effort

~20 h. Component itself is small (~4 h). Integrating into MakePayment +
extending to other fee-bearing flows takes the bulk.

---

## Task 21 — `<PreSignatureConfirmation/>` Shared Modal (Design Reference §4)

### Source

`docs/client-doc/leasefi-design-reference.html` §4 "PreSignatureConfirmation
modal". Spec refs: `04-eip712-ceremony.md §6`, `06-security-model.md §9`.
Scope inheritance: **Task 17**.

### Goal

Build the single most consequential security UX surface — the
anti-phishing modal that fires before every wallet popup. Parameterized
once for six EIP-712 ceremonies, not six variants.

### Acceptance criteria

- New shared component
  `src/components/shared/PreSignatureConfirmation.tsx`.
- Single component, typed-data schema input. Supports six ceremonies:
  `LeaseAgreement`, `TerminationNotice`, `BuyoutAgreement`,
  `DepositRelease`, `PMAuthorization`, `Authentication`.
- Header: shield-check icon + `Review and sign` + sub-title
  (ceremony type · EIP-712) + close-X.
- Body: grid showing every typed-data field. If schema has 10 fields,
  render 10 fields. **Truncating is a signature-substitution attack
  vector — forbidden.**
- Mandatory orange-callout copy (verbatim, do not reword, do not collapse
  into a tooltip):
  > "Your Casper wallet will show the same details on the next screen.
  >  If anything looks different, cancel and contact support."
- Footer: `Verifying contract · {canonical-mainnet-address}` — canonical
  string, never user-supplied.
- Buttons: `Cancel` (returns to `idle` — **no toast, no Sentry, no error
  UI**) + `Continue to wallet →` (advances to CSPR.click).
- Fires **after PreFlight passes** (balance / allowance / network checks),
  **before** any wallet UI.

### Open product questions

1. PreFlight ownership — does each ceremony module run its own preflight,
   or do we share a `usePreFlight()` hook? Recommend the hook.
2. Reject vs failure — confirmed in spec that wallet-reject is `idle`,
   not `failed`. Re-confirm so no telemetry mistakenly logs rejects as
   errors.
3. Canonical contract address source — `.env` (per-network) or constants
   in `src/lib/contracts.ts`? `.env` cleaner.

### Backend endpoints required

None — purely on-chain interaction prep.

### Demo files (when implemented)

- `src/components/shared/PreSignatureConfirmation.tsx` — new
- `src/hooks/usePreFlight.ts` — new
- Integration in: lease sign (Task 23), pay rent (Task 20), deposit fund
  (Task 23), dispute filing (Task 24), termination, buyout

### Estimated effort

~36 h. Critical path. Component itself is moderate; the integration
across all six ceremonies takes the bulk.

---

## Task 22 — Lease Invitation Landing (Design Reference §5)

### Source

`docs/client-doc/leasefi-design-reference.html` §5 "Lease invitation
landing". Anti-phishing surface. Spec refs:
`07-ui-ux-reference.md §4 (Flow 2)`, `06-security-model.md §9`.
Scope inheritance: **Task 17**.

### Goal

First impression for tenant invitees. Render full lease terms **before**
any wallet interaction. Pre-flight a 5-step preview so signature
abandonment drops.

### Acceptance criteria

- New route `/invite/:token`. **Pre-auth** — not wrapped in
  `ProtectedRoute`.
- Anti-phishing canonical-domain pill (`lease.fi` with lock icon) next to
  the LeaseFi logo, **always visible**.
- "You've been invited" eyebrow + h2 `Sign a lease with {LandlordName}`.
- Full lease summary card before any wallet CTA: property, landlord
  (name + truncated address), monthly rent (USDC mono), security deposit
  with `refundable` pill, lease term, signed-PDF link.
- 5-step preview card "Before you sign, you'll need to:" with numbered
  bullets and time estimates:
  1. Connect your Casper wallet (~30 sec)
  2. Verify your identity (~5 min)
  3. Approve $X USDC · rent + 2% fee (~1 min)
  4. Sign the lease (~30 sec)
  5. Fund the security deposit (~1 min)
- CTAs: `Cancel` (tertiary) + `Get started →` (primary, single accent).
- Helper card "New to crypto wallets?" with friendly explainer. Copy
  rules:
  - ✅ "Security deposit (refundable)"
  - ✅ "Casper wallet"
  - ❌ "Web3 wallet"
  - ❌ "Decentralized lease signing"
  - ❌ Countdown timers / FOMO pressure
- Token validation: BE stores `sha256(invite_token)` only (per draft
  endpoint pattern). FE sends the raw token once on landing.
- Decisions on the blank-tenant pattern (landlord drafted with
  `tenant: ZERO_ADDRESS`) — verify with SC team before relying on
  "first wallet that signs claims the role" semantics.

### Open product questions

1. **Blank-tenant production guarantee.** Open in the design reference
   itself. Kenneth to confirm whether the SC enforces single-claim or
   relies on FE not to broadcast multiple claims.
2. **Token reuse / expiry.** What's the expiration window? Single-use
   or re-openable until signed?
3. **What happens if the token is invalid / expired.** Reference doesn't
   spec the error screen. Suggest a neutral "This invitation is no longer
   valid — contact your landlord" panel with no system error styling.

### Backend endpoints required

- `GET /api/v1/lease-invites/:token` → returns the lease summary that
  matches `sha256(token)`. BE-blocked.
- `POST /api/v1/lease-invites/:token/claim` → starts the wallet-connect
  flow on the server side. BE-blocked.

### Demo files (when implemented)

- `src/pages/invite/InviteLanding.tsx` — new pre-auth page
- `src/components/invite/LeaseSummaryCard.tsx` — new
- `src/components/invite/PreflightStepsCard.tsx` — new
- `src/App.tsx` — register `/invite/:token` outside `ProtectedRoute`

### Estimated effort

~28 h. New surface from scratch with security-critical copy review +
new route registration. No existing component reuse on the landing itself.

---

## Task 23 — Lease Signing Journey (Design Reference §6)

### Source

`docs/client-doc/leasefi-design-reference.html` §6 "Lease signing
journey". Highest-complexity Critical 6 flow. Spec refs:
`PRD §4.2.2`, `04-eip712-ceremony.md §6`, `Off-Chain Spec §5.5.1`,
`SC Spec §5`. Scope inheritance: **Task 17**.

### Goal

Build the two-party, two-EIP-712-signature, IPFS-pinned, draft-persisted,
asynchronous-handoff lease lifecycle. The single most expensive surface
in the FE scope.

### Acceptance criteria — sub-screens

**A · End-to-end overview**

- 2-column timeline on the wizard summary screen.
  - Landlord (7 steps): Property → Tenant info → Financial → Term →
    PDF→IPFS → Review & sign → Share invite
  - Tenant (7 steps): Receive invite → Connect wallet → Verify identity →
    Approve PaymentRouter → Sign lease → Submit `create_lease` (Tx A) →
    Fund deposit (Tx B)
- Tx-A and Tx-B labeled in mono badges.
- Final-state band "Lease fully active on Casper" with success pill.

**B · Landlord wizard (7 steps; shared chrome)**

- Step 1: Property info + photos (reuse property-create form)
- Step 2: Tenant info or blank-tenant (`ZERO_ADDRESS`) — Open Q #1 below
- Step 3: Financial terms (rent, deposit, late fee, prorate logic) —
  detailed mockup in design reference
- Step 4: Term & dates
- Step 5: Upload PDF → IPFS with progress + hash echo
- Step 6: Review & sign — invokes `<PreSignatureConfirmation/>` (Task 21)
- Step 7: Share invite link (handoff to `/invite/:token`, see Task 22)

**C · Share / handoff after landlord signs**
- Surfaces the invite URL with copy-link, email-share, expiry info.

**D · Waiting for tenant**
- Status panel showing days since send + last-visited timestamp.

**E · Lease active (both signed, on-chain finalized)**
- Success state with links to lease detail + tx-explorer.

**F · Failure-states triad**
- Tenant declined / Tx reverted / Document hash mismatch — three distinct
  copies + recovery CTAs each.

**G · Draft lifecycle state machine**
- States: `draft → landlord_signed → tenant_signed → on_chain_finalized
  → active`. Failure branches: `declined`, `expired`, `failed`.
- Encoded as a TS discriminated union in `src/types/lease.ts`.

**H · PM-on-behalf callout**
- When the signer is a PM-role wallet acting for a landlord, both the
  PreSignature modal and the lease-detail page display
  "Signed on behalf of {LandlordName}".

### Open product questions

1. Blank-tenant in production (cross-link from Task 22 Open Q #1).
2. Step 5 IPFS pinning — does FE call a pinning service directly
   (Pinata / web3.storage) or proxy through BE? Latter is safer
   (key management). Confirm.
3. Step 7 share — single invite link (sent however the landlord wants),
   or do we offer an email-send right from the UI? Email is friendlier
   but adds dep on Ivan's Postmark integration.
4. Document hash mismatch (failure-state F) — does FE recompute the
   hash from the IPFS-fetched bytes, or trust the SC's verification?
   FE-side recomputation is defense-in-depth.

### Backend endpoints required

- `POST /api/v1/leases/draft` → create/update draft
- `POST /api/v1/leases/:id/upload-document` → IPFS pinning proxy
- `POST /api/v1/leases/:id/sign` → record signature, return invite token
- `GET /api/v1/leases/:id` → lease state for waiting-screen polling
- `POST /api/v1/leases/:id/finalize` → after both signatures, surface tx
  hash from SC submission

### Demo files (when implemented)

- `src/pages/lease/LeaseWizardPage.tsx` — restructure (existing)
- `src/components/lease/wizard/Step{1..7}.tsx` — restructure existing
- `src/components/lease/LeaseLifecycleBanner.tsx` — state-aware banner
- `src/components/lease/PMOnBehalfCallout.tsx` — new
- `src/types/lease.ts` — extend with discriminated-union states

### Estimated effort

~72 h (≈ 1.5–2 calendar weeks of FE work, as the design reference
explicitly calls out). Decomposes into ~12 h per major sub-screen with
shared wizard chrome.

---

## Task 24 — Dispute Filing UI (Design Reference §7)

### Source

`docs/client-doc/leasefi-design-reference.html` §7 "Dispute filing".
SC side: `ADR-005-minimal-disputemodule-phase-0.md`.
Scope inheritance: **Task 17**.

### Goal

A minimal dispute-filing surface for tenants and landlords. Bond-bearing
(via `<FeeDisplay/>` from Task 20) + signature-bearing (via
`<PreSignatureConfirmation/>` from Task 21) flow with a stub
dispute-detail follow-up.

### Acceptance criteria

- New route `/disputes/file` (for tenant + landlord).
- Form fields: category (`deposit-withholding` / `unauthorized-charge` /
  `lease-violation` / `other`), description (free text, min 50 chars),
  evidence (file upload — IPFS pinning, same proxy as Task 23 Step 5).
- Bond breakdown via `<FeeDisplay/>` — show exact USDC amount.
- Submit invokes `<PreSignatureConfirmation/>` for the
  `DisputeBondAgreement` ceremony.
- Post-submit dispute-detail stub at `/disputes/:id` showing tx hash +
  state (`open` / `resolved-tenant` / `resolved-landlord` / `expired`).

### Open product questions

1. **Phase 1 vs Phase 1.1.** Reference labels §7 as Critical 6, but
   Anthony has not explicitly pulled it into Phase 1. Confirm before
   scheduling.
2. Bond amount — fixed per category, % of disputed amount, or
   landlord-set per lease? Kenneth's ADR-005 likely settles this; sync.
3. Evidence — file types accepted? Size limit? Multiple files per
   dispute?

### Backend endpoints required

- `POST /api/v1/disputes` → create + return EIP-712 typed data
- `POST /api/v1/disputes/:id/evidence` → IPFS upload proxy
- `GET /api/v1/disputes/:id` → detail polling

### Demo files (when implemented)

- `src/pages/disputes/DisputeFile.tsx` — new
- `src/pages/disputes/DisputeDetail.tsx` — new (stub)
- `src/components/disputes/CategorySelect.tsx` — new
- `src/components/disputes/EvidenceUpload.tsx` — reuse Task 23 IPFS
  pinning component

### Estimated effort

~24 h once Task 21 (PreSignature) + Task 20 (FeeDisplay) ship. Blocked
on Kenneth's DisputeModule for the EIP-712 schema. Defer unless
Anthony pulls it forward.

---

## Task 25 — `<TransactionStatus/>` Shared State Machine (Design Reference §8)

### Source

`docs/client-doc/leasefi-design-reference.html` §8 "TransactionStatus —
all states". Spec ref: `05-data-layer-architecture.md §9`.
Scope inheritance: **Task 17**.

### Goal

Replace the ICO-specific `TransactionStatusToast` with a canonical shared
state-machine component used on every on-chain transaction. Most-rendered
surface in the product.

### Acceptance criteria

- New shared component `src/components/shared/TransactionStatus.tsx` as
  a state-machine over discriminated states:
  - `idle` (no render)
  - `pre-flight` (balance / allowance / network checks)
  - `awaiting-signature` (wallet popup open)
  - `signed-pending-broadcast`
  - `broadcasting`
  - `confirming · N of M` (progress)
  - `confirmed`
  - `failed-revert` (with discriminated `errorCode` for the per-class copy
    matrix from `05-data-layer-architecture.md §9`)
  - `failed-timeout`
  - `failed-rejected` (silent return to `idle` — no UI)
- Header pill on every authenticated screen (right of page title):
  `{count} confirming · {n} of {m}`.
- Click-to-expand panel when ≥2 pending transactions. Each row is
  click-to-return navigable.
- Icon + color for each state, color-independent per WCAG 2.1 AA.
- Retire `src/pages/ico/components/shared/TransactionStatusToast.tsx`
  (or wrap it as a thin adapter).

### Open product questions

1. **Indexer vs polling.** Reference assumes an indexer can report
   per-tx confirmation count. Casper's CSPR.cloud has this; confirm
   capacity/cost.
2. **Pending persistence.** When the user reloads mid-tx, do we restore
   pending state from `localStorage`, from a BE side-channel, or from
   on-chain polling? Spec §9 likely settles this.
3. **Account-switch mid-tx.** Reference's "what's not in this document"
   list flags three sub-states: aborted-in-signature, aborted-in-pending,
   aborted-in-confirmation. Out of scope for Task 25; track separately.

### Backend endpoints required

- `GET /api/v1/tx/:hash/status` → poll fallback if indexer unavailable.

### Demo files (when implemented)

- `src/components/shared/TransactionStatus.tsx` — new
- `src/hooks/useTransactionStatus.ts` — new
- `src/components/shared/GlobalTxIndicator.tsx` — header pill + expand panel
- Mount in `TenantLayout` and `LandlordLayout` headers

### Estimated effort

~28 h. State machine + integration across layouts + retiring the ICO
toast. Cross-cuts every on-chain flow.

---

## Task 26 — `<KYCGate/>` around Sumsub WebSDK (Design Reference §10)

### Source

`docs/client-doc/leasefi-design-reference.html` §10 "KYCGate &
attestation-pending state". Scope inheritance: **Task 17** +
Dev_Team_Brief item 4 (Sumsub accepted as MVP KYC provider, integration
shape provider-agnostic, per ADR-002) + ADR-004 §Phase 0 (`Onboarding
with Sumsub KYC at user onboarding`) + Anthony's 2026-05-20 call ("no
AML/CDD/biometric handling **on top of Sumsub**").

### Goal

A wrapper that gates fee-bearing actions (sign lease, pay rent, fund
deposit) on Sumsub-verified KYC status. Sumsub is the **sole** KYC
service — no separate AML lookup, OFAC API, or biometric layer on top.
Sumsub handles identity, document checks, and liveness internally; we
only consume the `applicant_id + status + timestamp` triple via webhook.

### Acceptance criteria

- New shared component `src/components/shared/KYCGate.tsx` with two
  states matching design reference §10:
  - `kyc-required` (blocking) — renders "Verify your identity" panel
    with `Start verification` CTA that opens the Sumsub WebSDK widget;
    documents stream browser → Sumsub directly.
  - `pending-attestation` (~30 s transient) — renders "Recording your
    verification" with a progress indicator while the BE persists the
    Sumsub webhook callback and (in later phases) writes the on-chain
    attestation.
- New hook `src/hooks/useKYCStatus.ts` returning
  `{ status, tier, pending, openWidget }`. Provider-abstracted shape
  (default `APIKYCSource`; future `AttestationKYCSource` swap-in
  without product-code rewrite) — consume `useKYCStatus(address)` only,
  never the source directly.
- Integration points (each calls `useKYCStatus()` and shows the gate UI
  before the destructive action):
  - `MakePayment` (Task 20)
  - `LeaseWizard Step 6` (Task 23)
  - `Deposit funding` (Task 23 sub-screen Tx B)
  - `DisputeFile` (Task 24, if Phase 1)
- **Out of scope on top of Sumsub** (per Anthony 2026-05-20): separate
  AML / CDD list lookup, standalone OFAC sanctions screening, third-party
  document-tampering services (Snappt etc.), additional biometric
  liveness layers. Sumsub's built-in checks are the entire KYC surface
  for MVP.
- Casper-name purchase as a separate KYC step is **Phase 2** (Anthony,
  2026-05-20).
- Tier insufficiency (e.g. Tier 1 user attempting a Tier 2 action) is
  NOT a compliance failure — show the actual reason ("Tier 2 required").
  OFAC / sanctions / jurisdiction blocks collapse to the generic
  `<ComplianceFailure/>` surface from §9 per BSA §314 (separate task,
  out of MVP).

### Open product questions

1. Re-verification cadence — design reference says 30 d before expiry
   → banner, 7 d → modal interrupt, day-of → hard block. Confirm we
   adopt those thresholds 1:1, or relax for pilot.
2. Multiple-action gating — if the user verifies once during the lease
   signing flow, does it pre-clear them for a same-session payment?
   Suggest yes — single gate per session.
3. Wallet rotation — design reference §10 calls out that each wallet
   KYCs independently as a Phase 1 limitation. Confirm we surface this
   in copy rather than hide it.

### Backend endpoints required

- BE creates Sumsub applicant on first sensitive-action attempt and
  returns the widget access token.
- BE handles the Sumsub verification webhook (status transitions:
  `init` → `pending` → `completed`/`rejected`).
- `GET /api/v1/users/me/kyc-state` — returns
  `{ status, tier, lastVerifiedAt, applicantId }`. Persisted fields on
  user: `sumsub_applicant_id`, `kyc_status`, `kyc_verified_at` — nothing
  else from Sumsub leaves their infrastructure.

### Demo files (when implemented)

- `src/components/shared/KYCGate.tsx` — new
- `src/hooks/useKYCStatus.ts` — new
- `src/lib/kyc/APIKYCSource.ts` — provider-agnostic source wrapper
- Integration adapters in Tasks 20, 23, 24.

---

## Task 27 — ICO Page Rebrand for Clarity Act Compliance

### Source

LeaseFi recurring meeting **2026-05-20**.
Driven by US Clarity Act regulatory concerns: anything that names a
"sale" or markets toward "investors" risks classification as a security,
which LeaseFi explicitly does not want.

### Goal

Strip all sale-/investor-flavoured language from MVP-reachable copy,
rename the surface from "Token Sale" to "Big Token Dashboard", and add
the missing back-navigation so the page stops being a dead-end.
Repurpose the dashboard from a buy-in surface to a rewards / balance
surface.

### Acceptance criteria

**Renames (global grep + replace, MVP-reachable copy only):**

- `Token Sale` / `Pre-sale` / `Presale` → **`Big Token Dashboard`**
- `ICO` (user-facing) → drop the term entirely; internal code paths
  under `src/pages/ico/`, `src/services/ico/`, `src/hooks/ico/` keep
  their folder names (they are internal identifiers and renaming them
  is out of scope here — see Open Q #3).

**Copy purge (MVP-reachable surfaces only — Navbar, ICO page, marketing
sections still mounted in `App.tsx`):**

- `sale` / `for sale` (in token context) — removed
- `investor` / `investors` — removed (note: §3.8 of `FRONTEND_MVP_TASKS.md`
  already lists this as "Now backlog" #11; this task absorbs it)
- `investment` / `investment vehicle` — removed
- `profit` / `profits` / `capital gains` — removed
- `trajectory` (in price-forecast sense) — removed
- Allowed replacements: `commodity`, `utility token`, `reward token`,
  `staking`, `transaction fees`, `rewards`, `private offering` (only on
  the accredited-investor legal page, if it ships)

**Navigation:**

- Add a **`← Back to application`** link/button on the Big Token
  Dashboard header (top-left, before the LeaseFi logo or right after
  it). Target depends on auth + role:
  - Logged-in tenant → `/tenant/dashboard`
  - Logged-in landlord → `/landlord/dashboard`
  - Guest → `/` (landing)
- Verify there is also a path from the main app **to** the dashboard
  (e.g. notification "You earned 50 BIG tokens — view dashboard").

**Repurpose:**

- Replace any "Buy now" / "Join the sale" CTAs with **balance widgets**:
  - "Your BIG tokens" — wallet-connected balance display
  - "Earned this month" — recent staking / transaction reward summary
  - "How rewards work" — link to a 1-page explainer
- Keep `ConnectWallet` action — but reframe copy from "Connect to buy"
  → "Connect to view your tokens".
- Remove `<TokenSaleProgress/>` or equivalent fundraising widgets from
  the MVP path; either delete or hide behind a feature flag for
  internal-only viewing.

**File-level checklist (initial — refine during implementation):**

- `src/pages/ico/ICOPage.tsx` — header rebrand, back-link, balance
  widgets
- `src/pages/ico/components/*` — remove sale-CTAs, repurpose sections
- `src/components/landing/TestimonialsSection.tsx` — purge `investor`
  testimonial copy (called out in `FRONTEND_MVP_TASKS.md` §3.8)
- `src/components/landing/FractionalOwnership.tsx` — unlink from MVP
  nav (out-of-MVP per `FRONTEND_MVP_TASKS.md` §3.8); confirm before
  deleting
- Navbar / footer links — drop `Token Sale` / `ICO` labels, repoint to
  `Big Token Dashboard`
- Any route alias like `/ico` / `/token-sale` — keep the URL but
  update page title + breadcrumbs

### Open product questions

1. **USDT → USDC.** Anthony confirmed on the call that USDC is the move
   (USDT pushed out of US compliance scope). If MVP-reachable copy
   anywhere mentions USDT, swap to USDC. Quick grep needed; usually 0
   hits but worth verifying.
2. **Accredited-investor / "private offering" page.** Anthony hinted
   a separate compliant path may exist for private offerings. Out of
   MVP scope per his own 2026-05-20 framing ("ICO's gone"), but
   confirm before we delete `FractionalOwnership.tsx`.
3. **Internal code-path renames (`src/pages/ico/`, `src/services/ico/`,
   `src/hooks/ico/`).** Folder names are not user-visible. Leaving them
   keeps the diff small and preserves git blame. Confirm we agree to
   skip; otherwise this is a separate ~6 h refactor with import-path
   updates across 30+ files.
4. **Reward feed source.** "Earned this month" widget needs a data
   source — does BE have a `/api/v1/users/me/rewards` endpoint, or do
   we infer from on-chain `LeaseFi` events? BE-blocked either way.
5. **Notification → dashboard hand-off.** Anthony described an in-app
   notification "You earned X BIG tokens — view dashboard". This depends
   on the notification system (Task 8 has the broader plan; align
   wording here).
6. **Cross-link.** Three other items from the same 2026-05-20 call live
   outside the ICO scope and are tracked separately: Apply-now duplicate
   on Property Detail → **Task 28**; MVP role narrowing
   (buyer / seller / agent / broker out of UI) → **Task 29**; the
   `/tenant/application` route gap is already fixed on
   `feat/landlord-dashboard`.

### Backend endpoints required

- `GET /api/v1/users/me/rewards` (or equivalent) — BIG-token balance +
  recent reward events. BE-blocked; spec §3.7 placeholder.
- No other BE work for the rename itself — it is pure FE copy + nav.

### Demo files (when implemented)

- `src/pages/ico/ICOPage.tsx` — main rebrand surface (existing)
- `src/pages/ico/components/BigTokenDashboard/*` — new section components
  (balance, recent rewards, explainer)
- `src/pages/ico/components/legacy/*` — move sale-related components
  here behind a feature flag (or delete after Anthony's sign-off)
- `src/components/landing/TestimonialsSection.tsx` — copy purge
- Navbar / footer / breadcrumb config files — link updates

### Estimated effort

~18 h total, broken down:

- Global rename + copy purge (grep-driven): ~5 h
- Back-navigation + role-aware target: ~1 h
- Repurpose ICOPage into rewards dashboard layout (balance widget +
  recent rewards + explainer): ~8 h
- Cleanup `FractionalOwnership.tsx` / sale-CTA components: ~2 h
- Manual QA pass on every MVP-reachable surface for residual
  "investor"/"sale" mentions: ~2 h

---

## Task 28 — Apply Now Duplicate on Tenant Property Detail

### Source

LeaseFi recurring meeting **2026-05-20** — Anthony flagged that the
tenant Property Detail page renders **two** `Apply Now` CTAs side by
side, which is confusing and breaks the "one primary CTA per surface"
rule established for the design-reference alignment (Task 18).

### Goal

Land on a single canonical `Apply Now` CTA on the tenant Property
Detail page so the primary action is unambiguous. Keep the secondary
context (cost breakdown) but stop double-rendering the button.

### Current state

`src/pages/tenant/PropertyDetail.tsx` mounts `Apply Now` twice for
authenticated tenants:

- **Line 500–507** — inside the action stack alongside
  `Contact Landlord` + `Schedule Viewing` (main CTA column).
- **Line 549–551** — inside the `Move-in Costs` sticky sidebar card
  (gated behind `isAuthenticated`).

Both call the same `handleApply` handler, so the duplication is
purely visual.

### Acceptance criteria

- Exactly **one** `Apply Now` button is reachable on the tenant
  Property Detail page at any time.
- Canonical placement: **the `Move-in Costs` sticky sidebar card** —
  the CTA stays directly adjacent to the cost it commits to (matches
  the §3 Pay-rent pattern: action button labelled with the financial
  consequence).
- The main action column keeps `Contact Landlord` and
  `Schedule Viewing` (secondary actions); `Apply Now` is removed from
  that column.
- Guest (unauthenticated) state continues to show the sign-in prompt
  in place of `Move-in Costs` — no `Apply Now` is rendered for guests
  on either surface (this already holds today; do not regress).
- Mobile: the sticky sidebar collapses below the main column, so the
  single `Apply Now` still lands above-the-fold on a typical
  rent-search session. Sanity-check on a 375 × 667 viewport.

### Open product questions

1. **Cost-card placement on small screens.** On mobile, the `Move-in
   Costs` card currently stacks below the action column. With the
   button removed from the action column, mobile tenants must scroll
   to apply. Acceptable, or do we hoist the cost card above the
   action column on mobile only?
2. **Cross-surface consistency.** `src/components/tenant/PropertyCard.tsx`
   (line 127) and `src/pages/enhanced/EnhancedTenantOffers.tsx`
   (line 312) also render `Apply Now`. Those are **list / card**
   contexts, so the duplication rule does not apply — confirm we
   leave them alone.

### Backend endpoints required

None — pure FE removal.

### Demo files (when implemented)

- `src/pages/tenant/PropertyDetail.tsx` — drop the line-500 button
  block; keep the line-549 sidebar button as the canonical CTA.

### Estimated effort

~1 h. One-file edit + mobile-viewport sanity check.

---

## Task 29 — MVP Role Narrowing: Purge Buyer / Seller / Agent / Broker UI

### Source

LeaseFi recurring meeting **2026-05-20**. Anthony reiterated that
MVP scope is **tenant and landlord/PM only**. The repo still carries
substantial pre-LeaseFi-pivot scaffolding for residential-sale roles
(buyer, seller, real-estate agent, mortgage broker, attorneys,
inspectors, escrow, title, CPA, insurance). None of it is in the
Critical 6; none of it should be reachable from MVP nav.

### Goal

Hide every non-tenant / non-landlord surface from MVP routing and
navigation. **Do not delete the files** — they were inherited from
earlier work and may be revisited post-MVP. Unmounting is enough to
satisfy the scope decision without losing the codebase history.

### Current state (initial inventory — refine during implementation)

Folders under `src/pages/dashboard/` that are out-of-MVP roles:

- `agent/` · `broker/` · `buyer/` · `seller/`
- `insurance/` · `tax/` · `maintenance/` (the latter overlaps with
  landlord PM scope — confirm)

Top-level page files out-of-MVP:

- `src/pages/AgentMarketplace.tsx`
- `src/pages/BuyerAttorneyDashboard.tsx`
- `src/pages/SellerAttorneyDashboard.tsx`
- `src/pages/ListingAttorneyDashboard.tsx`
- `src/pages/MortgageBrokerDashboard.tsx`
- `src/pages/InsuranceAgentDashboard.tsx`
- `src/pages/EscrowOfficerDashboard.tsx`
- `src/pages/TitleOfficerDashboard.tsx`
- `src/pages/CPADashboard.tsx`
- `src/pages/HomeInspectorDashboard.tsx`
- `src/pages/PestInspectorDashboard.tsx`
- `src/pages/SavedAgents.tsx`
- `src/pages/ClientDashboard.tsx` (verify scope)
- `src/pages/MaintenanceMarketplace.tsx` (verify — may overlap with
  landlord PM tools)
- `src/pages/AIAgents.tsx` (verify — name overlaps with "real-estate
  agent" but content may differ)

Type files that may carry vestigial role enums:

- `src/types/agent.ts` · `src/types/seller.ts` — audit for fields
  that leak into shared types (`Property`, `Lease`).

### Acceptance criteria

- Out-of-MVP routes are **unregistered** from `src/App.tsx` (or
  whatever router config the project uses). Direct URL access returns
  the 404 page.
- Navbar / sidebar / footer / dashboard switchers contain **zero**
  links to out-of-MVP surfaces.
- Role-switch UI (`RoleSwitchDialog`, role selectors on signup,
  profile, etc.) offers only **tenant** and **landlord** options.
- Shared types stay clean: any `UserRole` union or equivalent is
  narrowed to `'tenant' | 'landlord' | 'pm'` (or whatever the MVP
  canon is) **in the user-facing schema**. Internal/legacy enums
  may retain other values if removing them breaks compilation of
  unmounted pages — see Open Q #2.
- Out-of-MVP page files **remain on disk**, untouched. They are
  reachable only via direct file open in the IDE, not at runtime.
- Add a one-line banner comment at the top of each unmounted page
  file: `// UNMOUNTED — pre-LeaseFi-pivot surface, see Task 29` so
  future contributors know why the file is dark code.

### Open product questions

1. **PM vs landlord.** The 2026-05-20 framing was "tenant + landlord/PM".
   Confirm whether PM is a separate role with its own dashboard, or a
   variant of landlord (per Task 19's "auto-detect on ≥2 leases as
   landlord"). If separate, do **not** purge PM-specific folders.
2. **Compilation strategy.** If unmounted pages import a shared
   `UserRole` union and the union is narrowed, those files fail to
   compile. Two options:
   - Keep the union wide for now; add a runtime guard on every
     role-switching surface (smaller diff, drifts further from
     "MVP canon").
   - Narrow the union and exclude unmounted pages from `tsconfig.json`
     compilation (`exclude: ['src/pages/dashboard/buyer/**', …]`).
     Cleaner long term; more upfront work.
   Recommend option B if the unmounted set is large enough; confirm
   with Anastasia before committing.
3. **`AIAgents.tsx`.** Filename suggests AI assistants, not real-estate
   agents. Read content before unmounting — may be MVP-relevant.
4. **`MaintenanceMarketplace.tsx` / `dashboard/maintenance/`.**
   Maintenance overlaps with landlord PM workflows. Confirm scope
   before unmounting; it may belong in MVP under landlord.
5. **Test files referencing unmounted pages.** Any tests under
   `tests/pages/` that import unmounted pages should be skipped (not
   deleted) with a `describe.skip(...)` and a `// UNMOUNTED — Task 29`
   note, so re-mounting later is mechanical.
6. **Search / link audit.** After unmounting, grep the codebase for
   string references (`navigate('/buyer/...')`, hard-coded URLs in
   copy, etc.) and prune. Easy to miss if relying only on router
   removal.

### Backend endpoints required

None — pure FE unmount + nav cleanup.

### Demo files (when implemented)

- `src/App.tsx` — drop out-of-MVP route registrations
- `src/components/layout/Navbar.tsx` (or equivalent) — purge links
- `src/components/auth/RoleSwitchDialog.tsx` — narrow to tenant/landlord
- `src/types/user.ts` (or equivalent) — narrow `UserRole` union per
  Open Q #2
- Unmounted page files: keep, add the one-line banner comment

### Estimated effort

~8 h, broken down:

- Inventory pass + Anastasia/Anthony confirmation on edge cases
  (Open Q #1, #3, #4): ~1.5 h
- Route + nav unmount: ~2 h
- Role-switcher narrowing + `UserRole` union strategy (Open Q #2):
  ~2 h
- Link-string audit + banner-comment pass: ~1.5 h
- Manual smoke test on tenant + landlord journeys: ~1 h

---

## Task 30 — Auth/Wallet Decoupling: Backend Identity + Sign-Time Wallet

### Source

LeaseFi recurring meeting **2026-05-28**. Triggered by a real lockout:
a forgotten CSPR.click embedded-wallet password cost access to the whole
account, because today the **wallet public key *is* the backend
identity** (`nonce → signMessage → login`, see
`src/services/ico/backendAuthService.ts`).

### Decisions (from the meeting)

1. **Identity** lives in a backend-owned auth layer with its own login
   (social / email), **independent of any wallet**. The profile survives
   the loss of any wallet.
2. **Wallet** is a separate, **on-demand signing concern** — requested
   only when an on-chain action actually needs a signature, then bound
   to the profile.
3. At a signing step the user can either **connect an existing wallet**
   or **have one created for them**.
4. A profile can hold **multiple wallets** and the user can swap which
   one signs; swapping must not affect the profile or past on-chain
   records.
5. This **amends Task 17** (invisible-wallet UX): the wallet is no longer
   an invisible login mechanism — it becomes an explicit, optional,
   sign-time attachment. Backend login is rewritten accordingly (email /
   social login routes added; wallet moved out of the registration step
   into a separate layer).

### Goal

Keep **CSPR.click as a wallet-only signing layer** (drop it as the
identity layer) so that, at signing time, a user can connect an existing
wallet or create one, and that wallet attaches to their
already-authenticated profile.

### Proposed implementation (CSPR.click, hybrid — minimal new work)

CSPR.click already covers both scenarios in one SDK; the providers are
already wired on the ICO surface (`src/pages/ico/ICOLayout.tsx`). Reuse
them behind a sign-time "Add wallet" step.

**Scenario 1 — user already has a wallet (connect existing)**

| Option | Provider key | Recovery owner |
|--------|--------------|----------------|
| Casper Wallet (extension) | `casper-wallet` | user (seed phrase) |
| Ledger | `ledger` | user (hardware seed) |
| MetaMask Casper Snap | `metamask-snap` | user (MM seed) |
| WalletConnect (mobile) | `walletConnect` init opt | wallet-side |

All connect via the same `clickRef.connect(providerKey, options)` path
already implemented in `src/hooks/auth/useWalletConnect.ts`. Recovery is
**not our problem** for these — the wallet is user-owned.

**Scenario 2 — no wallet yet (create for them)**

- `clickRef.connect('csprclick-w3a-google' | 'csprclick-w3a-apple')`
  provisions an embedded Casper wallet via CSPR.click (Web3Auth).
- ⚠️ The embedded-wallet *funds* still carry the recovery caveat — the
  Web3Auth factor mode is configured server-side per appId by CSPR.click
  and is **not** exposed in `CsprClickInitOptions` (verified: only
  `appName, appId, contentMode, casperNode?, chainName?, providers[],
  walletConnect?`). But the **profile** is now safe regardless, since
  identity is backend-owned.

**Binding (proof-of-ownership)**

Reuse the existing nonce flow, repurposed from *login* to *attach*:
backend issues a nonce → `clickRef.signMessage(message, publicKey)` →
backend verifies the signature → inserts the address into the profile's
`user ↔ wallet[]` set. Same primitive already in
`backendAuthService.getNonce` / `loginWithSignature`.

### Acceptance criteria

- Authenticating to LeaseFi **never requires a wallet**. A freshly
  registered user with zero wallets can browse, apply, and manage their
  profile end-to-end.
- An "Add wallet" step appears only at the first action that needs an
  on-chain signature (signing a lease, funding a deposit, paying rent),
  matching the §3 / §4 pre-signature pattern (Tasks 20–21).
- The step offers both **"I have a wallet"** (Casper Wallet / Ledger /
  Snap / WalletConnect) and **"Create a wallet"** (Google / Apple
  embedded) paths.
- A connected wallet is bound to the profile via signed-nonce
  proof-of-ownership before any signing proceeds.
- A profile can hold **multiple** wallets; the user can mark one
  **active for signing** and swap it (`switchAccount` / `forgetAccount`
  + the backend `user ↔ wallet[]` table). Swapping does **not** affect
  the profile or past on-chain records.
- Losing a wallet never locks the profile. The user reconnects/creates a
  new wallet and the binding updates. (Funds in a lost embedded wallet
  may still be unrecoverable — surfaced via `SecurityRecoveryCard`.)
- Copy stays provider-agnostic where the provider is irrelevant; name a
  specific wallet only on the explicit choose-a-wallet step.
- All wallet-as-login code paths are removed from the auth pages
  (`src/components/auth/AuthWalletLayout.tsx`, the W3A-only
  `SOCIAL_PROVIDERS` login flow) once the backend identity layer ships.

### Future expansion (not committed — options only)

Noted in case the embedded-wallet recovery gap or scale forces a change;
none planned: own Web3Auth appId in single-factor mode, direct wallet
integrations (Casper Wallet / Ledger / Snap / WalletConnect) without
CSPR.click, account abstraction / sponsored gas, custodial signer.

### Open product questions

1. **CSPR.click factor mode (still open from research).** For our appId,
   is the embedded social wallet non-MFA (Google alone recovers) or MFA
   (recovery share required on a new device)? Can it be switched per
   appId? Not exposed in the SDK — must ask the CSPR.click team. Answer
   decides whether Future-expansion #1 is needed.
2. **Identity provider for the backend auth layer.** Own email/password,
   a social-OAuth library, or extract identity from the Web3Auth `token`
   JWT CSPR.click returns? Backend call.
3. **Active-wallet semantics.** One active signer at a time, or
   per-action choice? A landlord payout wallet may need to be pinned per
   property, not per session.
4. **Migration.** Existing wallet-keyed accounts (created under the old
   model) must map onto new backend identities without orphaning leases
   / escrow tied to their current wallet.

### Backend endpoints required

- New identity/auth surface (own login) — BE-owned, **rewrite of the
  current wallet-signature login**.
- `POST /api/v1/wallets/nonce` → challenge for attaching a wallet.
- `POST /api/v1/wallets` → verify signed nonce, attach address to profile.
- `GET /api/v1/wallets` → list the profile's bound wallets.
- `PATCH /api/v1/wallets/:address` → set active / relabel.
- `DELETE /api/v1/wallets/:address` → detach.

### Demo files (when implemented)

- `src/components/wallet/AddWalletStep.tsx` — sign-time "connect or
  create" chooser (reuses ICO provider list)
- `src/components/wallet/WalletManager.tsx` — profile-level list / swap /
  detach
- `src/hooks/auth/useWalletConnect.ts` — repurpose from login to
  attach-and-prove (existing)
- `src/services/walletService.ts` — nonce / attach / list / active
  (new; mirrors `backendAuthService` primitives)
- `src/components/auth/AuthWalletLayout.tsx` — retire wallet-as-login
  once backend identity ships
- `src/components/auth/SecurityRecoveryCard.tsx` — keep; re-scope copy to
  "this wallet's funds" rather than "your whole account"

### Estimated effort

FE: ~40 h. Gated on the backend identity/auth rewrite (separate track) —
the FE attach/swap flow cannot be wired to real auth until that lands.

---

## Notes

- Tasks 4 and 5 share the same demo module (`src/data/leaseExtensions.ts`)
  with their own verbatim client quotes and open questions documented at the
  file top. Tasks 6 and 7, when implemented, should follow the same pattern:
  inline `// DEMO-ONLY` block at the top of the data module + quote + Q&A list.
- All tasks reuse mock data conventions established in Tasks 2–5
  (`src/data/featuredProperties.ts`, `src/data/tenantLeases.ts`, etc.) until
  the corresponding backend endpoints are available.
- Tasks 8–13 originated from the **2026-05-07 client meeting**. Verbatim
  quotes are preserved per task. Tasks 14–16 are explicitly post-MVP and
  are kept here for traceability rather than scheduling.
- Tasks 9 and 11 are tightly coupled — Task 9 (search filters) depends on
  Task 11 (landlord data entry) for real data. Build them in the same
  iteration, or stub Task 9 against mock data until Task 11 ships.
- Tasks 14 and 15 must ship together — see the rationale in each section.
