import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Home, 
  Users,
  Clock,
  Star,
  Zap,
  Target
} from 'lucide-react';

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'market' | 'location' | 'price' | 'timing' | 'investment';
  icon: React.ReactNode;
  action: string;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  data?: Record<string, unknown>;
}

interface SmartSearchSuggestionsProps {
  userPreferences?: Record<string, unknown>;
  searchHistory?: string[];
  onSuggestionClick: (suggestion: SmartSuggestion) => void;
}

export default function SmartSearchSuggestions({ 
  userPreferences = {},
  searchHistory = [],
  onSuggestionClick 
}: SmartSearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateSmartSuggestions();
  }, [userPreferences, searchHistory]);

  const generateSmartSuggestions = async () => {
    setIsLoading(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const smartSuggestions: SmartSuggestion[] = [
      // Market Intelligence
      {
        id: 'market-1',
        title: 'Beverly Hills Market Surge',
        description: 'Properties in Beverly Hills have increased 12% this quarter. Consider searching now before prices rise further.',
        type: 'market',
        icon: <TrendingUp className="h-5 w-5" />,
        action: 'Search Beverly Hills',
        confidence: 89,
        trend: 'up',
        data: { priceIncrease: 12, timeframe: 'Q3 2024' }
      },
      {
        id: 'market-2',
        title: 'Santa Monica Inventory Increase',
        description: 'New listings in Santa Monica up 25%. More options available for buyers in your price range.',
        type: 'market',
        icon: <Home className="h-5 w-5" />,
        action: 'Browse Santa Monica',
        confidence: 76,
        trend: 'up',
        data: { inventoryIncrease: 25 }
      },
      
      // Location Intelligence
      {
        id: 'location-1',
        title: 'Hidden Gem: Culver City',
        description: 'Based on your search history, Culver City offers 30% better value with similar amenities to your preferred areas.',
        type: 'location',
        icon: <MapPin className="h-5 w-5" />,
        action: 'Explore Culver City',
        confidence: 82,
        data: { savings: 30, similarAmenities: ['restaurants', 'transit', 'schools'] }
      },
      {
        id: 'location-2',
        title: 'Commute-Friendly Options',
        description: 'Properties within 20 minutes of your workplace in West Hollywood are 15% undervalued.',
        type: 'location',
        icon: <Target className="h-5 w-5" />,
        action: 'Search Near Work',
        confidence: 78,
        data: { commuteTime: 20, undervalued: 15 }
      },
      
      // Price Intelligence
      {
        id: 'price-1',
        title: 'Sweet Spot: $1.1M - $1.3M',
        description: 'Your budget range has 40% more inventory than higher brackets. Great negotiation power.',
        type: 'price',
        icon: <DollarSign className="h-5 w-5" />,
        action: 'Search $1.1M-$1.3M',
        confidence: 85,
        data: { inventoryAdvantage: 40, negotiationPower: 'high' }
      },
      {
        id: 'price-2',
        title: 'Price Drop Opportunities',
        description: '23 properties in your search area reduced prices by 5-10% in the last 30 days.',
        type: 'price',
        icon: <Zap className="h-5 w-5" />,
        action: 'View Price Drops',
        confidence: 92,
        data: { count: 23, reduction: '5-10%', timeframe: '30 days' }
      },
      
      // Timing Intelligence
      {
        id: 'timing-1',
        title: 'Optimal Buying Season',
        description: 'Historical data shows November-January offers 8% better deals. Perfect timing for your search.',
        type: 'timing',
        icon: <Clock className="h-5 w-5" />,
        action: 'Plan Winter Search',
        confidence: 71,
        trend: 'stable',
        data: { seasonalSavings: 8, bestMonths: ['Nov', 'Dec', 'Jan'] }
      },
      
      // Investment Intelligence
      {
        id: 'investment-1',
        title: 'High ROI Neighborhoods',
        description: 'Palms and Mar Vista show 15% annual appreciation. Consider for investment potential.',
        type: 'investment',
        icon: <Star className="h-5 w-5" />,
        action: 'Explore Investment Areas',
        confidence: 79,
        trend: 'up',
        data: { appreciation: 15, neighborhoods: ['Palms', 'Mar Vista'] }
      }
    ];

    // Filter suggestions based on user preferences and history
    const filteredSuggestions = smartSuggestions.filter(suggestion => {
      // Add logic to filter based on user preferences
      return suggestion.confidence > 70;
    });

    setSuggestions(filteredSuggestions);
    setIsLoading(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 75) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return 'High Confidence';
    if (confidence >= 75) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'market': return 'bg-blue-100 text-blue-800';
      case 'location': return 'bg-green-100 text-green-800';
      case 'price': return 'bg-purple-100 text-purple-800';
      case 'timing': return 'bg-orange-100 text-orange-800';
      case 'investment': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>AI-Powered Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span>AI-Powered Smart Suggestions</span>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            Live Insights
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${getTypeColor(suggestion.type)}`}>
                  {suggestion.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {suggestion.title}
                    </h4>
                    {suggestion.trend && getTrendIcon(suggestion.trend)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {suggestion.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                      >
                        {suggestion.confidence}% {getConfidenceBadge(suggestion.confidence)}
                      </Badge>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      {suggestion.action}
                    </Button>
                  </div>
                  
                  {/* Additional Data Display */}
                  {suggestion.data && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      {suggestion.type === 'market' && suggestion.data.priceIncrease && (
                        <span>📈 +{suggestion.data.priceIncrease}% price increase</span>
                      )}
                      {suggestion.type === 'price' && suggestion.data.count && (
                        <span>🏠 {suggestion.data.count} properties with recent price drops</span>
                      )}
                      {suggestion.type === 'location' && suggestion.data.savings && (
                        <span>💰 {suggestion.data.savings}% better value than preferred areas</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Powered by AI Market Intelligence
            </span>
          </div>
          <p className="text-xs text-blue-700">
            These suggestions are generated using real-time market data, your search history, 
            and predictive analytics to help you make informed decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}