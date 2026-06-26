import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Home, Calendar, DollarSign, BarChart3 } from 'lucide-react';

export default function MarketAnalytics() {
  const marketData = {
    medianPrice: 1850000,
    priceChange: 5.2,
    daysOnMarket: 28,
    inventory: 156,
    newListings: 42,
    soldProperties: 38,
    pricePerSqft: 825,
    absorption: 2.8
  };

  const neighborhoods = [
    { name: 'Beverly Hills', medianPrice: 2850000, change: 8.3, inventory: 23 },
    { name: 'Santa Monica', medianPrice: 2100000, change: 4.7, inventory: 31 },
    { name: 'Manhattan Beach', medianPrice: 3200000, change: 12.1, inventory: 18 },
    { name: 'Pasadena', medianPrice: 1650000, change: 3.2, inventory: 45 },
    { name: 'Downtown LA', medianPrice: 950000, change: -2.1, inventory: 67 }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Market Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${(marketData.medianPrice / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-gray-600">Median Price</div>
              <div className={`text-sm font-medium mt-1 ${
                marketData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {marketData.priceChange >= 0 ? '+' : ''}{marketData.priceChange}% YoY
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{marketData.daysOnMarket}</div>
              <div className="text-sm text-gray-600">Avg Days on Market</div>
              <div className="text-sm text-gray-500 mt-1">-3 days vs last month</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                <Home className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{marketData.inventory}</div>
              <div className="text-sm text-gray-600">Active Listings</div>
              <div className="text-sm text-gray-500 mt-1">{marketData.absorption} months supply</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">${marketData.pricePerSqft}</div>
              <div className="text-sm text-gray-600">Price per Sq Ft</div>
              <div className="text-sm text-green-600 mt-1">+$42 vs last quarter</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Market Activity</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">New Listings</span>
                  <span className="font-semibold">{marketData.newListings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Properties Sold</span>
                  <span className="font-semibold">{marketData.soldProperties}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sale-to-List Ratio</span>
                  <span className="font-semibold">98.2%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Price Trends</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>1 Year Growth</span>
                    <span className="text-green-600">+5.2%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>3 Year Growth</span>
                    <span className="text-green-600">+18.7%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>5 Year Growth</span>
                    <span className="text-green-600">+32.4%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neighborhood Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {neighborhoods.map((neighborhood, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{neighborhood.name}</h3>
                  <p className="text-sm text-gray-600">
                    ${(neighborhood.medianPrice / 1000000).toFixed(1)}M median • {neighborhood.inventory} active listings
                  </p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center space-x-1 ${
                    neighborhood.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {neighborhood.change >= 0 ? 
                      <TrendingUp className="h-4 w-4" /> : 
                      <TrendingDown className="h-4 w-4" />
                    }
                    <span className="font-semibold">
                      {neighborhood.change >= 0 ? '+' : ''}{neighborhood.change}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">YoY Change</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}