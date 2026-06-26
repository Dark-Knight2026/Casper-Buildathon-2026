---
author: Anastasia
version: 0.1.0
created: 2026-06-18T00:00:00Z
last-modified: 2026-06-18T00:00:00Z
version-updated: 2026-06-18T00:00:00Z
---

# Landlord Dashboard — partial backend integration

> Scope: replace the **parts of the landlord dashboard that real backend endpoints
> already cover**, and clearly gate the rest. `LandlordDashboard.tsx` currently runs
> entirely on `MOCK_LANDLORD_DASHBOARD_STATS` / `MOCK_LANDLORD_PORTFOLIO` /
> `MOCK_LANDLORD_RECENT_ACTIVITIES` (`src/data/landlordMockData.ts`,
> `TODO(BE): GET /api/v1/landlord/dashboard`).

## What's actually available vs blocked (2026-06-18)

| Dashboard data                                                      | Endpoint                                      | Status                                                                                                                            |
| ------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Portfolio list + property count                                     | `GET /listings/landlord`                      | 🟢 **real**                                                                                                                       |
| Per-listing KPIs (views, active leases, monthly revenue, occupancy) | `GET /listings/{id}/statistics`               | 🟢 real (DB-derived; `totalApplications` hardcoded 0)                                                                             |
| Financial KPIs (revenue / expenses / NOI / ROI / occupancy)         | `POST /api/v1/analytics/property-performance` | 🩹 **endpoint exists but backend handler is a MOCK** — returns constant `240000 / 80000 / 160000 / 16 / 95.5` regardless of input |
| Overdue payments, rent received                                     | payments domain                               | ⛔ no backend, **no reference** → see `docs/api/payments_api.md`                                                                  |
| Expiring / active leases (beyond listing-stats)                     | `/api/v1/leases`                              | ⛔ spec-only (`agreements_api.md`), not implemented                                                                               |
| Pending maintenance                                                 | maintenance domain                            | ⛔ no backend, no reference                                                                                                       |
| Recent-activity feed                                                | aggregate of the above + indexer              | ⛔ blocked                                                                                                                        |

**No `GET /api/v1/landlord/dashboard` exists** (not in any reference). So compose the
dashboard from the pieces above rather than one aggregate call. `src/services/analyticsService.ts`
is the **dead Supabase** analytics surface — do not extend it; add a backend-wired one.

Status tags: 🟢 REAL · 🩹 stubbed-backend (FE buildable, value is fake) · ⛔ BE-BLOCKED.

| ✓   | #    | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Tag | Files                                                                |
| --- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------------------- |
| [ ] | LD-1 | **Backend-wired analytics service + types.** New `getPropertyPerformance({ startDate, endDate, propertyIds })` → `POST /api/v1/analytics/property-performance` via `backendClient`. Type `PropertyPerformanceReport { totalRevenue, totalExpenses, netOperatingIncome, roiPercentage, occupancyRate }` — backend serialises the `Decimal`s as **strings**, so parse to `number` at the boundary. **🩹 the backend handler is a hardcoded mock** — flag values as illustrative. Do NOT reuse the dead Supabase `analyticsService.ts` (new file or backend-only section) | 🩹  | `services/analyticsService.ts` (new/rewire), `types/`                |
| [ ] | LD-2 | **Portfolio + property count from real data.** Replace `MOCK_LANDLORD_PORTFOLIO` + `totalProperties` with `getLandlordListings` (`useQuery`): map each listing → portfolio row (title/address, rent from `terms`, `state` badge, `views`). `totalProperties` = `itemCount`. The `tenant` + payment-status columns have **no source yet** → render `—` / "n/a" until leases/payments ship (don't fake)                                                                                                                                                                  | 🟢  | `pages/landlord/LandlordDashboard.tsx`, `data/landlordMockData.ts`   |
| [ ] | LD-3 | **Financial KPI card from analytics.** Drive the revenue / expenses / NOI / ROI / occupancy card from `getPropertyPerformance` — `propertyIds` = the portfolio's `propertyId`s (from LD-2), default range trailing 12 months. **🩹 label "illustrative — analytics is stubbed"** so the constant values aren't read as real                                                                                                                                                                                                                                            | 🩹  | `pages/landlord/LandlordDashboard.tsx`                               |
| [ ] | LD-4 | **Gate the lease/payment/maintenance UI.** The alerts (`overduePayments` / `expiringLeases` / `pendingMaintenance`) and the recent-activity feed depend on payments / leases / maintenance — none have a backend. Keep them as **clearly-labelled demo data** ("Demo — lands with payments & leases") or hide behind a flag. **Do not present mock as real.** Un-gate per-domain as `payments_api` / `/leases` / maintenance ship                                                                                                                                      | ⛔  | `pages/landlord/LandlordDashboard.tsx`                               |
| [ ] | LD-5 | **(optional, lower priority) Real aggregated KPIs instead of the stubbed analytics.** `activeLeases` / `monthlyRevenue` / `occupancyRate` can be summed from `getListingStatistics` across the portfolio (DB-derived, real) instead of the mocked `property-performance`. Trade-off: **N calls** (one per listing). Prefer once a `GET /listings/landlord/statistics` aggregate or a real `analytics` impl exists                                                                                                                                                      | 🟢  | `pages/landlord/LandlordDashboard.tsx`, `services/listingService.ts` |

## Suggested order

1. **LD-1** (service/types) — unblocks LD-3.
2. **LD-2** (portfolio) — the biggest real win, cheap (one query).
3. **LD-3** (financial card) — wire it, but 🩹 until the backend analytics is real.
4. **LD-4** (gate the rest) — honest UX; don't ship mock-as-real.
5. **LD-5** — only if real per-listing aggregation is worth the N calls.

## Backend follow-ups (not FE)

- Implement `analytics/property-performance` for real (it's a constant mock today).
- Add a `payments` domain + endpoints → `docs/api/payments_api.md`.
- Optionally a single `GET /api/v1/landlord/dashboard` (or `/listings/landlord/statistics`) aggregate so the FE doesn't fan out N calls.
