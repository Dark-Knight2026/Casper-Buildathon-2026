import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Home, DollarSign } from 'lucide-react';

export default function MarketInsights() {
  const marketData = [
    {
      area: 'Norfolk',
      avgPrice: 485000,
      priceChange: 8.2,
      inventory: 245,
      daysOnMarket: 28
    },
    {
      area: 'Virginia Beach',
      avgPrice: 625000,
      priceChange: 12.5,
      inventory: 189,
      daysOnMarket: 22
    },
    {
      area: 'Chesapeake',
      avgPrice: 425000,
      priceChange: -2.1,
      inventory: 156,
      daysOnMarket: 35
    },
    {
      area: 'Portsmouth',
      avgPrice: 285000,
      priceChange: 5.8,
      inventory: 98,
      daysOnMarket: 42
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Market Insights</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Avg Market Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$455K</div>
            <p className="text-xs text-gray-600 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +6.1% YoY
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Total Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">688</div>
            <p className="text-xs text-gray-600 mt-1">Active listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Days on Market
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">32</div>
            <p className="text-xs text-gray-600 mt-1">-5 days from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Market Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">High</div>
            <p className="text-xs text-gray-600 mt-1">Seller's market</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Market Areas Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketData.map((area, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">{area.area}</h4>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">Avg Price</p>
                      <p className="font-medium">${(area.avgPrice / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Inventory</p>
                      <p className="font-medium">{area.inventory}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Days on Market</p>
                      <p className="font-medium">{area.daysOnMarket}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={
                      area.priceChange > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {area.priceChange > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(area.priceChange)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}