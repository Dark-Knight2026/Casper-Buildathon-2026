import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { PropertyCard } from './PropertyCard';
import { Property } from '../../types/buyer';
import { Sparkles, TrendingUp } from 'lucide-react';

interface RecommendedProperty {
  property: Property;
  score: number;
  reasons: string[];
}

interface PropertyRecommendationsProps {
  recommendations: RecommendedProperty[];
  onViewDetails: (property: Property) => void;
  onToggleWishlist: (propertyId: string) => void;
  wishlistIds: string[];
  onScheduleTour?: (propertyId: string) => void;
}

export function PropertyRecommendations({
  recommendations,
  onViewDetails,
  onToggleWishlist,
  wishlistIds,
  onScheduleTour,
}: PropertyRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Recommendations
          </CardTitle>
          <CardDescription>
            No recommendations available at the moment. Start browsing properties to get personalized suggestions!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        {recommendations.map(({ property, score, reasons }) => (
          <div key={property.id} className="relative">
            {/* Match Score Badge */}
            <div className="absolute top-2 right-2 z-10">
              <Badge
                className={`${
                  score >= 80
                    ? 'bg-green-600'
                    : score >= 60
                    ? 'bg-blue-600'
                    : 'bg-purple-600'
                } text-white`}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {score}% Match
              </Badge>
            </div>

            <PropertyCard
              property={property}
              onViewDetails={onViewDetails}
              onToggleWishlist={onToggleWishlist}
              onScheduleTour={onScheduleTour || (() => {})}
              isInWishlist={wishlistIds.includes(property.id)}
            />

            {/* Recommendation Reasons */}
            {reasons && reasons.length > 0 && (
              <div className="mt-2 space-y-1">
                {reasons.slice(0, 2).map((reason, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-gray-600 bg-purple-50 px-2 py-1 rounded"
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}