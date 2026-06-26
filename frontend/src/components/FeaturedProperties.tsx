import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { PropertyCard } from '@/components/property/PropertyCard';
import { listingToCard } from '@/components/property/listingToCard';
import { searchListings } from '@/services/listingService';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/** How many active listings to feature on the landing page. */
const FEATURED_COUNT = 6;

/**
 * Landing "Featured properties" — a few real active listings from
 * `GET /listings` (was a hardcoded `FEATURED_PROPERTIES` mock whose `prop-1`
 * ids 404'd on click/save/apply for a signed-in tenant). Maps each listing with
 * the shared `listingToCard` and navigates exactly like `PropertySearch`
 * (`/properties/{id}` with the listing in router state). Degrades to nothing on
 * error or when there are no active listings, so the landing stays clean.
 */
export function FeaturedProperties() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: () => searchListings({ pageSize: FEATURED_COUNT }),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const listings = data?.data ?? [];
  if (isError || listings.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <PropertyCard
          key={listing.id}
          property={listingToCard(listing)}
          onClick={() =>
            navigate(`/properties/${listing.id}`, { state: { listing } })
          }
        />
      ))}
    </div>
  );
}
