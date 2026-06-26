import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { InteractivePropertyMap } from '@/components/buyer/InteractivePropertyMap';
import { PropertyCard } from '@/components/buyer/PropertyCard';
import { AdvancedFilters } from '@/components/buyer/AdvancedFilters';
import { PropertyDetailsModal } from '@/components/buyer/PropertyDetailsModal';
import { useBuyerDashboard } from '@/hooks/useBuyerDashboard';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types/buyer';

interface FilterCriteria {
  priceMin: number;
  priceMax: number;
  bedrooms: number[];
  bathrooms: number[];
  propertyTypes: string[];
  sqftMin: number;
  sqftMax: number;
  yearBuiltMin: number;
  yearBuiltMax: number;
  features: string[];
  neighborhoods: string[];
  schoolRatingMin: number;
  keywords: string;
}

export default function BuyerSearch() {
  const { toast } = useToast();
  const {
    convertedProperties,
    wishlistPropertyIds,
    setWishlistPropertyIds,
    viewedPropertyIds,
    setViewedPropertyIds,
    allProperties
  } = useBuyerDashboard();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [detailsProperty, setDetailsProperty] = useState<Property | null>(null);

  const handleToggleWishlist = (propertyId: string) => {
    setWishlistPropertyIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
  };

  const handleViewDetails = (property: Property) => {
    // Track viewed property
    if (!viewedPropertyIds.includes(property.id)) {
      setViewedPropertyIds((prev) => [property.id, ...prev.slice(0, 9)]);
    }
    setDetailsProperty(property);
    setShowPropertyDetails(true);
  };

  const handleApplyFilters = (filters: FilterCriteria) => {
    toast({
      title: "Filters Applied",
      description: "Your search criteria have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Find Your Dream Home</h2>
        <Button onClick={() => setShowAdvancedFilters(true)}>
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
        </Button>
      </div>
      <InteractivePropertyMap
        properties={convertedProperties}
        onMarkerClick={handleViewDetails}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {convertedProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onViewDetails={() => handleViewDetails(property)}
            onToggleWishlist={() => handleToggleWishlist(property.id)}
            isWishlisted={wishlistPropertyIds.includes(property.id)}
          />
        ))}
      </div>

      {showAdvancedFilters && (
        <AdvancedFilters
          onApply={handleApplyFilters}
          onClose={() => setShowAdvancedFilters(false)}
        />
      )}

      {showPropertyDetails && detailsProperty && (
        <PropertyDetailsModal
          property={detailsProperty}
          onClose={() => {
            setShowPropertyDetails(false);
            setDetailsProperty(null);
          }}
          onToggleWishlist={handleToggleWishlist}
          onScheduleTour={() => {}} // Placeholder
          onMakeOffer={() => {}} // Placeholder
          isInWishlist={wishlistPropertyIds.includes(detailsProperty.id)}
          similarProperties={allProperties.filter((p) => p.id !== detailsProperty.id).slice(0, 4)}
        />
      )}
    </div>
  );
}