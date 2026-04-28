// =============================================================================
// DEMO-ONLY — needs full implementation. Tracked as Tasks 4 & 5
//             (client review feedback, lease renewal lifecycle).
// =============================================================================
//
// ── TASK 4 — 6-month extension intent ────────────────────────────────────────
//
// Client request (verbatim):
//   "6 months from the lease expiration I would like the tenant to get a
//    notification for an option to extend the lease for 6 months. This will
//    notify the landlord of the tenant's intentions."
//
// What's currently mocked vs what real implementation needs:
//
//   MOCKED:
//     - In-memory `intents` Map (resets on page reload).
//     - "Landlord notified" — just shows a toast, no actual email/push.
//     - Banner trigger uses local `Date.now()` against in-memory mock leases;
//       no scheduled job evaluates real lease end dates.
//
//   TO BUILD (backend):
//     - POST /api/v1/leases/:id/extension-intent  → persist tenant intent
//     - GET  /api/v1/leases/:id/extension-intent  → read current state
//     - Daily cron at T-180 that emits an in-app + email notification to the
//       tenant ("You can request a 6-month extension"), idempotent.
//     - On submit: deliver email + push to landlord; create audit record.
//
// ── TASK 5 — T-91 deadline + parallel actions ────────────────────────────────
//
// Client request (verbatim):
//   "if the tenant doesn't exercise their option to extend the lease prior
//    to 91 days before the lease is expiration date then it triggers two
//    parallel actions (one on behalf of the tenant and one on behalf of the
//    landlord). The tenant's only options will be to renew the lease or move
//    out (this can be a notification button that the tenant clicks to confirm
//    intentions). The landlord will have the option to list the property for
//    rent or for sale on the 90th day prior to the lease expiration."
//
// What's currently mocked vs what real implementation needs:
//
//   MOCKED:
//     - Tenant decision (`renew` | `move_out`) recorded in in-memory `decisions`
//       Map; resets on page reload.
//     - Landlord listing actions are gated client-side only — no backend rule
//       prevents listing before T-90 in real data.
//     - "Lease-related actions blocked" rule from the spec (tenant can't take
//       other actions until they decide) is NOT enforced — only the banner is
//       shown; payments/maintenance/messages tabs remain interactive.
//     - No audit trail.
//
//   TO BUILD (backend):
//     - POST /api/v1/leases/:id/tenant-decision  body { decision: 'renew' | 'move_out' }
//     - GET  /api/v1/leases/:id/tenant-decision
//     - POST /api/v1/properties/:id/list-for-rent   (gated server-side on T-90)
//     - POST /api/v1/properties/:id/list-for-sale   (gated server-side on T-90)
//     - Daily cron at T-91:
//         * if no extension intent + no tenant decision: emit notification to
//           the tenant ("Decision required: Renew or Move Out"), idempotent.
//         * mark lease as `awaiting-tenant-decision`.
//     - Daily cron at T-90:
//         * if no extension intent: enable landlord listing actions on this
//           property; emit notification to the landlord.
//     - Audit log every tenant decision and every landlord listing event for
//       compliance / dispute resolution.
//
//   OPEN PRODUCT QUESTIONS (clarify with client before backend work):
//     1. **Hard-block other tenant actions while in decision window?**
//        Spec says "The tenant's only options will be to renew the lease or
//        move out". Currently we just show a banner; we don't disable payments,
//        maintenance, messaging. Confirm whether full lockout is required.
//     2. **What does "renew" mean operationally?**
//        Same renewal-offer flow as the existing leaseRenewalService (landlord
//        proposes terms → tenant negotiates), or instant 12-month rollover at
//        same terms? The latter is simpler; the former is what the rest of the
//        app already implements.
//     3. **Move-out logistics.**
//        Does clicking "Move Out" merely record intent, or does it kick off
//        a checklist (final inspection date, deposit return procedure, key
//        return)? Current demo only records the decision.
//     4. **Reversibility window.**
//        Can the tenant change their mind after submitting? E.g. they pick
//        "Move Out" then decide to renew on day 60 — is that allowed? If yes,
//        for how long?
//     5. **Landlord pricing on List for Rent/Sale.**
//        Does the landlord-side action open a form (rent price, sale price,
//        photos), or auto-clone existing property data? Demo shows toast only.
//     6. **Conflict with existing 60-day Alert and renewal flow.**
//        TenantDashboard already has a 60-day expiration Alert + the existing
//        leaseRenewalService creates RenewalOffers from the landlord side.
//        New flow needs to be reconciled — which entity is canonical when
//        both are active?
//     7. **What happens if both flows fire?** E.g. tenant submits extension
//        intent at T-150 then landlord ignores it. At T-91, does tenant still
//        get the renew/move-out prompt, or are they "covered" by the pending
//        intent? Demo currently treats a submitted intent as covering both
//        windows (banners hide).
//
//   FILES INVOLVED IN THIS DEMO:
//     - src/data/leaseExtensions.ts                       (this file)
//     - src/components/tenant/LeaseExtensionBanner.tsx    (Task 4 UI)
//     - src/components/tenant/LeaseDecisionBanner.tsx     (Task 5 tenant UI)
//     - src/components/landlord/LandlordListingActions.tsx (Task 5 landlord UI)
//     - src/pages/tenant/TenantDashboard.tsx              (mounts banners)
//     - src/pages/tenant/MyPropertyDetail.tsx             (mounts banners)
//     - src/pages/landlord/properties/PropertyDetail.tsx  (mounts listing actions)
//
// =============================================================================

