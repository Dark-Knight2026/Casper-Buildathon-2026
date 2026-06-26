import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  DollarSign,
  Home,
  Calendar,
  GraduationCap,
  Shield,
  Activity
} from 'lucide-react';
import type { NeighborhoodInsight } from '@/types/market';

interface NeighborhoodInsightsCardProps {
  insight: NeighborhoodInsight;
}

export default function NeighborhoodInsightsCard({ insight }: NeighborhoodInsightsCardProps) {
  const getInventoryColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-red-100 text-red-800';
      case 'balanced': return 'bg-green-100 text-green-800';
      case 'high': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCrimeColor = (rating: string) => {
    switch (rating) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{insight.neighborhood}</CardTitle>
            <p className="text-sm text-gray-600">{insight.city}, {insight.state}</p>
          </div>
          <Badge className={getInventoryColor(insight.inventory_level)}>
            {insight.inventory_level} inventory
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <DollarSign className="h-4 w-4 mr-1" />
              Median Home Value
            </div>
            <p className="text-xl font-bold">${insight.median_home_value.toLocaleString()}</p>
            <div className="flex items-center text-sm text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{insight.price_trend_1y.toFixed(1)}% YoY
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Calendar className="h-4 w-4 mr-1" />
              Days on Market
            </div>
            <p className="text-xl font-bold">{insight.avg_days_on_market}</p>
            <p className="text-sm text-gray-500 mt-1">days average</p>
          </div>
        </div>

        {/* Demographics */}
        {insight.population && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Demographics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Population:</span>
                <span className="font-medium">{insight.population.toLocaleString()}</span>
              </div>
              {insight.median_household_income && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Median Income:</span>
                  <span className="font-medium">${insight.median_household_income.toLocaleString()}</span>
                </div>
              )}
              {insight.median_age && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Median Age:</span>
                  <span className="font-medium">{insight.median_age}</span>
                </div>
              )}
              {insight.homeownership_rate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Homeownership:</span>
                  <span className="font-medium">{insight.homeownership_rate}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Market Activity */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Market Activity</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sales YTD:</span>
              <span className="font-medium">{insight.total_sales_ytd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Home Value:</span>
              <span className="font-medium">${insight.avg_home_value.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Scores & Ratings */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Amenities & Safety</h4>
          <div className="space-y-2">
            {insight.school_rating && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  School Rating
                </div>
                <div className="flex items-center">
                  <div className="flex space-x-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i < insight.school_rating! ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 font-semibold">{insight.school_rating}/10</span>
                </div>
              </div>
            )}

            {insight.walkability_score && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Activity className="h-4 w-4 mr-2" />
                  Walkability
                </div>
                <span className="font-semibold">{insight.walkability_score}/100</span>
              </div>
            )}

            {insight.crime_rating && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-2" />
                  Crime Rating
                </div>
                <Badge className={getCrimeColor(insight.crime_rating)}>
                  {insight.crime_rating}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Investment Metrics */}
        {(insight.appreciation_rate_5y || insight.rental_yield) && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold text-sm">Investment Metrics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {insight.appreciation_rate_5y && (
                <div className="flex justify-between">
                  <span className="text-gray-600">5Y Appreciation:</span>
                  <span className="font-medium text-green-600">+{insight.appreciation_rate_5y}%</span>
                </div>
              )}
              {insight.rental_yield && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Rental Yield:</span>
                  <span className="font-medium">{insight.rental_yield}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}