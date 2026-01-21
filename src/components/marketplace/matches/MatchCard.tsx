/**
 * MatchCard Component
 * Display property/tenant match with detailed score breakdown
 */

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Star,
  DollarSign,
  MapPin,
  Home,
  Calendar,
  PawPrint,
  TrendingUp,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchScore } from '@/types/matching';

interface MatchCardProps {
  matchScore: MatchScore;
  property: {
    id: string;
    title: string;
    image: string;
    rent: number;
    address: string;
    bedrooms: number;
    bathrooms: number;
  };
  onViewProperty?: (propertyId: string) => void;
  onApply?: (propertyId: string) => void;
  variant?: 'default' | 'compact';
}

export function MatchCard({
  matchScore,
  property,
  onViewProperty,
  onApply,
  variant = 'default'
}: MatchCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const scoreComponents = [
    {
      label: 'Price Match',
      score: matchScore.componentScores.priceScore,
      icon: DollarSign,
      color: 'text-green-600',
      explanation: matchScore.explanations.priceExplanation
    },
    {
      label: 'Location',
      score: matchScore.componentScores.locationScore,
      icon: MapPin,
      color: 'text-blue-600',
      explanation: matchScore.explanations.locationExplanation
    },
    {
      label: 'Amenities',
      score: matchScore.componentScores.amenityScore,
      icon: Home,
      color: 'text-purple-600',
      explanation: matchScore.explanations.amenityExplanation
    },
    {
      label: 'Lease Term',
      score: matchScore.componentScores.leaseTermScore,
      icon: Calendar,
      color: 'text-orange-600',
      explanation: matchScore.explanations.leaseTermExplanation
    },
    {
      label: 'Pet Policy',
      score: matchScore.componentScores.petPolicyScore,
      icon: PawPrint,
      color: 'text-pink-600',
      explanation: matchScore.explanations.petPolicyExplanation
    }
  ];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Match Score Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-5 w-5 fill-current" />
              <span className="text-2xl font-bold">
                {matchScore.overallScore}%
              </span>
            </div>
            <p className="text-sm opacity-90">{getScoreLabel(matchScore.overallScore)}</p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            Rank #{matchScore.rank}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex gap-4">
          <img
            src={property.image}
            alt={property.title}
            className="w-24 h-24 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-1 mb-1">
              {property.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-1 mb-2">
              <MapPin className="h-3 w-3 inline mr-1" />
              {property.address}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <span className="font-semibold text-lg text-blue-600">
                {formatPrice(property.rent)}/mo
              </span>
              <span>{property.bedrooms} bed</span>
              <span>{property.bathrooms} bath</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Match Breakdown</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Our matching algorithm considers multiple factors to find your perfect property.
                    Higher scores indicate better compatibility.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {scoreComponents.map((component) => {
            const Icon = component.icon;
            return (
              <div key={component.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", component.color)} />
                    <span className="font-medium">{component.label}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{component.explanation}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className={cn("font-semibold", getScoreColor(component.score))}>
                    {component.score}%
                  </span>
                </div>
                <Progress
                  value={component.score}
                  className="h-2"
                  indicatorClassName={getProgressColor(component.score)}
                />
              </div>
            );
          })}
        </div>

        {/* Match Highlights */}
        {matchScore.highlights && matchScore.highlights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Why This Match?</h4>
            <div className="space-y-1.5">
              {matchScore.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compatibility Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Affordability</p>
            <p className="text-lg font-bold text-blue-600">
              {matchScore.compatibilityMetrics.affordabilityRatio.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Distance</p>
            <p className="text-lg font-bold text-purple-600">
              {matchScore.compatibilityMetrics.distanceFromPreferred.toFixed(1)} mi
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onViewProperty?.(property.id)}
        >
          View Details
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={() => onApply?.(property.id)}
        >
          Apply Now
        </Button>
      </CardFooter>
    </Card>
  );
}