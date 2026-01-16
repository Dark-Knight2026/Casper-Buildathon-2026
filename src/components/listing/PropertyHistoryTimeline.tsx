import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PropertyHistory } from '@/types/listing';
import { Calendar, TrendingUp, TrendingDown, Home, Eye, Clock } from 'lucide-react';

interface PropertyHistoryTimelineProps {
  history: PropertyHistory[];
  currentPrice: number;
}

export default function PropertyHistoryTimeline({ history, currentPrice }: PropertyHistoryTimelineProps) {
  const getEventIcon = (event: string) => {
    switch (event) {
      case 'listed':
        return <Home className="h-4 w-4" />;
      case 'sold':
        return <TrendingUp className="h-4 w-4" />;
      case 'price_change':
        return <TrendingDown className="h-4 w-4" />;
      case 'withdrawn':
        return <Eye className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'listed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sold':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'price_change':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'relisted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatEventName = (event: string) => {
    return event.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Property History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedHistory.map((entry, index) => (
            <div key={index} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getEventColor(entry.event)}`}>
                {getEventIcon(entry.event)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">
                      {formatEventName(entry.event)}
                    </h4>
                    {entry.daysOnMarket && (
                      <Badge variant="outline" className="text-xs">
                        {entry.daysOnMarket} days
                      </Badge>
                    )}
                  </div>
                  {entry.price && (
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        ${entry.price.toLocaleString()}
                      </div>
                      {index < sortedHistory.length - 1 && sortedHistory[index + 1].price && (
                        <div className={`text-sm ${
                          entry.price > sortedHistory[index + 1].price! 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {entry.price > sortedHistory[index + 1].price! ? '+' : ''}
                          ${(entry.price - sortedHistory[index + 1].price!).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 mb-1">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                
                {entry.details && (
                  <p className="text-sm text-gray-700">{entry.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Price Change Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Price Change Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Original List Price</p>
              <p className="font-semibold">
                ${history.find(h => h.event === 'listed')?.price?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Current Price</p>
              <p className="font-semibold">${currentPrice.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Changes</p>
              <p className="font-semibold">
                {history.filter(h => h.event === 'price_change').length}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Days on Market</p>
              <p className="font-semibold">
                {history.find(h => h.daysOnMarket)?.daysOnMarket || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}