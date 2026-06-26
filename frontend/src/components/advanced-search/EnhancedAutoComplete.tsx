import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Star,
  Building,
  Home,
  DollarSign,
  X,
  Sparkles
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'location' | 'property' | 'feature' | 'price' | 'recent' | 'trending';
  text: string;
  subtitle?: string;
  icon: React.ReactNode;
  category: string;
  popularity?: number;
  isRecent?: boolean;
}

interface SearchFilters {
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  location?: string;
}

interface EnhancedAutoCompleteProps {
  placeholder?: string;
  onSearch: (query: string, filters?: SearchFilters) => void;
  className?: string;
}

const extractPrice = (query: string): string => {
  const match = query.match(/(\d+(?:\.\d+)?)\s*(k|million|\$)/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2];
    if (unit === 'k') return `$${num}K`;
    if (unit === 'million') return `$${num}M`;
    return `$${num}`;
  }
  return query;
};

const generateSmartSuggestions = (searchQuery: string): Suggestion[] => {
  const q = searchQuery.toLowerCase();
  const suggestions: Suggestion[] = [];

  // Price pattern detection
  if (q.match(/\d+k|\$\d+|\d+\s*million/)) {
    suggestions.push({
      id: 'smart-price',
      type: 'price',
      text: `Properties under ${extractPrice(q)}`,
      subtitle: 'Price-based search',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'Smart Suggestion'
    });
  }

  // Bedroom pattern detection
  if (q.match(/\d+\s*(bed|bedroom)/)) {
    const beds = q.match(/(\d+)\s*(bed|bedroom)/)?.[1];
    suggestions.push({
      id: 'smart-beds',
      type: 'feature',
      text: `${beds} Bedroom Properties`,
      subtitle: 'Filtered by bedrooms',
      icon: <Home className="h-4 w-4" />,
      category: 'Smart Suggestion'
    });
  }

  // Location pattern detection
  if (q.includes('near') || q.includes('close to')) {
    suggestions.push({
      id: 'smart-location',
      type: 'location',
      text: `Properties ${q}`,
      subtitle: 'Location-based search',
      icon: <MapPin className="h-4 w-4" />,
      category: 'Smart Suggestion'
    });
  }

  return suggestions;
};

// Mock data moved outside component to avoid dependency issues
const mockSuggestions: Suggestion[] = [
  // Locations
  {
    id: '1',
    type: 'location',
    text: 'Beverly Hills, CA',
    subtitle: '1,247 properties',
    icon: <MapPin className="h-4 w-4" />,
    category: 'Location',
    popularity: 95
  },
  {
    id: '2',
    type: 'location',
    text: 'Santa Monica, CA',
    subtitle: '892 properties',
    icon: <MapPin className="h-4 w-4" />,
    category: 'Location',
    popularity: 88
  },
  {
    id: '3',
    type: 'location',
    text: 'Hollywood Hills, CA',
    subtitle: '654 properties',
    icon: <MapPin className="h-4 w-4" />,
    category: 'Location',
    popularity: 82
  },
  // Property Types
  {
    id: '4',
    type: 'property',
    text: 'Single Family Homes',
    subtitle: 'Starting from $850K',
    icon: <Home className="h-4 w-4" />,
    category: 'Property Type',
    popularity: 90
  },
  {
    id: '5',
    type: 'property',
    text: 'Luxury Condos',
    subtitle: 'High-rise living',
    icon: <Building className="h-4 w-4" />,
    category: 'Property Type',
    popularity: 75
  },
  // Price Ranges
  {
    id: '6',
    type: 'price',
    text: '$800K - $1.2M',
    subtitle: '423 properties',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Price Range',
    popularity: 85
  },
  {
    id: '7',
    type: 'price',
    text: '$1.2M - $2M',
    subtitle: '287 properties',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'Price Range',
    popularity: 70
  },
  // Features
  {
    id: '8',
    type: 'feature',
    text: 'Pool & Spa',
    subtitle: 'Luxury amenities',
    icon: <Sparkles className="h-4 w-4" />,
    category: 'Features',
    popularity: 65
  },
  {
    id: '9',
    type: 'feature',
    text: 'Ocean View',
    subtitle: 'Premium locations',
    icon: <Star className="h-4 w-4" />,
    category: 'Features',
    popularity: 78
  }
];

