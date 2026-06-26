/**
 * PropertyGrid Component
 * Grid layout for displaying multiple property cards
 */

import { PropertyCard } from './PropertyCard';
import type { PropertyFeatures, MatchScore } from '@/types/matching';

interface Property extends PropertyFeatures {
  id: string;
  title: string;
  images: string[];
  landlordName: string;
  landlordRating?: number;
  availableDate: Date;
  views?: number;
}

interface PropertyGridProps {
  properties: Property[];
  matchScores?: Map<string, MatchScore>;
  favoritedProperties?: Set<string>;
  onFavoriteToggle?: (propertyId: string) => void;
  onPropertyView?: (propertyId: string) => void;
  onPropertyShare?: (propertyId: string) => void;
  showMatchScores?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function PropertyGrid({
  properties,
  matchScores,
  favoritedProperties = new Set(),
  onFavoriteToggle,
  onPropertyView,
  onPropertyShare,
  showMatchScores = false,
  isLoading = false,
  emptyMessage = 'No properties found matching your criteria.'
}: PropertyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 h-64 rounded-t-lg" />
            <div className="bg-white p-4 rounded-b-lg space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Properties Found
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          matchScore={matchScores?.get(property.id)}
          isFavorited={favoritedProperties.has(property.id)}
          onFavoriteToggle={onFavoriteToggle}
          onView={onPropertyView}
          onShare={onPropertyShare}
          showMatchScore={showMatchScores}
        />
      ))}
    </div>
  );
}