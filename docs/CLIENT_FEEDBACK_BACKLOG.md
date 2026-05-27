# Client Review Feedback — Backlog

This document tracks tasks derived from client product feedback. Tasks 1–7
came from the original Tenant-flow review email; tasks 8–13 were captured
during the LeaseFi recurring meeting on **2026-05-07** with Anthony Batten
and Chris. Tasks 14–16 are explicitly post-MVP (phase 2 / blocked on legal).

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

¹ Demo = UI is final, but the backend integration is mocked. Open product
questions and required endpoints are documented at the top of
`src/data/leaseExtensions.ts`.

² Pending alignment with Anthony — confirm landlord is the source of truth
for surrounding-area POIs (Chris suggested it on 2026-05-07; Anthony agreed
in principle but exact ownership not yet locked).

³ Blocked on SEC licensing and DAO-structure decisions. Anthony explicitly
deferred this to post-MVP because offering equity outside a tenant–landlord
lease option agreement turns the platform into a securities offering.

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
