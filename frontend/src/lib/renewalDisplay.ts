/**
 * Presentation helpers for the renewal wire contract — label/colour for the
 * kebab-case `RenewalStatus`. Mirrors `LEASE_STATUS_BADGE` in `leaseDisplay.ts`.
 */

import type { RenewalStatus } from '@/types/renewalContract';

export const RENEWAL_STATUS_BADGE: Record<
  RenewalStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-gray-500' },
  sent: { label: 'Sent', className: 'bg-blue-500' },
  'under-review': { label: 'Under Review', className: 'bg-amber-500' },
  accepted: { label: 'Accepted', className: 'bg-green-500' },
  rejected: { label: 'Rejected', className: 'bg-red-500' },
  countered: { label: 'Countered', className: 'bg-purple-500' },
  expired: { label: 'Expired', className: 'bg-gray-500' },
};
