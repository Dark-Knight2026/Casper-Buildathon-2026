import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  BarChart3, 
  Eye, 
  Star, 
  Bed, 
  Bath, 
  Square, 
  MapPin,
  X,
  Check
} from 'lucide-react';
import { Property } from '@/types/property';
import { getFeaturedImage } from '@/utils/propertyImages';

interface SwipeablePropertyCardProps {
  property: Property;
  onViewDetails: (property: Property) => void;
  onFavorite: (propertyId: string) => void;
  onCompare: (property: Property) => void;
  isFavorited?: boolean;
  isInComparison?: boolean;
}

export default function SwipeablePropertyCard({
  property,
  onViewDetails,
  onFavorite,
  onCompare,
  isFavorited = false,
  isInComparison = false
}: SwipeablePropertyCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const maxSwipeDistance = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    if (touchStart !== null) {
      const distance = e.targetTouches[0].clientX - touchStart;
      const clampedDistance = Math.max(-maxSwipeDistance, Math.min(maxSwipeDistance, distance));
      setSwipeOffset(clampedDistance);

      if (distance < -minSwipeDistance) {
        setIsSwipingLeft(true);
        setIsSwipingRight(false);
      } else if (distance > minSwipeDistance) {
        setIsSwipingRight(true);
        setIsSwipingLeft(false);
      } else {
        setIsSwipingLeft(false);
        setIsSwipingRight(false);
      }
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      resetSwipe();
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe left - add to comparison
      onCompare(property);
      animateSwipeAction('left');
    } else if (isRightSwipe) {
      // Swipe right - add to favorites
      onFavorite(property.id);
      animateSwipeAction('right');
    } else {
      resetSwipe();
    }
  };

  const animateSwipeAction = (direction: 'left' | 'right') => {
    const finalOffset = direction === 'left' ? -maxSwipeDistance : maxSwipeDistance;
    setSwipeOffset(finalOffset);
    
    setTimeout(() => {
      resetSwipe();
    }, 300);
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
    setIsSwipingLeft(false);
    setIsSwipingRight(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const formatPrice = (price: number, type: string) => {
    if (type === 'sale') {
      return `$${price.toLocaleString()}`;
    }
    return `$${price.toLocaleString()}/mo`;
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Action Indicators */}
      <div className="absolute inset-0 flex">
        {/* Right swipe - Favorite */}
        <div 
          className={`flex-1 flex items-center justify-start pl-6 transition-opacity duration-200 ${
            isSwipingRight ? 'opacity-100 bg-green-500' : 'opacity-0'
          }`}
        >
          <div className="flex flex-col items-center text-white">
            <Heart className="h-8 w-8 fill-white" />
            <span className="text-sm font-semibold mt-1">Favorite</span>
          </div>
        </div>

        {/* Left swipe - Compare */}
        <div 
          className={`flex-1 flex items-center justify-end pr-6 transition-opacity duration-200 ${
            isSwipingLeft ? 'opacity-100 bg-blue-500' : 'opacity-0'
          }`}
        >
          <div className="flex flex-col items-center text-white">
            <BarChart3 className="h-8 w-8" />
            <span className="text-sm font-semibold mt-1">Compare</span>
          </div>
        </div>
      </div>

      {/* Swipeable Card */}
      <div
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: touchStart ? 'none' : 'transform 0.3s ease-out'
        }}
        className="relative"
      >
        <Card className="overflow-hidden touch-pan-y">
          {/* Property Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={getFeaturedImage(property.propertyType || 'apartment').src}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            
            {/* Status Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {property.featured && (
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  Featured
                </Badge>
              )}
              <Badge className="bg-white/90 text-gray-900">
                {property.type}
              </Badge>
            </div>

            {/* Quick Action Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(property.id);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
                  isFavorited 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/90 text-gray-700'
                }`}
              >
                <Heart className={`h-5 w-5 ${isFavorited ? 'fill-white' : ''}`} />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCompare(property);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
                  isInComparison 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/90 text-gray-700'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
            </div>

            {/* Stats Overlay */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <Badge variant="secondary" className="bg-white/90 text-gray-900">
                <Eye className="h-3 w-3 mr-1" />
                {property.views}
              </Badge>
              <Badge variant="secondary" className="bg-white/90 text-gray-900">
                <Heart className="h-3 w-3 mr-1" />
                {property.favorites}
              </Badge>
            </div>
          </div>

          <CardContent className="p-4">
            {/* Price */}
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {formatPrice(property.price, property.type)}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
              {property.title}
            </h3>

            {/* Location */}
            <div className="flex items-center text-gray-600 mb-3">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="text-sm line-clamp-1">{property.address}</span>
            </div>

            {/* Property Details */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              {property.bedrooms > 0 && (
                <div className="flex items-center text-gray-700">
                  <Bed className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center text-gray-700">
                  <Bath className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">{property.bathrooms}</span>
                </div>
              )}
              <div className="flex items-center text-gray-700">
                <Square className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{property.sqft.toLocaleString()}</span>
              </div>
              <div className="flex items-center text-yellow-500">
                <Star className="h-4 w-4 mr-1 fill-yellow-500" />
                <span className="text-sm font-medium">{property.rating}</span>
              </div>
            </div>

            {/* View Details Button */}
            <Button
              onClick={() => onViewDetails(property)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              View Details
            </Button>

            {/* Swipe Hint */}
            <div className="mt-3 text-center text-xs text-gray-500">
              ← Swipe for actions →
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}