export default function EnhancedAutoComplete({ 
  placeholder = "Search by location, property type, price range...", 
  onSearch,
  className = ""
}: EnhancedAutoCompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (!query.trim()) {
      // Show recent searches and trending when no query
      const recentSuggestions: Suggestion[] = recentSearches.slice(0, 3).map((search, index) => ({
        id: `recent-${index}`,
        type: 'recent',
        text: search,
        icon: <Clock className="h-4 w-4" />,
        category: 'Recent',
        isRecent: true
      }));

      const trendingSuggestions: Suggestion[] = mockSuggestions
        .filter(s => s.popularity && s.popularity > 80)
        .slice(0, 4)
        .map(s => ({ ...s, type: 'trending' as const }));

      setSuggestions([...recentSuggestions, ...trendingSuggestions]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    const timer = setTimeout(() => {
      const filtered = mockSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(query.toLowerCase()) ||
        suggestion.subtitle?.toLowerCase().includes(query.toLowerCase())
      );

      // Add smart suggestions based on query patterns
      const smartSuggestions = generateSmartSuggestions(query);
      
      setSuggestions([...smartSuggestions, ...filtered].slice(0, 8));
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, recentSearches]);
  
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    
    // Add to recent searches
    const newRecent = [suggestion.text, ...recentSearches.filter(s => s !== suggestion.text)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    
    // Execute search with smart filters
    const filters = generateFiltersFromSuggestion(suggestion);
    onSearch(suggestion.text, filters);
  };

  const generateFiltersFromSuggestion = (suggestion: Suggestion): SearchFilters => {
    const filters: SearchFilters = {};
    
    switch (suggestion.type) {
      case 'price':
        if (suggestion.text.includes('$')) {
          const priceRange = suggestion.text.match(/\$(\d+(?:\.\d+)?[KM]?)\s*-\s*\$(\d+(?:\.\d+)?[KM]?)/);
          if (priceRange) {
            filters.priceMin = parsePrice(priceRange[1]);
            filters.priceMax = parsePrice(priceRange[2]);
          }
        }
        break;
      case 'property':
        if (suggestion.text.includes('Single Family')) filters.propertyType = 'house';
        if (suggestion.text.includes('Condo')) filters.propertyType = 'condo';
        break;
      case 'location':
        filters.location = suggestion.text;
        break;
    }
    
    return filters;
  };

  const parsePrice = (priceStr: string): number => {
    const num = parseFloat(priceStr);
    if (priceStr.includes('K')) return num * 1000;
    if (priceStr.includes('M')) return num * 1000000;
    return num;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      onSearch(query);
      setIsOpen(false);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const getSuggestionsByCategory = () => {
    const categories: { [key: string]: Suggestion[] } = {};
    suggestions.forEach(suggestion => {
      if (!categories[suggestion.category]) {
        categories[suggestion.category] = [];
      }
      categories[suggestion.category].push(suggestion);
    });
    return categories;
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-12 h-12 text-base"
        />
        <Button
          onClick={handleSearch}
          className="absolute right-1 top-1 h-10"
          size="sm"
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Finding suggestions...</p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="py-2">
                {Object.entries(getSuggestionsByCategory()).map(([category, categorySuggestions]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-4 py-2 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          {category}
                        </h4>
                        {category === 'Recent' && recentSearches.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearRecentSearches}
                            className="text-xs h-6 px-2"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Suggestions */}
                    {categorySuggestions.map((suggestion, index) => {
                      const globalIndex = suggestions.indexOf(suggestion);
                      return (
                        <div
                          key={suggestion.id}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-4 py-3 cursor-pointer transition-colors duration-150 ${
                            selectedIndex === globalIndex
                              ? 'bg-blue-50 border-r-2 border-blue-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`${
                              suggestion.type === 'trending' ? 'text-orange-500' :
                              suggestion.type === 'recent' ? 'text-gray-500' :
                              'text-blue-500'
                            }`}>
                              {suggestion.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {suggestion.text}
                                </p>
                                {suggestion.type === 'trending' && (
                                  <Badge variant="secondary" className="text-xs">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Trending
                                  </Badge>
                                )}
                                {suggestion.popularity && suggestion.popularity > 85 && (
                                  <Badge variant="outline" className="text-xs">
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              {suggestion.subtitle && (
                                <p className="text-xs text-gray-500 truncate">
                                  {suggestion.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-4 text-center">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No suggestions found</p>
                <p className="text-xs text-gray-500">Try searching for locations, property types, or price ranges</p>
              </div>
            ) : (
              <div className="p-4 text-center">
                <Sparkles className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Start typing to see suggestions</p>
                <p className="text-xs text-gray-500">Search by location, price, property type, or features</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}