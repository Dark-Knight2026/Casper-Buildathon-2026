import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PropertyCard } from '@/components/property/PropertyCard';
import { listingToCard } from '@/components/property/listingToCard';
import { getFavorites } from '@/services/favoriteService';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';

export default function SavedProperties() {
  const navigate = useNavigate();

  // The save heart on each card removes the favorite and invalidates this
  // query, so a removed listing drops off the list automatically.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => getFavorites({ pageSize: 100 }),
  });
  const favorites = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading saved properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Saved Properties
              </h1>
              <p className="text-gray-600">
                {favorites.length}{' '}
                {favorites.length === 1 ? 'property' : 'properties'} saved
              </p>
            </div>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isError ? (
          <p className="text-center text-muted-foreground py-12">
            Couldn't load your saved properties. Please try again.
          </p>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No saved properties yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start browsing properties and save your favorites to view them
              here.
            </p>
            <Button onClick={() => navigate('/tenant/property-search')}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <PropertyCard
                key={favorite.listingId}
                property={listingToCard(favorite.listing)}
                onClick={() =>
                  navigate(`/properties/${favorite.listing.id}`, {
                    state: { listing: favorite.listing },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
