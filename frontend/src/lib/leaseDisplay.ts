/**
 * Presentation helpers for the lease wire contract — label/colour for the
 * kebab-case `LeaseStatus`, a `LeaseType` label, and money formatting.
 *
 * Mirrors `LISTING_STATE_BADGE` in `listingDisplay.ts`. Lease currencies are
 * `cUSD`/`CSPR` (not ISO codes), so money is rendered as `amount CODE` rather
 * than via `Intl.NumberFormat`'s `currency` style.
 */

import type { LeaseStatus, LeaseType } from '@/types/leaseContract';

export const LEASE_STATUS_BADGE: Record<
  LeaseStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-gray-500' },
  'pending-signatures': {
    label: 'Pending Signatures',
    className: 'bg-yellow-500',
  },
  'under-review': { label: 'Under Review', className: 'bg-amber-500' },
  'pending-approval': { label: 'Pending Approval', className: 'bg-purple-500' },
  active: { label: 'Active', className: 'bg-green-500' },
  'expiring-soon': { label: 'Expiring Soon', className: 'bg-orange-500' },
  expired: { label: 'Expired', className: 'bg-red-500' },
  terminated: { label: 'Terminated', className: 'bg-gray-500' },
  renewed: { label: 'Renewed', className: 'bg-teal-500' },
};

export const LEASE_TYPE_LABEL: Record<LeaseType, string> = {
  'fixed-term': 'Fixed-term',
  'month-to-month': 'Month-to-month',
  sublease: 'Sublease',
  commercial: 'Commercial',
};

/** Money is an f64 here; render as `amount CODE` (cUSD/CSPR are not ISO codes). */
export function formatLeaseMoney(
  amount: number,
  currency: string | null
): string {
  const n = amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return currency ? `${n} ${currency}` : n;
}

/** Short date, e.g. `Jan 1, 2026` — used in the list cards. */
export function formatLeaseDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/** Long date, e.g. `January 1, 2026` — used in the detail view. */
export function formatLeaseDateLong(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/** Date + time, e.g. `Jan 1, 2026, 02:30 PM` — used for signature timestamps. */
export function formatLeaseDateTime(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
