# Landlord Dashboard — Implementation Plan

**Objective:** Give the landlord flow a shared navigation header (like the tenant
flow) and decouple every landlord-flow page from Supabase, substituting mock
data for display/testing until the Rust backend integration lands.

**Scope:** Landlord flow only — the pages reachable from the landlord header.
Aligned to LeaseFi MVP spec §3 (esp. §3.2, §3.6, §3.7).

**Constraints / project rules:**
- "Done" = wired to the real Rust backend. Real `/api/v1/landlord/*` is
  **BE-BLOCKED** — this plan delivers the layout + mock-data scaffold only.
- Mock data shipped in landlord pages is intentional demo/preview content
  (same accepted pattern as the tenant pages), not a deferred bug.
- No effort estimates in this doc.

**Related:** [LEASEFI_MVP_SPEC_2026-07-15.md](./LEASEFI_MVP_SPEC_2026-07-15.md) ·
[FRONTEND_MVP_TASKS.md](./FRONTEND_MVP_TASKS.md)

> Note: `docs/landlord-dashboard-system-design.md` is legacy template material
> (Next.js / Supabase-realtime / Tax Center) and is **not** the source of truth
> for this work. It is intentionally not extended here.

---

## Locked decisions

| # | Decision |
|---|----------|
| 1 | A **dedicated `/landlord/profile`** page (not a redirect to `/tenant/profile`); landlord-specific sections will be added on top of the shared profile basics. |
| 2 | Add a **stub `/landlord/messages`** route now → reuse the shared `CommunicationCenter` (same as tenant). |
| 3 | **Vendors** and **Financial Dashboard** routes move **under `LandlordLayout`** so they share the header/nav. |
| 4 | de-Supabase scope is **expanded to every landlord-flow page**, replaced with mock data for display/testing. |

---

## Part A — `LandlordLayout` (new)

**File:** `src/components/layout/LandlordLayout.tsx` — mirror the structure of
`src/components/layout/TenantLayout.tsx`: fixed top header, desktop nav, mobile
overlay menu, `<main className="pt-16"><Outlet/></main>`, full sign-out
(`disconnect()` + `walletSignOut()` + `window.location.assign('/')`),
`ProfileNudgeDialog`.

Landlord-specific differences:

- **`NAV_LINKS`** (only routes that exist after Part B):
  - Dashboard `/landlord/dashboard`
  - Properties `/landlord/properties`
  - Applications `/landlord/applications`
  - Tenants `/landlord/tenants`
  - Leases `/landlord/leases`
  - Payments `/landlord/payments`
  - Maintenance `/landlord/maintenance`
  - Renewals `/landlord/renewals`
  - Messages `/landlord/messages` (added in Part B)
- Header right-side actions: `[Add Property]` → `/landlord/properties/create`,
  `[Create Lease]` → `/landlord/leases/new` (carry over the dashboard's primary
  actions to every landlord page).
