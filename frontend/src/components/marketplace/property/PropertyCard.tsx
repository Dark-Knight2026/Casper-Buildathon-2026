/**
 * PropertyCard Component
 * Displays a property listing card with image, details, and match score
 */

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Calendar,
  Star,
  TrendingUp,
  Eye,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyFeatures, MatchScore } from '@/types/matching';

interface PropertyCardProps {
  property: PropertyFeatures & {
    id: string;
    title: string;
    images: string[];
    landlordName: string;
    landlordRating?: number;
    availableDate: Date;
    views?: number;
  };
  matchScore?: MatchScore;
  isFavorited?: boolean;
  onFavoriteToggle?: (propertyId: string) => void;
  onView?: (propertyId: string) => void;
  onShare?: (propertyId: string) => void;
  showMatchScore?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function PropertyCard({
  property,
  matchScore,
  isFavorited = false,
  onFavoriteToggle,
  onView,
  onShare,
  showMatchScore = false,
  variant = 'default'
}: PropertyCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  const handleCardClick = () => {
    if (onView) {
      onView(property.id);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(property.id);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(property.id);
    }
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:shadow-2xl hover:-translate-y-1",
        variant === 'compact' && "max-w-sm",
        variant === 'detailed' && "max-w-2xl"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-gray-100">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        )}
        <img
          src={property.images[0] || '/images/photo1765637561.jpg'}
          alt={property.title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isHovered && "scale-110",
            !imageLoaded && "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {property.propertyType && (
            <Badge className="bg-white/90 text-gray-900 backdrop-blur-sm">
              {property.propertyType}
            </Badge>
          )}
          {property.views && property.views > 100 && (
            <Badge className="bg-red-500 text-white">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
                  onClick={handleFavoriteClick}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isFavorited && "fill-red-500 text-red-500"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
                  onClick={handleShareClick}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share property</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Match Score Badge */}
        {showMatchScore && matchScore && (
          <div className="absolute bottom-3 right-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      "text-sm font-bold px-3 py-1.5 border-2",
                      getMatchScoreColor(matchScore.overallScore)
                    )}
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {matchScore.overallScore}% Match
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-semibold">{getMatchScoreLabel(matchScore.overallScore)}</p>
                    <p className="text-xs">Price: {matchScore.componentScores.priceScore}%</p>
                    <p className="text-xs">Location: {matchScore.componentScores.locationScore}%</p>
                    <p className="text-xs">Amenities: {matchScore.componentScores.amenityScore}%</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* View Count */}
        {property.views && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {property.views} views
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        {/* Price */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(property.rent)}
            </span>
            <span className="text-sm text-gray-600 ml-1">/month</span>
          </div>
          {property.landlordRating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{property.landlordRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span className="line-clamp-1">{property.address}</span>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Property Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Bed className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{property.bedrooms}</span>
            <span className="text-gray-500">bed</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Bath className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{property.bathrooms}</span>
            <span className="text-gray-500">bath</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Square className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{property.squareFeet?.toLocaleString()}</span>
            <span className="text-gray-500">sqft</span>
          </div>
        </div>

        {/* Key Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {property.amenities.length > 3 && (
              <Badge variant="outline" className="text-xs font-semibold">
                +{property.amenities.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Available Date */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Available {formatDate(property.availableDate)}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {property.landlordName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{property.landlordName}</p>
              <p className="text-xs text-gray-500">Property Owner</p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}