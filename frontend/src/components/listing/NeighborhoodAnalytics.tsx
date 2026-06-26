import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NeighborhoodData, NearbyAmenity } from '@/types/listing';
import { 
  MapPin, 
  Train, 
  Shield, 
  Volume2, 
  Wind, 
  Users, 
  DollarSign, 
  GraduationCap,
  Utensils,
  ShoppingBag,
  Music,
  Heart,
  Trees
} from 'lucide-react';

interface NeighborhoodAnalyticsProps {
  data: NeighborhoodData;
  amenities: NearbyAmenity[];
}

export default function NeighborhoodAnalytics({ data, amenities }: NeighborhoodAnalyticsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Below Average';
    return 'Poor';
  };

  const getAmenityIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Utensils className="h-4 w-4" />;
      case 'shopping':
        return <ShoppingBag className="h-4 w-4" />;
      case 'park':
        return <Trees className="h-4 w-4" />;
      case 'entertainment':
        return <Music className="h-4 w-4" />;
      case 'healthcare':
        return <Heart className="h-4 w-4" />;
      case 'transit':
        return <Train className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Livability Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Livability Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Walk Score</span>
                </div>
                <span className={`font-bold ${getScoreColor(data.walkScore)}`}>
                  {data.walkScore}
                </span>
              </div>
              <Progress value={data.walkScore} className="h-2" />
              <p className="text-xs text-gray-500">{getScoreLabel(data.walkScore)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Train className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Transit Score</span>
                </div>
                <span className={`font-bold ${getScoreColor(data.transitScore)}`}>
                  {data.transitScore}
                </span>
              </div>
              <Progress value={data.transitScore} className="h-2" />
              <p className="text-xs text-gray-500">{getScoreLabel(data.transitScore)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Safety Score</span>
                </div>
                <span className={`font-bold ${getScoreColor(100 - data.crimeIndex)}`}>
                  {100 - data.crimeIndex}
                </span>
              </div>
              <Progress value={100 - data.crimeIndex} className="h-2" />
              <p className="text-xs text-gray-500">{getScoreLabel(100 - data.crimeIndex)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Quiet Score</span>
                </div>
                <span className={`font-bold ${getScoreColor(100 - data.noiseLevel)}`}>
                  {100 - data.noiseLevel}
                </span>
              </div>
              <Progress value={100 - data.noiseLevel} className="h-2" />
              <p className="text-xs text-gray-500">{getScoreLabel(100 - data.noiseLevel)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wind className="h-4 w-4 text-cyan-600" />
                  <span className="text-sm font-medium">Air Quality</span>
                </div>
                <span className={`font-bold ${getScoreColor(data.airQuality)}`}>
                  {data.airQuality}
                </span>
              </div>
              <Progress value={data.airQuality} className="h-2" />
              <p className="text-xs text-gray-500">{getScoreLabel(data.airQuality)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Bike Score</span>
                </div>
                <span className={`font-bold ${getScoreColor(data.bikeScore)}`}>
                  {data.bikeScore}
                </span>
              </div>
              <Progress value={data.bikeScore} className="h-2" />
              <p className="text-xs text-gray-500">{getScoreLabel(data.bikeScore)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <Card>
        <CardHeader>
          <CardTitle>Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{data.demographics.medianAge}</div>
              <div className="text-sm text-gray-600">Median Age</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${(data.demographics.medianIncome / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-gray-600">Median Income</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                <GraduationCap className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.demographics.education.bachelors}%
              </div>
              <div className="text-sm text-gray-600">College Educated</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-2">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.demographics.homeOwnership}%
              </div>
              <div className="text-sm text-gray-600">Home Ownership</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Education Breakdown</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">High School</p>
                <p className="font-semibold">{data.demographics.education.highSchool}%</p>
              </div>
              <div>
                <p className="text-gray-600">Bachelor's</p>
                <p className="font-semibold">{data.demographics.education.bachelors}%</p>
              </div>
              <div>
                <p className="text-gray-600">Graduate</p>
                <p className="font-semibold">{data.demographics.education.graduate}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Nearby Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {amenities.slice(0, 10).map((amenity) => (
              <div key={amenity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
                  {getAmenityIcon(amenity.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{amenity.name}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>{amenity.distance} mi</span>
                    {amenity.walkTime && <span>• {amenity.walkTime} min walk</span>}
                    {amenity.rating && (
                      <Badge variant="outline" className="text-xs">
                        ⭐ {amenity.rating}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Amenity Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">Amenity Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{data.amenities.restaurants}</div>
                <div className="text-blue-700">Restaurants</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{data.amenities.shopping}</div>
                <div className="text-blue-700">Shopping</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{data.amenities.entertainment}</div>
                <div className="text-blue-700">Entertainment</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{data.amenities.healthcare}</div>
                <div className="text-blue-700">Healthcare</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-900">{data.amenities.parks}</div>
                <div className="text-blue-700">Parks</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}