import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { aiService, MarketTrend } from '@/services/aiService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketTrendCardProps {
  location: string;
  className?: string;
}

export const MarketTrendCard: React.FC<MarketTrendCardProps> = ({ location, className }) => {
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const data = await aiService.getMarketInsights(location);
        setTrends(data);
      } catch (error) {
        console.error('Failed to fetch market trends:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrends();
  }, [location]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'down': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex justify-between items-end">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid gap-4 ${className}`}>
      {trends.map((trend) => (
        <Card key={trend.id} className="overflow-hidden border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{trend.metric}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">
                  {trend.metric.includes('Price') || trend.metric.includes('Rent') ? '$' : ''}
                  {trend.value.toLocaleString()}
                </h3>
              </div>
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTrendColor(trend.direction)}`}>
                {getTrendIcon(trend.direction)}
                <span className="ml-1">{Math.abs(trend.change)}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {trend.forecast}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};