export const EXTENSION_WINDOW_DAYS = 180;
// Tenant has until T-91 to submit an intent; below that the flow switches
// to the parallel renew/move-out + list-for-rent/sale path (Task 5).
export const EXTENSION_DEADLINE_DAYS = 91;
export const EXTENSION_TERM_MONTHS = 6;

export interface ExtensionIntent {
  leaseId: string;
  submittedAt: Date;
  // Mock placeholder — in real backend this would be the persisted record id
  // and a status field (`pending` | `approved` | `declined` | `expired`).
  status: 'pending';
}

const intents = new Map<string, ExtensionIntent>();

export function daysUntil(endDate: Date): number {
  return Math.ceil((endDate.getTime() - Date.now()) / 86400000);
}

export function isInExtensionWindow(endDate: Date): boolean {
  const days = daysUntil(endDate);
  return days <= EXTENSION_WINDOW_DAYS && days > EXTENSION_DEADLINE_DAYS;
}

export function getExtensionIntent(leaseId: string): ExtensionIntent | null {
  return intents.get(leaseId) ?? null;
}

export function submitExtensionIntent(leaseId: string): ExtensionIntent {
  const intent: ExtensionIntent = {
    leaseId,
    submittedAt: new Date(),
    status: 'pending',
  };
  intents.set(leaseId, intent);
  return intent;
}

// ── Task 5: T-91 deadline + parallel actions ─────────────────────────────────

// Landlord can list for rent/sale starting day 90 prior to lease expiration
// (only if the tenant did NOT submit an extension intent).
export const LANDLORD_LISTING_DAYS = 90;

export type TenantDecisionType = 'renew' | 'move_out';

export interface TenantDecision {
  leaseId: string;
  decision: TenantDecisionType;
  submittedAt: Date;
}

const decisions = new Map<string, TenantDecision>();

// Tenant is in the "decide now" window when ≤91 days remain AND no extension
// intent was submitted. (If they submitted an intent, they're already on the
// renewal track — banner stays hidden.)
export function isInDecisionWindow(endDate: Date, leaseId: string): boolean {
  if (getExtensionIntent(leaseId)) return false;
  const days = daysUntil(endDate);
  return days <= EXTENSION_DEADLINE_DAYS && days > 0;
}

export function getTenantDecision(leaseId: string): TenantDecision | null {
  return decisions.get(leaseId) ?? null;
}

export function submitTenantDecision(leaseId: string, decision: TenantDecisionType): TenantDecision {
  const record: TenantDecision = { leaseId, decision, submittedAt: new Date() };
  decisions.set(leaseId, record);
  return record;
}

// Landlord may list the property when ≤90 days remain AND no extension intent
// was submitted. Tenant decision (renew vs move-out) does NOT block listing —
// the spec lets the landlord act independently from day 90 onward.
export function canLandlordList(endDate: Date, leaseId: string): boolean {
  if (getExtensionIntent(leaseId)) return false;
  const days = daysUntil(endDate);
  return days <= LANDLORD_LISTING_DAYS && days > 0;
}
