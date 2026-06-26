import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MarketInsight } from '../../types/buyer';
import { TrendingUp, TrendingDown, Home, Calendar, BarChart3 } from 'lucide-react';

interface MarketInsightsCardProps {
  insight: MarketInsight;
}

export const MarketInsightsCard: React.FC<MarketInsightsCardProps> = ({ insight }) => {
  const isPriceIncreasing = insight.priceChangePercent > 0;
  
  const getTrendColor = () => {
    if (insight.marketTrend === 'sellers') return 'text-red-600 bg-red-50';
    if (insight.marketTrend === 'buyers') return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getInventoryColor = () => {
    if (insight.inventoryLevel === 'low') return 'text-orange-600 bg-orange-50';
    if (insight.inventoryLevel === 'high') return 'text-green-600 bg-green-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">{insight.location}</span>
          <Badge className={getTrendColor()}>
            {insight.marketTrend === 'sellers' && "Seller's Market"}
            {insight.marketTrend === 'buyers' && "Buyer's Market"}
            {insight.marketTrend === 'balanced' && 'Balanced Market'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Average Price</p>
            <p className="text-2xl font-bold text-blue-900">
              ${(insight.averagePrice / 1000).toFixed(0)}K
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Median Price</p>
            <p className="text-2xl font-bold text-blue-900">
              ${(insight.medianPrice / 1000).toFixed(0)}K
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
          {isPriceIncreasing ? (
            <TrendingUp className="w-5 h-5 text-red-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-green-600" />
          )}
          <div className="flex-1">
            <p className="text-sm text-gray-600">Price Change</p>
            <p className={`font-semibold ${isPriceIncreasing ? 'text-red-600' : 'text-green-600'}`}>
              {isPriceIncreasing ? '+' : ''}${insight.priceChange.toLocaleString()} (
              {isPriceIncreasing ? '+' : ''}
              {insight.priceChangePercent}%)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            <Calendar className="w-4 h-4 text-gray-600" />
            <div>
              <p className="text-xs text-gray-600">Days on Market</p>
              <p className="font-semibold">{insight.daysOnMarket}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
            <Home className="w-4 h-4 text-gray-600" />
            <div>
              <p className="text-xs text-gray-600">Inventory</p>
              <Badge className={getInventoryColor()} variant="outline">
                {insight.inventoryLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Recent Sales</p>
              <p className="font-semibold text-blue-900">{insight.recentSales}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-green-50 rounded">
            <Home className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">New Listings</p>
              <p className="font-semibold text-green-900">{insight.newListings}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Data for {insight.period}
        </div>
      </CardContent>
    </Card>
  );
};