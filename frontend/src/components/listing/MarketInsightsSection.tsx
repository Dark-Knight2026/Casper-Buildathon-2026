import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketInsights, Comparable } from '@/types/listing';
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Train, 
  Shield, 
  Calendar,
  DollarSign,
  Square
} from 'lucide-react';

interface MarketInsightsSectionProps {
  insights: MarketInsights;
  comparables: Comparable[];
}

export default function MarketInsightsSection({ insights, comparables }: MarketInsightsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Neighborhood Scores */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Neighborhood Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Walk Score</p>
              <p className="text-2xl font-bold text-gray-900">{insights.walkScore}</p>
              <p className="text-xs text-gray-500">
                {insights.walkScore >= 90 ? 'Walker\'s Paradise' :
                 insights.walkScore >= 70 ? 'Very Walkable' :
                 insights.walkScore >= 50 ? 'Somewhat Walkable' :
                 'Car-Dependent'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Train className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Transit Score</p>
              <p className="text-2xl font-bold text-gray-900">{insights.transitScore}</p>
              <p className="text-xs text-gray-500">
                {insights.transitScore >= 90 ? 'Excellent Transit' :
                 insights.transitScore >= 70 ? 'Great Transit' :
                 insights.transitScore >= 50 ? 'Good Transit' :
                 'Some Transit'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Crime Index</p>
              <p className="text-2xl font-bold text-gray-900">{insights.crimeIndex}</p>
              <p className="text-xs text-gray-500">
                {insights.crimeIndex <= 25 ? 'Very Safe' :
                 insights.crimeIndex <= 50 ? 'Safe' :
                 insights.crimeIndex <= 75 ? 'Moderate' :
                 'Higher Crime'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Median Home Price</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${insights.medianHomePrice.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Price per Sq Ft</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${insights.pricePerSqft}
                  </p>
                </div>
                <Square className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Days on Market</p>
                  <p className="text-xl font-bold text-gray-900">
                    {insights.daysOnMarket}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Price History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History</h3>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {insights.priceHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      entry.event === 'Listed' ? 'bg-blue-500' :
                      entry.event === 'Sold' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.event}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${entry.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparable Sales */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Comparable Sales</h3>
        <div className="space-y-4">
          {comparables.map((comp) => (
            <Card key={comp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{comp.address}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>{comp.beds} bed</span>
                      <span>{comp.baths} bath</span>
                      <span>{comp.sqft.toLocaleString()} sq ft</span>
                      <span>{comp.distance} mi away</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Sold {new Date(comp.soldDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      ${comp.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      ${comp.pricePerSqft}/sq ft
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}