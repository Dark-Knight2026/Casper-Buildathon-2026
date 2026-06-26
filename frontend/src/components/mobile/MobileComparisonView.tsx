import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ChevronLeft, 
  ChevronRight,
  Star,
  Bed,
  Bath,
  Square,
  MapPin,
  DollarSign,
  TrendingUp,
  Eye,
  Heart
} from 'lucide-react';
import { Property } from '@/types/property';
import { getFeaturedImage } from '@/utils/propertyImages';

interface MobileComparisonViewProps {
  properties: Property[];
  onRemoveProperty: (propertyId: string) => void;
  onViewDetails: (property: Property) => void;
  className?: string;
}

export default function MobileComparisonView({
  properties,
  onRemoveProperty,
  onViewDetails,
  className = ''
}: MobileComparisonViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < properties.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const nextProperty = () => {
    if (currentIndex < properties.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const previousProperty = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (properties.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties to Compare</h3>
        <p className="text-gray-600 text-center">Add properties to your comparison list to see them here</p>
      </div>
    );
  }

  const currentProperty = properties[currentIndex];
  const enrichedProperty = {
    ...currentProperty,
    pricePerSqft: currentProperty.price / currentProperty.sqft,
    valueScore: Math.round(
      Math.min(100, Math.max(0, 
        (currentProperty.rating * 15) + 
        (currentProperty.amenities.length * 2) + 
        (currentProperty.views / 100) + 
        (currentProperty.favorites / 10) - 
        ((currentProperty.price / currentProperty.sqft) / 10)
      ))
    )
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Property Comparison</h2>
        <Badge variant="secondary">
          {currentIndex + 1} of {properties.length}
        </Badge>
      </div>

      {/* Swipeable Content */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative overflow-hidden"
      >
        <Card className="m-4">
          {/* Property Image */}
          <div className="relative h-64 overflow-hidden">
            <img
              src={getFeaturedImage(currentProperty.propertyType || 'apartment').src}
              alt={currentProperty.title}
              className="w-full h-full object-cover"
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveProperty(currentProperty.id)}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white"
            >
              <X className="h-5 w-5" />
            </Button>

            <Badge className="absolute top-3 left-3 bg-white/90 text-gray-900">
              {currentProperty.type}
            </Badge>
          </div>

          <CardContent className="p-4 space-y-4">
            {/* Title and Location */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {currentProperty.title}
              </h3>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">{currentProperty.address}</span>
              </div>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-purple-600">
              ${currentProperty.price.toLocaleString()}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span className="text-xs">Price per Sq Ft</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  ${enrichedProperty.pricePerSqft.toFixed(2)}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center text-gray-600 mb-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-xs">Value Score</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {enrichedProperty.valueScore}/100
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-4 gap-3 py-3 border-y">
              <div className="text-center">
                <Bed className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <div className="text-sm font-semibold">{currentProperty.bedrooms}</div>
                <div className="text-xs text-gray-600">Beds</div>
              </div>
              <div className="text-center">
                <Bath className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <div className="text-sm font-semibold">{currentProperty.bathrooms}</div>
                <div className="text-xs text-gray-600">Baths</div>
              </div>
              <div className="text-center">
                <Square className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                <div className="text-sm font-semibold">{currentProperty.sqft.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Sq Ft</div>
              </div>
              <div className="text-center">
                <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500 fill-yellow-500" />
                <div className="text-sm font-semibold">{currentProperty.rating}</div>
                <div className="text-xs text-gray-600">Rating</div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around py-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1 text-gray-600" />
                <span className="text-sm font-medium">{currentProperty.views} views</span>
              </div>
              <div className="flex items-center">
                <Heart className="h-4 w-4 mr-1 text-gray-600" />
                <span className="text-sm font-medium">{currentProperty.favorites} favorites</span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {currentProperty.amenities.slice(0, 6).map((amenity, index) => (
                  <Badge key={index} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
                {currentProperty.amenities.length > 6 && (
                  <Badge variant="secondary">
                    +{currentProperty.amenities.length - 6} more
                  </Badge>
                )}
              </div>
            </div>

            {/* View Details Button */}
            <Button
              onClick={() => onViewDetails(currentProperty)}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              View Full Details
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Controls */}
      {properties.length > 1 && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={previousProperty}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white shadow-lg h-12 w-12 rounded-full"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {currentIndex < properties.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={nextProperty}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white shadow-lg h-12 w-12 rounded-full"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Swipe Hint */}
          <div className="text-center py-4 text-sm text-gray-500">
            ← Swipe to compare properties →
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 pb-4">
            {properties.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-8 bg-blue-600' 
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}