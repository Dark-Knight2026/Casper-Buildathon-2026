/**
 * Small display helpers for turning a `Listing` into UI-ready values, shared by
 * the search, detail and comparison surfaces.
 */

import type {
  Listing,
  RentLtrTerms,
  MediaRef,
  RealPropertyType,
} from '@/types/listingContract';

/** Title-case a RESO property type for display ("single_family" → "Single Family"). */
export function formatPropertyType(type: RealPropertyType): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Monthly rent for display. MVP serves only `rent_ltr`, whose terms carry
 * `rentMonthly`; any other (dormant) intent reads 0 until those surfaces ship.
 */
export function listingRentMonthly(listing: Listing): number {
  return listing.intent === 'rent_ltr'
    ? (listing.terms as RentLtrTerms).rentMonthly
    : 0;
}

/**
 * Public-facing media, ordered by `position`. Public reads already exclude
 * non-approved images, but owner reads do not — so the approved filter keeps
 * pending/rejected images out of any gallery regardless of the caller.
 */
export function approvedMedia(media: MediaRef[]): MediaRef[] {
  return media
    .filter((m) => m.moderationStatus === 'approved')
    .sort((a, b) => a.position - b.position);
}
