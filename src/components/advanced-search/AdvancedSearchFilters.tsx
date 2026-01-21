import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnhancedAutoComplete from './EnhancedAutoComplete';
import SmartSearchSuggestions from './SmartSearchSuggestions';
import { 
  Search, 
  Filter, 
  Home, 
  DollarSign, 
  MapPin, 
  Sparkles,
  X,
  RefreshCw,
  Save,
  Zap
} from 'lucide-react';

interface SearchFilters {
  query: string;
  priceMin: number;
  priceMax: number;
  bedrooms: number[];
  bathrooms: number[];
  propertyTypes: string[];
  amenities: string[];
  location: string;
  radius: number;
  listingAge: number;
  keywords: string[];
}

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  type: string;
  amenities: string[];
  daysOnMarket: number;
  image: string;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
  resultCount: number;
}

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'market' | 'location' | 'price' | 'timing' | 'investment';
  action: string;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  data?: Record<string, unknown>;
}

export default function AdvancedSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    priceMin: 500000,
    priceMax: 3000000,
    bedrooms: [],
    bathrooms: [],
    propertyTypes: [],
    amenities: [],
    location: '',
    radius: 10,
    listingAge: 30,
    keywords: []
  });

  const [searchResults, setSearchResults] = useState<Property[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const propertyTypes = [
    'Single Family Home',
    'Condo',
    'Townhouse',
    'Multi-Family',
    'Land',
    'Commercial'
  ];

  const amenities = [
    'Pool', 'Gym', 'Parking', 'Balcony', 'Garden', 'Fireplace',
    'Air Conditioning', 'Hardwood Floors', 'Updated Kitchen', 'Walk-in Closet',
    'Laundry Room', 'Security System', 'Ocean View', 'Mountain View'
  ];

  const mockProperties: Property[] = [
    {
      id: '1',
      address: '123 Beverly Hills Dr, Beverly Hills, CA',
      price: 1250000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 2100,
      type: 'Single Family Home',
      amenities: ['Pool', 'Garden', 'Parking'],
      daysOnMarket: 15,
      image: '/api/placeholder/300/200'
    },
    {
      id: '2',
      address: '456 Santa Monica Blvd, Santa Monica, CA',
      price: 950000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1800,
      type: 'Condo',
      amenities: ['Ocean View', 'Gym', 'Balcony'],
      daysOnMarket: 8,
      image: '/api/placeholder/300/200'
    },
    {
      id: '3',
      address: '789 Hollywood Hills Rd, Hollywood, CA',
      price: 1800000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2800,
      type: 'Single Family Home',
      amenities: ['Pool', 'Mountain View', 'Fireplace', 'Updated Kitchen'],
      daysOnMarket: 22,
      image: '/api/placeholder/300/200'
    }
  ];

  const updateActiveFilters = useCallback(() => {
    const active: string[] = [];
    
    if (filters.priceMin > 500000 || filters.priceMax < 3000000) {
      active.push(`$${(filters.priceMin/1000)}K - $${(filters.priceMax/1000)}K`);
    }
    if (filters.bedrooms.length > 0) {
      active.push(`${filters.bedrooms.join(', ')} bed`);
    }
    if (filters.bathrooms.length > 0) {
      active.push(`${filters.bathrooms.join(', ')} bath`);
    }
    if (filters.propertyTypes.length > 0) {
      active.push(`${filters.propertyTypes.length} property type${filters.propertyTypes.length > 1 ? 's' : ''}`);
    }
    if (filters.amenities.length > 0) {
      active.push(`${filters.amenities.length} amenities`);
    }
    if (filters.location) {
      active.push(`Near ${filters.location}`);
    }
    if (filters.radius !== 10) {
      active.push(`${filters.radius} mile radius`);
    }
    if (filters.listingAge !== 30) {
      active.push(`Listed within ${filters.listingAge} days`);
    }
    
    setActiveFilters(active);
  }, [filters]);

  useEffect(() => {
    updateActiveFilters();
  }, [filters, updateActiveFilters]);

  const handleSearch = async (query?: string, additionalFilters?: Partial<SearchFilters>) => {
    setIsSearching(true);
    
    // Update filters if additional filters provided
    if (additionalFilters) {
      setFilters(prev => ({ ...prev, ...additionalFilters }));
    }
    
    if (query) {
      setFilters(prev => ({ ...prev, query }));
    }

    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Filter mock properties based on current filters
    const filtered = mockProperties.filter(property => {
      // Price filter
      if (property.price < filters.priceMin || property.price > filters.priceMax) {
        return false;
      }
      
      // Bedrooms filter
      if (filters.bedrooms.length > 0 && !filters.bedrooms.includes(property.bedrooms)) {
        return false;
      }
      
      // Bathrooms filter
      if (filters.bathrooms.length > 0 && !filters.bathrooms.includes(property.bathrooms)) {
        return false;
      }
      
      // Property type filter
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(property.type)) {
        return false;
      }
      
      // Amenities filter
      if (filters.amenities.length > 0) {
        const hasRequiredAmenities = filters.amenities.some(amenity => 
          property.amenities.includes(amenity)
        );
        if (!hasRequiredAmenities) return false;
      }
      
      // Listing age filter
      if (property.daysOnMarket > filters.listingAge) {
        return false;
      }
      
      return true;
    });

    setSearchResults(filtered);
    setIsSearching(false);
  };

  const clearAllFilters = () => {
    setFilters({
      query: '',
      priceMin: 500000,
      priceMax: 3000000,
      bedrooms: [],
      bathrooms: [],
      propertyTypes: [],
      amenities: [],
      location: '',
      radius: 10,
      listingAge: 30,
      keywords: []
    });
    setSearchResults([]);
  };

  const removeFilter = (filterToRemove: string) => {
    // Logic to remove specific filter
    if (filterToRemove.includes('bed')) {
      setFilters(prev => ({ ...prev, bedrooms: [] }));
    } else if (filterToRemove.includes('bath')) {
      setFilters(prev => ({ ...prev, bathrooms: [] }));
    } else if (filterToRemove.includes('property type')) {
      setFilters(prev => ({ ...prev, propertyTypes: [] }));
    } else if (filterToRemove.includes('amenities')) {
      setFilters(prev => ({ ...prev, amenities: [] }));
    } else if (filterToRemove.includes('Near')) {
      setFilters(prev => ({ ...prev, location: '' }));
    } else if (filterToRemove.includes('radius')) {
      setFilters(prev => ({ ...prev, radius: 10 }));
    } else if (filterToRemove.includes('Listed within')) {
      setFilters(prev => ({ ...prev, listingAge: 30 }));
    } else if (filterToRemove.includes('$')) {
      setFilters(prev => ({ ...prev, priceMin: 500000, priceMax: 3000000 }));
    }
  };

  const saveCurrentSearch = () => {
    const searchName = `Search ${savedSearches.length + 1}`;
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
      resultCount: searchResults.length
    };
    
    setSavedSearches(prev => [...prev, newSearch]);
    
    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    saved.push(newSearch);
    localStorage.setItem('savedSearches', JSON.stringify(saved));
  };

  const handleSmartSuggestionClick = (suggestion: SmartSuggestion) => {
    // Apply suggestion to filters
    switch (suggestion.type) {
      case 'location':
        setFilters(prev => ({ ...prev, location: suggestion.title.replace('Hidden Gem: ', '') }));
        break;
      case 'price':
        if (suggestion.title.includes('Sweet Spot')) {
          setFilters(prev => ({ ...prev, priceMin: 1100000, priceMax: 1300000 }));
        }
        break;
      case 'market':
        if (suggestion.title.includes('Beverly Hills')) {
          setFilters(prev => ({ ...prev, location: 'Beverly Hills' }));
        } else if (suggestion.title.includes('Santa Monica')) {
          setFilters(prev => ({ ...prev, location: 'Santa Monica' }));
        }
        break;
    }
    
    // Trigger search with new filters
    handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold">Smart Property Search</h3>
              <Badge variant="secondary">AI-Powered</Badge>
            </div>
            
            <EnhancedAutoComplete
              placeholder="Search by location, property type, price range, or features..."
              onSearch={handleSearch}
              className="w-full"
            />
            
            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-sm text-gray-600 mr-2">Active filters:</span>
                {activeFilters.map((filter, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => removeFilter(filter)}
                  >
                    {filter}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filters">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="suggestions">
                <Zap className="h-4 w-4 mr-2" />
                AI Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="filters" className="space-y-4">
              {/* Price Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Price Range</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Price</Label>
                      <Input
                        type="number"
                        value={filters.priceMin}
                        onChange={(e) => setFilters(prev => ({ ...prev, priceMin: parseInt(e.target.value) || 0 }))}
                        placeholder="500,000"
                      />
                    </div>
                    <div>
                      <Label>Max Price</Label>
                      <Input
                        type="number"
                        value={filters.priceMax}
                        onChange={(e) => setFilters(prev => ({ ...prev, priceMax: parseInt(e.target.value) || 0 }))}
                        placeholder="3,000,000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Price Range: ${(filters.priceMin/1000)}K - ${(filters.priceMax/1000)}K</Label>
                    <Slider
                      value={[filters.priceMin, filters.priceMax]}
                      onValueChange={([min, max]) => setFilters(prev => ({ ...prev, priceMin: min, priceMax: max }))}
                      max={5000000}
                      min={200000}
                      step={50000}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Bedrooms & Bathrooms */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="h-4 w-4" />
                    <span>Bedrooms & Bathrooms</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Bedrooms</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map(num => (
                        <Button
                          key={num}
                          variant={filters.bedrooms.includes(num) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newBedrooms = filters.bedrooms.includes(num)
                              ? filters.bedrooms.filter(b => b !== num)
                              : [...filters.bedrooms, num];
                            setFilters(prev => ({ ...prev, bedrooms: newBedrooms }));
                          }}
                        >
                          {num}+
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Bathrooms</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[1, 2, 3, 4].map(num => (
                        <Button
                          key={num}
                          variant={filters.bathrooms.includes(num) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newBathrooms = filters.bathrooms.includes(num)
                              ? filters.bathrooms.filter(b => b !== num)
                              : [...filters.bathrooms, num];
                            setFilters(prev => ({ ...prev, bathrooms: newBathrooms }));
                          }}
                        >
                          {num}+
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Property Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {propertyTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={filters.propertyTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, propertyTypes: [...prev.propertyTypes, type] }));
                            } else {
                              setFilters(prev => ({ ...prev, propertyTypes: prev.propertyTypes.filter(t => t !== type) }));
                            }
                          }}
                        />
                        <Label htmlFor={type} className="text-sm">{type}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map(amenity => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity}
                          checked={filters.amenities.includes(amenity)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, amenities: [...prev.amenities, amenity] }));
                            } else {
                              setFilters(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== amenity) }));
                            }
                          }}
                        />
                        <Label htmlFor={amenity} className="text-xs">{amenity}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Search Actions */}
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleSearch()} 
                  className="flex-1"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search Properties
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={saveCurrentSearch}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="suggestions">
              <SmartSearchSuggestions
                userPreferences={filters}
                searchHistory={[]}
                onSuggestionClick={handleSmartSuggestionClick}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Search Results ({searchResults.length})</span>
                {searchResults.length > 0 && (
                  <Badge variant="secondary">
                    {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} applied
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-600">Searching properties...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map(property => (
                    <div key={property.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <img
                        src={property.image}
                        alt={property.address}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                      <div className="space-y-2">
                        <div className="font-semibold text-lg text-blue-600">
                          ${property.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {property.bedrooms} bed • {property.bathrooms} bath • {property.sqft.toLocaleString()} sqft
                        </div>
                        <div className="text-sm text-gray-700">{property.address}</div>
                        <div className="flex flex-wrap gap-1">
                          {property.amenities.slice(0, 3).map(amenity => (
                            <Badge key={amenity} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Listed {property.daysOnMarket} days ago
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Find Your Dream Home?</h3>
                  <p className="text-gray-600 mb-4">
                    Use our enhanced search to find properties that match your exact needs.
                  </p>
                  <Button onClick={() => handleSearch()}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Smart Search
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}