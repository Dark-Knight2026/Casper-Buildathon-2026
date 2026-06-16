/**
 * Property Comparison Page
 * Full page for comparing multiple listings side by side.
 */

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PropertyComparison } from '@/components/property/PropertyComparison';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getListing } from '@/services/listingService';
import { listingRentMonthly } from '@/lib/listingDisplay';
import type { Listing, RentLtrTerms } from '@/types/listingContract';
import type { PropertyComparison as PropertyComparisonType } from '@/types/property';

/** Flatten a listing (with its nested property) into a comparison row. */
function listingToComparison(listing: Listing): PropertyComparisonType {
  const asset = listing.property;
  const terms =
    listing.intent === 'rent_ltr' ? (listing.terms as RentLtrTerms) : null;
  const parking = asset?.parkingFeatures ?? [];
  return {
    id: listing.id,
    address: asset
      ? `${asset.addressLine1}, ${asset.city}, ${asset.stateOrProvince} ${asset.postalCode}`
      : listing.title,
    rent: listingRentMonthly(listing),
    bedrooms: asset?.bedroomsTotal ?? 0,
    bathrooms: asset?.bathroomsTotal ?? 0,
    sqft: asset?.livingArea ?? 0,
    available: listing.state === 'active',
    amenities: listing.amenities,
    // No boolean pets flag on the wire — derive it from the constrained policy.
    petFriendly:
      !!listing.petPolicy && listing.petPolicy.toLowerCase() !== 'no pets',
    parking: parking.length > 0 ? parking.join(', ') : 'Not available',
    utilities:
      listing.utilitiesIncluded.length > 0
        ? listing.utilitiesIncluded.join(', ')
        : 'Tenant pays all utilities',
    leaseTerms: terms?.leaseTermsOffered ?? [],
  };
}

export default function PropertyComparisonPage() {
  const [searchParams] = useSearchParams();
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const ids = useMemo(
    () => searchParams.get('properties')?.split(',').filter(Boolean) ?? [],
    [searchParams]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['comparison-listings', ids],
    queryFn: async () => {
      // Fetch independently so one bad id doesn't blank the whole comparison.
      const results = await Promise.allSettled(ids.map((id) => getListing(id)));
      return results
        .filter(
          (r): r is PromiseFulfilledResult<Listing> => r.status === 'fulfilled'
        )
        .map((r) => r.value);
    },
    enabled: ids.length > 0,
  });

  const comparisons = (data ?? [])
    .filter((listing) => !removedIds.includes(listing.id))
    .map(listingToComparison);

  const handleRemoveProperty = (listingId: string) => {
    setRemovedIds((prev) => [...prev, listingId]);
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-center text-muted-foreground py-12">
          Something went wrong loading these listings. Please try again.
        </p>
      ) : comparisons.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No listings to compare. Add listings from search to compare them here.
        </p>
      ) : (
        <PropertyComparison
          properties={comparisons}
          onRemove={handleRemoveProperty}
        />
      )}
    </div>
  );
}
