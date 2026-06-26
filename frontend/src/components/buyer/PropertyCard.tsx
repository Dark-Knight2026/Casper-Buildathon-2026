import React from 'react';
import { Property } from '../../types/buyer';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Heart, MapPin, Bed, Bath, Maximize, Calendar, Eye, MessageSquare } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onToggleWishlist: (propertyId: string) => void;
  onScheduleTour: (propertyId: string) => void;
  isInWishlist?: boolean;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onViewDetails,
  onToggleWishlist,
  onScheduleTour,
  isInWishlist = false,
}) => {
  // Safely get square footage - handle both squareFeet and squareFootage properties
  const squareFootage = property.squareFeet || property.squareFootage || 0;
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-48 object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-2 right-2 ${
            isInWishlist ? 'text-red-500' : 'text-white'
          } hover:scale-110 transition-transform`}
          onClick={() => onToggleWishlist(property.id)}
        >
          <Heart className={isInWishlist ? 'fill-current' : ''} />
        </Button>
        <Badge className="absolute top-2 left-2 bg-blue-600">
          {property.status.toUpperCase()}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-blue-900">
            ${property.price?.toLocaleString() || '0'}
          </h3>
          <Badge variant="outline" className="text-xs">
            {property.daysOnMarket || 0} days
          </Badge>
        </div>
        
        <h4 className="font-semibold text-gray-800 mb-2 line-clamp-1">
          {property.title}
        </h4>
        
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="line-clamp-1">
            {property.address}, {property.city}, {property.state}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{property.bedrooms || 0} beds</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{property.bathrooms || 0} baths</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize className="w-4 h-4" />
            <span>{squareFootage.toLocaleString()} sqft</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{property.views || 0} views</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{property.inquiries || 0} inquiries</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {property.description}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {property.features?.slice(0, 3).map((feature, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
          {property.features && property.features.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{property.features.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onViewDetails(property)}
        >
          View Details
        </Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => onScheduleTour(property.id)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Tour
        </Button>
      </CardFooter>
    </Card>
  );
};