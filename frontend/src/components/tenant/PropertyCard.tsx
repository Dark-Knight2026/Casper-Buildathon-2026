/**
 * Property Card Component
 * Displays property information in grid or list view
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Property } from '@/types/property';
import { Bed, Bath, Maximize2, MapPin, Calendar, DollarSign, Eye, Heart } from 'lucide-react';
import { format } from 'date-fns';

interface PropertyCardProps {
  property: Property;
  viewMode: 'grid' | 'list';
  onViewDetails: () => void;
  onApply: () => void;
}

export function PropertyCard({ property, viewMode, onViewDetails, onApply }: PropertyCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="relative w-full md:w-80 h-64 md:h-auto flex-shrink-0">
              {property.images && property.images.length > 0 ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onClick={onViewDetails}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <Badge className="absolute top-3 right-3 bg-white text-gray-900">
                {property.propertyType}
              </Badge>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1" onClick={onViewDetails}>
                  <h3 className="text-xl font-bold mb-1 hover:text-primary">
                    {property.title}
                  </h3>
                  <p className="text-gray-600 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}, {property.city}, {property.state} {property.zipCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(property.rent)}
                    <span className="text-sm text-gray-500 font-normal">/mo</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Deposit: {formatCurrency(property.securityDeposit)}
                  </p>
                </div>
              </div>

              {property.description && (
                <p className="text-gray-600 mb-4 line-clamp-2">{property.description}</p>
              )}

              {/* Property Details */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center text-gray-700">
                  <Bed className="h-4 w-4 mr-1" />
                  <span className="text-sm">{property.bedrooms} Beds</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Bath className="h-4 w-4 mr-1" />
                  <span className="text-sm">{property.bathrooms} Baths</span>
                </div>
                {property.squareFeet && (
                  <div className="flex items-center text-gray-700">
                    <Maximize2 className="h-4 w-4 mr-1" />
                    <span className="text-sm">{property.squareFeet.toLocaleString()} sq ft</span>
                  </div>
                )}
                <div className="flex items-center text-gray-700">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    Available {format(new Date(property.availableDate), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {property.amenities.slice(0, 5).map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                  {property.amenities.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{property.amenities.length - 5} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={onViewDetails} variant="outline" className="flex-1">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
                <Button onClick={onApply} className="flex-1">
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid View
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-48 cursor-pointer" onClick={onViewDetails}>
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <Badge className="absolute top-3 right-3 bg-white text-gray-900">
            {property.propertyType}
          </Badge>
          <button className="absolute top-3 left-3 p-2 bg-white rounded-full hover:bg-gray-100">
            <Heart className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-3">
            <div className="flex justify-between items-start mb-2">
              <h3 
                className="text-lg font-bold line-clamp-1 hover:text-primary cursor-pointer flex-1"
                onClick={onViewDetails}
              >
                {property.title}
              </h3>
            </div>
            <p className="text-gray-600 text-sm flex items-center mb-2">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="line-clamp-1">
                {property.city}, {property.state}
              </span>
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(property.rent)}
              <span className="text-sm text-gray-500 font-normal">/mo</span>
            </p>
          </div>

          {/* Property Details */}
          <div className="flex justify-between mb-3 text-sm text-gray-700">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1" />
              <span>{property.bedrooms} Beds</span>
            </div>
            <div className="flex items-center">
              <Bath className="h-4 w-4 mr-1" />
              <span>{property.bathrooms} Baths</span>
            </div>
            {property.squareFeet && (
              <div className="flex items-center">
                <Maximize2 className="h-4 w-4 mr-1" />
                <span>{property.squareFeet.toLocaleString()} ft²</span>
              </div>
            )}
          </div>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {property.amenities.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{property.amenities.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Available Date */}
          <p className="text-xs text-gray-500 mb-3 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Available {format(new Date(property.availableDate), 'MMM d, yyyy')}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={onViewDetails} variant="outline" size="sm" className="flex-1">
              Details
            </Button>
            <Button onClick={onApply} size="sm" className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}