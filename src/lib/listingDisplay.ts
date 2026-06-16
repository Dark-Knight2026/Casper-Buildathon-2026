/**
 * Small display helpers for turning a `Listing` into UI-ready values, shared by
 * the search, detail and comparison surfaces.
 */

import type {
  Listing,
  RentLtrTerms,
  MediaRef,
  RealPropertyType,
  PropertyAsset,
  ListingState,
} from '@/types/listingContract';

/**
 * Display label + badge color for each lifecycle state. Shared by the landlord
 * list and detail so the two can't drift.
 */
export const LISTING_STATE_BADGE: Record<
  ListingState,
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-gray-500' },
  active: { label: 'Active', className: 'bg-green-500' },
  pending: { label: 'Pending', className: 'bg-yellow-500' },
  leased: { label: 'Leased', className: 'bg-blue-500' },
  sold: { label: 'Sold', className: 'bg-blue-500' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-500' },
  expired: { label: 'Expired', className: 'bg-red-500' },
};

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

/**
 * Whether the listing allows pets. There's no boolean flag on the wire, so it's
 * derived from the constrained `petPolicy` ("No Pets" means not allowed).
 */
export function derivePetsAllowed(listing: Listing): boolean {
  return !!listing.petPolicy && listing.petPolicy.toLowerCase() !== 'no pets';
}

/** One-line postal address for a property, or '' when the asset is absent. */
export function formatFullAddress(
  asset: PropertyAsset | null | undefined
): string {
  return asset
    ? `${asset.addressLine1}, ${asset.city}, ${asset.stateOrProvince} ${asset.postalCode}`
    : '';
}