- `HeaderAvatar` links to **`/landlord/profile`** (decision #1).
- Reuse the `'Wallet'/'User'` placeholder-initials guard from `TenantLayout`.

## Part B — Routing (`src/App.tsx`)

Restructure the `/landlord` block to a parent layout route, exactly mirroring
the tenant pattern ("single `ProtectedRoute` on the parent"):

```tsx
<Route
  path="/landlord"
  element={
    <ProtectedRoute allowedRoles={['landlord']}>
      <LandlordLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<Navigate to="/landlord/dashboard" replace />} />
  <Route path="dashboard"        element={<LandlordDashboard />} />
  <Route path="properties"       element={<PropertyList />} />
  <Route path="properties/create" element={<PropertyCreate />} />
  <Route path="properties/:id"   element={<PropertyDetail />} />
  <Route path="properties/:id/edit" element={<PropertyEdit />} />
  <Route path="applications"     element={<ApplicationList />} />
  <Route path="applications/:id" element={<ApplicationDetail />} />
  <Route path="tenants"          element={<LandlordTenants />} />
  <Route path="leases"           element={<LandlordLeases />} />
  {/* …all existing landlord child routes, paths unchanged… */}
  <Route path="renewals"         element={<LandlordRenewals />} />
  <Route path="vendors"          element={<VendorManagement />} />     {/* moved in — decision #3 */}
  <Route path="financial"        element={<FinancialDashboard />} />   {/* moved in — decision #3 */}
  <Route path="messages"         element={<CommunicationCenter />} />  {/* stub — decision #2 */}
  <Route path="profile"          element={<LandlordProfile />} />      {/* new — Part C */}
</Route>
```

- Drop the per-route `<ProtectedRoute allowedRoles={['landlord']}>` wrappers
  inside the block (the parent covers them). **Paths must not change.**
- Move the currently-standalone `/landlord/vendors` and the landlord Financial
  Dashboard routes into this block (decision #3).
- Lazy-import `LandlordLayout`? No — `TenantLayout` is eagerly imported;
  follow the same convention.

## Part C — `/landlord/profile` (new page)

**File:** `src/pages/landlord/LandlordProfile.tsx`

- Mirror `src/pages/tenant/TenantProfile.tsx` for the shared basics: avatar
  upload, name/phone/bio, email block (responsive, disabled "Change email"
  with `title`), `RoleSwitchDialog` trigger.
- Add landlord-specific section per **spec §3.2** ("owned properties, active
  leases, received rent") — composed from existing widgets
  (`StatCard`, `DashboardCard`) with mock data (Part D).
- Reuse `src/components/client/LandlordProfileForm.tsx` for landlord-only
  fields where it fits; flag its `clientId`/ClientLandlord data-model nuance
  for review rather than forcing it.
- No backend profile endpoint for landlords → mock + `// TODO(BE)` marker.

## Part D — de-Supabase + mock data (expanded scope)

**Strategy:** mock at the **page boundary**. Each landlord-flow page stops
calling Supabase (directly or via a Supabase-backed service) and reads from a
shared mock module. Shared services (`propertyService`, `leaseManagementService`,
`vendorService`, …) keep their Supabase code untouched — other roles
(tenant/agent/broker) still use them; we only stop the **landlord pages** from
calling them. This keeps the change isolated and reversible.

**New file:** `src/data/landlordMockData.ts` — typed `MOCK_*` fixtures
(properties, leases, payments incl. paid/partial/overdue status, tenants,
maintenance, renewals, dashboard stats, recent activity). Single source so
fixtures stay consistent across pages.

Each page: remove `supabase` import + query logic; replace the loader with the
mock module behind a `setTimeout` (~600 ms) to preserve the existing
loading/error UI; keep existing state shapes and JSX untouched; add
`// TODO(BE): replace MOCK_* with GET /api/v1/landlord/… — BE-blocked (spec §3.7)`.

**Page checklist (all confirmed direct-Supabase):**

- [x] `pages/landlord/LandlordDashboard.tsx` — done; mock via new `src/data/landlordMockData.ts` (single source for landlord fixtures)
- [ ] `pages/landlord/LandlordProperties.tsx`
- [ ] `pages/landlord/LandlordLeases.tsx`
- [ ] `pages/landlord/LandlordPayments.tsx`
- [ ] `pages/landlord/LandlordMaintenance.tsx`
- [ ] `pages/landlord/LandlordRenewals.tsx`
- [ ] `pages/landlord/LandlordTenants.tsx`
- [ ] `pages/landlord/properties/PropertyList.tsx`
- [ ] `pages/landlord/properties/PropertyCreate.tsx`
- [ ] `pages/landlord/properties/PropertyDetail.tsx`
- [ ] `pages/landlord/properties/PropertyEdit.tsx`
- [ ] `pages/landlord/applications/ApplicationList.tsx`, `ApplicationDetail.tsx` (via `applicationService` → Supabase)
- [ ] Vendors page (via `vendorService` → Supabase)
- [ ] Financial Dashboard (via `financialDataService`/`analyticsService` → Supabase)
- [ ] `pages/landlord/LandlordProfile.tsx` (new — mock from the start)

## Component reuse map (no new primitives)

| Surface | Existing component |
|---|---|
| KPI tiles | `components/widgets/StatCard.tsx` |
| Section wrappers | `components/widgets/DashboardCard.tsx` |
| Payment status (paid/partial/overdue) | `components/lease/shared/ui/StatusBadge.tsx` |
| Per-property cards | `components/property/PropertyMetricsCard.tsx` |
| Empty states | `components/ui/empty-state.tsx` |
| Rent trend (optional) | `components/financial/charts/RevenueTrendChart.tsx` |
| Termination dialog | pattern of `components/profile/RoleSwitchDialog.tsx` |

## Execution order

1. **Part D — `LandlordDashboard` first** (isolated; immediately testable;
   no routing risk) + create `src/data/landlordMockData.ts`.
2. **Part A** — `LandlordLayout.tsx`.
3. **Part B** — restructure `/landlord` routes (+ move vendors/financial,
   add messages/profile routes).
4. **Part C** — `LandlordProfile.tsx`.
5. **Part D (remaining pages)** — work the checklist.

Per step: `npm run type-check` (0 errors), `eslint` on changed files, manual
check at `https://lvh.me:5173/landlord/dashboard` (header, nav, mock data,
mobile menu, sign-out).

## Out of scope (explicit)

- Real `/api/v1/landlord/*` wiring (BE-blocked, spec §3.7).
- Ripping Supabase out of the shared **services** (used by other roles).
- New rent-per-property / termination-controls sections beyond the mock
  scaffold — a follow-up once the header + mock baseline is in place.

## Open risks / to confirm during implementation

- `LandlordProfileForm` is built around `clientId`/ClientLandlord, not the
  auth profile model — confirm fit before reuse.
- Moving vendors/financial routes: verify no other code links to their old
  standalone paths.
- Some landlord pages may share a service with a tenant/agent page; mock only
  the landlord call site, never the shared service.
