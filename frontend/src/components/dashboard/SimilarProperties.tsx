import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PropertyScore } from '@/utils/recommendationEngine';
import { Property } from '@/types/property';
import { MapPin, Bed, Bath, Maximize, Heart, Calendar, Sparkles } from 'lucide-react';

interface SimilarPropertiesProps {
  similarProperties: PropertyScore[];
  onViewDetails: (property: Property) => void;
  onToggleWishlist: (propertyId: string) => void;
  onScheduleTour: (propertyId: string) => void;
  wishlistedPropertyIds: string[];
  basePropertyTitle?: string;
}

export function SimilarProperties({
  similarProperties,
  onViewDetails,
  onToggleWishlist,
  onScheduleTour,
  wishlistedPropertyIds,
  basePropertyTitle
}: SimilarPropertiesProps) {
  if (similarProperties.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Similar Properties
        </CardTitle>
        <CardDescription>
          {basePropertyTitle
            ? `Properties similar to "${basePropertyTitle}"`
            : 'Properties you might like based on your preferences'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {similarProperties.map(({ property, score, reasons }) => {
            const isWishlisted = wishlistedPropertyIds.includes(property.id.toString());
            
            return (
              <div
                key={property.id}
                className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="bg-white/90 backdrop-blur-sm hover:bg-white h-8 w-8"
                      onClick={() => onToggleWishlist(property.id.toString())}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'
                        }`}
                      />
                    </Button>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-purple-600 text-xs">
                    {Math.round(score * 100)}% Match
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-1 mb-1">{property.title}</h3>

                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{property.address}</span>
                  </div>

                  <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Bed className="w-3 h-3" />
                      <span>{property.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="w-3 h-3" />
                      <span>{property.bathrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="w-3 h-3" />
                      <span>{property.sqft}</span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-lg font-bold text-blue-600">
                      ${property.price.toLocaleString()}
                      <span className="text-xs text-gray-600 font-normal">/mo</span>
                    </span>
                  </div>

                  {reasons.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-purple-600 line-clamp-2">
                        {reasons[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => onViewDetails(property)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-8"
                      onClick={() => onScheduleTour(property.id.toString())}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
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