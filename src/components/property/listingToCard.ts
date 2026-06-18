import type { Listing } from '@/types/listingContract';
import type { PropertyCardData } from '@/components/property/PropertyCard';
import { listingRentMonthly, approvedMedia } from '@/lib/listingDisplay';

/**
 * Map a listing (with its nested property) to the flat `PropertyCard` shape.
 * Shared by the search results and the saved-listings page.
 */
export function listingToCard(listing: Listing): PropertyCardData {
  const media = approvedMedia(listing.media);
  return {
    id: listing.id,
    listingId: listing.id,
    title: listing.title,
    address: listing.property?.addressLine1 ?? '',
    city: listing.property?.city ?? '',
    state: listing.property?.stateOrProvince ?? '',
    price: listingRentMonthly(listing),
    bedrooms: listing.property?.bedroomsTotal ?? 0,
    bathrooms: listing.property?.bathroomsTotal ?? 0,
    squareFeet: listing.property?.livingArea ?? undefined,
    images: media.map((m) => m.url),
    photoCount: media.length || undefined,
    daysOnMarket: listing.daysOnMarket,
    verifiedListerBadge: listing.provenance.verifiedListerBadge,
    onChainProvenance: listing.onChain?.provenanceOnChain ?? false,
    registeredOnChain: (listing.property?.onchainPropertyId ?? null) !== null,
  };
}
