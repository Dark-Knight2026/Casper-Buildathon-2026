import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/types/property';
import { Clock, MapPin, Bed, Bath, Maximize, Heart, Calendar } from 'lucide-react';

interface RecentlyViewedProps {
  properties: Property[];
  onViewDetails: (property: Property) => void;
  onToggleWishlist: (propertyId: string) => void;
  onScheduleTour: (propertyId: string) => void;
  wishlistedPropertyIds?: string[];
}

export function RecentlyViewed({
  properties,
  onViewDetails,
  onToggleWishlist,
  onScheduleTour,
  wishlistedPropertyIds = []
}: RecentlyViewedProps) {
  if (!properties || properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recently Viewed
          </CardTitle>
          <CardDescription>Properties you've recently looked at</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No recently viewed properties</p>
            <p className="text-sm mt-1">Start exploring to see your history here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recently Viewed
        </CardTitle>
        <CardDescription>
          {properties.length} {properties.length === 1 ? 'property' : 'properties'} you've recently looked at
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => {
            const isWishlisted = wishlistedPropertyIds?.includes(property.id.toString()) || false;
            
            return (
              <div
                key={property.id}
                className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.images?.[0] || '/images/photo1765250883.jpg'}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="bg-white/90 backdrop-blur-sm hover:bg-white"
                      onClick={() => onToggleWishlist(property.id.toString())}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                        }`}
                      />
                    </Button>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-blue-600">
                    Recently Viewed
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{property.address}</span>
                  </div>

                  <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      <span>{property.bedrooms} bed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      <span>{property.bathrooms} bath</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" />
                      <span>{property.sqft} sqft</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-blue-600">
                      ${property.price?.toLocaleString() || 0}
                      <span className="text-sm text-gray-600 font-normal">/mo</span>
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onViewDetails(property)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => onScheduleTour(property.id.toString())}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Tour
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}