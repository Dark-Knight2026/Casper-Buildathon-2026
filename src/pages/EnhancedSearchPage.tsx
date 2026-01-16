import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Map, 
  List, 
  Filter, 
  BarChart3, 
  Bookmark, 
  Search,
  SlidersHorizontal,
  Maximize2,
  Grid3X3
} from 'lucide-react';
import { Property } from '@/types/property';
import { mockProperties } from '@/data/mockProperties';
import PropertyCard from '@/components/PropertyCard';
import PropertyModal from '@/components/PropertyModal';
import MapView from '@/components/map/MapView';
import AdvancedFilters, { FilterCriteria } from '@/components/filters/AdvancedFilters';
import PropertyComparison from '@/components/comparison/PropertyComparison';
import SavedSearches from '@/components/search/SavedSearches';

export default function EnhancedSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties] = useState<Property[]>(mockProperties);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(mockProperties);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [comparisonList, setComparisonList] = useState<Property[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'map' | 'comparison'>('list');
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'rating' | 'newest'>('newest');

  const sortProperties = useCallback((properties: Property[], sortBy: string) => {
    const sorted = [...properties];
    
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'newest':
        return sorted.sort((a, b) => b.id - a.id);
      default:
        return sorted;
    }
  }, []);

  // Apply filters to properties
  const applyFilters = useCallback((filters: FilterCriteria) => {
    let filtered = [...properties];

    // Price range filter
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000)) {
      filtered = filtered.filter(p => 
        p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
      );
    }

    // Property type filter
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      filtered = filtered.filter(p => 
        filters.propertyTypes.includes(p.propertyType || 'apartment')
      );
    }

    // Bedrooms filter
    if (filters.bedrooms && filters.bedrooms !== 'any') {
      const minBedrooms = parseInt(filters.bedrooms.replace('+', ''));
      filtered = filtered.filter(p => p.bedrooms >= minBedrooms);
    }

    // Bathrooms filter
    if (filters.bathrooms && filters.bathrooms !== 'any') {
      const minBathrooms = parseFloat(filters.bathrooms.replace('+', ''));
      filtered = filtered.filter(p => p.bathrooms >= minBathrooms);
    }

    // Square footage filter
    if (filters.sqftRange && (filters.sqftRange[0] > 0 || filters.sqftRange[1] < 5000)) {
      filtered = filtered.filter(p => 
        p.sqft >= filters.sqftRange[0] && p.sqft <= filters.sqftRange[1]
      );
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      filtered = filtered.filter(p => 
        filters.amenities.some(amenity => 
          p.amenities.some(pAmenity => 
            pAmenity.toLowerCase().includes(amenity.toLowerCase())
          )
        )
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(p => 
        p.address.toLowerCase().includes(filters.location.toLowerCase()) ||
        p.title.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Rating filter
    if (filters.rating && filters.rating > 0) {
      filtered = filtered.filter(p => p.rating >= filters.rating);
    }

    // Keywords filter
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(keywords) ||
        p.description.toLowerCase().includes(keywords) ||
        p.address.toLowerCase().includes(keywords) ||
        p.amenities.some(amenity => amenity.toLowerCase().includes(keywords))
      );
    }

    // Pet friendly filter
    if (filters.petFriendly) {
      filtered = filtered.filter(p => 
        p.amenities.some(amenity => 
          amenity.toLowerCase().includes('pet') || 
          amenity.toLowerCase().includes('dog') || 
          amenity.toLowerCase().includes('cat')
        )
      );
    }

    // Apply sorting
    filtered = sortProperties(filtered, sortBy);

    setFilteredProperties(filtered);
  }, [properties, sortBy, sortProperties]);

  // Initialize from URL params
  useEffect(() => {
    const view = searchParams.get('view') as 'list' | 'map' | 'comparison';
    if (view) setCurrentView(view);
    
    const search = searchParams.get('search');
    if (search) {
      // Apply search filter
      applyFilters({ keywords: search } as FilterCriteria);
    }
  }, [searchParams, applyFilters]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setIsPropertyModalOpen(true);
  };

  const handleFavorite = (propertyId: number) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleAddToComparison = (property: Property) => {
    if (comparisonList.length >= 4) return;
    if (comparisonList.find(p => p.id === property.id)) return;
    
    setComparisonList(prev => [...prev, property]);
  };

  const handleRemoveFromComparison = (propertyId: number) => {
    setComparisonList(prev => prev.filter(p => p.id !== propertyId));
  };

  const handleViewChange = (view: 'list' | 'map' | 'comparison') => {
    setCurrentView(view);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', view);
      return newParams;
    });
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
    setFilteredProperties(prev => sortProperties(prev, newSortBy));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Property Search</h1>
            <p className="text-gray-600 mt-1">
              {filteredProperties.length} properties found
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant={currentView === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={currentView === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange('map')}
            >
              <Map className="h-4 w-4 mr-1" />
              Map
            </Button>
            <Button
              variant={currentView === 'comparison' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleViewChange('comparison')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Compare
              {comparisonList.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {comparisonList.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <AdvancedFilters
                onFiltersChange={applyFilters}
                isCollapsed={isFiltersCollapsed}
                onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
              />
              
              <SavedSearches
                onRunSearch={applyFilters}
                onCreateSearch={(filters) => {
                  // Handle create search logic
                  console.log('Create search with filters:', filters);
                }}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Sort Controls */}
              {currentView !== 'comparison' && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">Sort by:</span>
                        <select 
                          value={sortBy} 
                          onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                          className="text-sm border rounded-md px-3 py-1"
                        >
                          <option value="newest">Newest First</option>
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                          <option value="rating">Highest Rated</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                          className="lg:hidden"
                        >
                          <SlidersHorizontal className="h-4 w-4 mr-1" />
                          Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Views */}
              {currentView === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProperties.map((property) => (
                    <div key={property.id} className="relative">
                      <PropertyCard
                        property={property}
                        onViewDetails={handlePropertySelect}
                        onFavorite={handleFavorite}
                        isFavorited={favorites.includes(property.id)}
                      />
                      
                      {/* Comparison Toggle */}
                      <div className="absolute top-2 left-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => 
                            comparisonList.find(p => p.id === property.id)
                              ? handleRemoveFromComparison(property.id)
                              : handleAddToComparison(property)
                          }
                          disabled={comparisonList.length >= 4 && !comparisonList.find(p => p.id === property.id)}
                        >
                          <BarChart3 className={`h-4 w-4 ${
                            comparisonList.find(p => p.id === property.id) 
                              ? 'text-blue-600' 
                              : 'text-gray-600'
                          }`} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentView === 'map' && (
                <MapView
                  properties={filteredProperties}
                  selectedProperty={selectedProperty}
                  onPropertySelect={handlePropertySelect}
                  isFullscreen={isMapFullscreen}
                  onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
                  className="h-[600px]"
                />
              )}

              {currentView === 'comparison' && (
                <PropertyComparison
                  properties={comparisonList}
                  onRemoveProperty={handleRemoveFromComparison}
                  onAddProperty={() => handleViewChange('list')}
                />
              )}

              {/* Empty State */}
              {filteredProperties.length === 0 && currentView !== 'comparison' && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
                    <p className="text-gray-600 text-center mb-4">
                      Try adjusting your search criteria or filters to find more properties
                    </p>
                    <Button onClick={() => applyFilters({} as FilterCriteria)}>
                      Clear All Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Property Modal */}
      <PropertyModal
        property={selectedProperty}
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        onFavorite={handleFavorite}
        isFavorited={selectedProperty ? favorites.includes(selectedProperty.id) : false}
      />
    </div>
  );
}