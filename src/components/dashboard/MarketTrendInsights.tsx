import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MarketTrend,
  calculateMarketTrends,
  calculateMarketCompetitiveness,
  analyzeNeighborhoods
} from '@/utils/marketTrends';
import { Property } from '@/types/property';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Home,
  Clock,
  DollarSign,
  BarChart3,
  Flame,
  Snowflake,
  Sun
} from 'lucide-react';

interface MarketTrendInsightsProps {
  properties: Property[];
}

export function MarketTrendInsights({ properties }: MarketTrendInsightsProps) {
  const trends = calculateMarketTrends(properties);
  const competitiveness = calculateMarketCompetitiveness(properties);
  const neighborhoods = analyzeNeighborhoods(properties).slice(0, 3);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getHotnessIcon = (hotness: 'hot' | 'warm' | 'cool') => {
    switch (hotness) {
      case 'hot':
        return <Flame className="w-4 h-4 text-red-500" />;
      case 'warm':
        return <Sun className="w-4 h-4 text-orange-500" />;
      default:
        return <Snowflake className="w-4 h-4 text-blue-500" />;
    }
  };

  const getHotnessColor = (hotness: 'hot' | 'warm' | 'cool') => {
    switch (hotness) {
      case 'hot':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'warm':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Market Competitiveness */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Market Competitiveness
          </CardTitle>
          <CardDescription>Current market conditions in your area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {competitiveness.level}
              </div>
              <p className="text-sm text-gray-600">{competitiveness.description}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">{competitiveness.score}</div>
              <div className="text-xs text-gray-600">Score</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${competitiveness.score}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Market Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Market Trends
          </CardTitle>
          <CardDescription>Key metrics and their recent changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {trends.map((trend, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{trend.metric}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {trend.metric.includes('Price') || trend.metric.includes('Sqft')
                        ? `$${Math.round(trend.value).toLocaleString()}`
                        : Math.round(trend.value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trend.trend)}
                    <span
                      className={`text-sm font-semibold ${
                        trend.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {trend.change > 0 ? '+' : ''}
                      {trend.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{trend.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hot Neighborhoods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600" />
            Trending Neighborhoods
          </CardTitle>
          <CardDescription>Top performing areas based on recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {neighborhoods.map((neighborhood, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getHotnessColor(neighborhood.hotness)}
                    >
                      {getHotnessIcon(neighborhood.hotness)}
                      <span className="ml-1 capitalize">{neighborhood.hotness}</span>
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{neighborhood.neighborhood}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      ${Math.round(neighborhood.avgPrice).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Avg Price</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 mb-1">
                      {neighborhood.priceChange > 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span
                        className={
                          neighborhood.priceChange > 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {neighborhood.priceChange > 0 ? '+' : ''}
                        {neighborhood.priceChange.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Price Change</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-900 mb-1">
                      <Home className="w-3 h-3" />
                      <span>{neighborhood.inventory}</span>
                    </div>
                    <p className="text-xs text-gray-500">Inventory</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-900 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{neighborhood.daysOnMarket}d</span>
                    </div>
                    <p className="text-xs text-gray-500">Avg DOM</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}