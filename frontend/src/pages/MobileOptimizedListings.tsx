// DEAD CODE (kept intentionally, not yet removed): this page has no route in
// App.tsx and is not imported by any live code (only mentioned in a comment in
// data/mockProperties.ts). It is the sole consumer of the Mobile* component
// family (MobileNavigation, MobileSearchBar, MobileFilterDrawer,
// MobilePropertyList, MobileComparisonView), which are therefore dead too.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '@/types/property';
import { mockProperties } from '@/data/mockProperties';
import MobileNavigation from '@/components/mobile/MobileNavigation';
import MobileSearchBar from '@/components/mobile/MobileSearchBar';
import MobileFilterDrawer from '@/components/mobile/MobileFilterDrawer';
import MobilePropertyList from '@/components/mobile/MobilePropertyList';
import MobileComparisonView from '@/components/mobile/MobileComparisonView';
import PropertyModal from '@/components/PropertyModal';
import { FilterCriteria } from '@/components/filters/AdvancedFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { List, BarChart3 } from 'lucide-react';

export default function MobileOptimizedListings() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(mockProperties);
  const [displayedProperties, setDisplayedProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [comparisonList, setComparisonList] = useState<Property[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'comparison'>('list');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterCriteria | null>(null);

  const ITEMS_PER_PAGE = 10;

  const recentSearches = [
    'Downtown apartments',
    'Pet friendly houses',
    'Luxury condos',
    'Near subway'
  ];

  const trendingSearches = [
    'Studio apartments',
    'Furnished',
    'Under $2000',
    'Pool access',
    'Parking included'
  ];

  // Initialize displayed properties
  useEffect(() => {
    setDisplayedProperties(filteredProperties.slice(0, ITEMS_PER_PAGE));
    setPage(1);
  }, [filteredProperties]);

  // Load more properties
  const handleLoadMore = () => {
    if (isLoading) return;

    setIsLoading(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newProperties = filteredProperties.slice(startIndex, endIndex);
      
      setDisplayedProperties(prev => [...prev, ...newProperties]);
      setPage(nextPage);
      setIsLoading(false);
    }, 500);
  };

  // Refresh properties
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDisplayedProperties(filteredProperties.slice(0, ITEMS_PER_PAGE));
      setPage(1);
      setIsLoading(false);
    }, 1000);
  };

  // Apply search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFiltersAndSearch(activeFilters, query);
  };

  // Apply filters
  const handleFiltersChange = (filters: FilterCriteria) => {
    setActiveFilters(filters);
    applyFiltersAndSearch(filters, searchQuery);
  };

  // Combined filter and search logic
  const applyFiltersAndSearch = (filters: FilterCriteria | null, query: string) => {
    let filtered = [...properties];

    // Apply search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.address.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.amenities.some(a => a.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000)) {
        filtered = filtered.filter(p =>
          p.rent >= filters.priceRange[0] && p.rent <= filters.priceRange[1]
        );
      }

      if (filters.propertyTypes && filters.propertyTypes.length > 0) {
        filtered = filtered.filter(p =>
          filters.propertyTypes.includes(p.propertyType || 'apartment')
        );
      }

      if (filters.bedrooms && filters.bedrooms !== 'any') {
        const minBedrooms = parseInt(filters.bedrooms.replace('+', ''));
        filtered = filtered.filter(p => p.bedrooms >= minBedrooms);
      }

      if (filters.bathrooms && filters.bathrooms !== 'any') {
        const minBathrooms = parseFloat(filters.bathrooms.replace('+', ''));
        filtered = filtered.filter(p => p.bathrooms >= minBathrooms);
      }

      if (filters.amenities && filters.amenities.length > 0) {
        filtered = filtered.filter(p =>
          filters.amenities.some(amenity =>
            p.amenities.some(pAmenity =>
              pAmenity.toLowerCase().includes(amenity.toLowerCase())
            )
          )
        );
      }

      // Rating filter: canonical `Property` has no `rating` — skip on this
      // dead route until/if a buyer rating signal is introduced server-side.
    }

    setFilteredProperties(filtered);
  };

  // Property actions
  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setIsPropertyModalOpen(true);
  };

  const handleFavorite = (propertyId: string) => {
    setFavorites(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleCompare = (property: Property) => {
    if (comparisonList.length >= 4) return;
    if (comparisonList.find(p => p.id === property.id)) {
      setComparisonList(prev => prev.filter(p => p.id !== property.id));
    } else {
      setComparisonList(prev => [...prev, property]);
    }
  };

  const handleRemoveFromComparison = (propertyId: string) => {
    setComparisonList(prev => prev.filter(p => p.id !== propertyId));
  };

  const getActiveFiltersCount = () => {
    if (!activeFilters) return 0;
    
    let count = 0;
    if (activeFilters.priceRange[0] > 0 || activeFilters.priceRange[1] < 10000) count++;
    if (activeFilters.propertyTypes.length > 0) count++;
    if (activeFilters.bedrooms !== 'any') count++;
    if (activeFilters.bathrooms !== 'any') count++;
    if (activeFilters.amenities.length > 0) count++;
    if (activeFilters.rating > 0) count++;
    if (activeFilters.petFriendly) count++;
    if (activeFilters.furnished) count++;
    
    return count;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <MobileNavigation
        unreadMessages={3}
        unreadNotifications={5}
        favoriteCount={favorites.length}
      />

      {/* Main Content */}
      <div className="pb-20">
        {/* Search Section */}
        <div className="bg-white p-4 shadow-sm sticky top-14 z-30">
          <MobileSearchBar
            onSearch={handleSearch}
            onVoiceSearch={() => console.log('Voice search')}
            recentSearches={recentSearches}
            trendingSearches={trendingSearches}
          />

          <div className="flex items-center justify-between mt-4">
            <MobileFilterDrawer
              onFiltersChange={handleFiltersChange}
              initialFilters={activeFilters || undefined}
              activeFiltersCount={getActiveFiltersCount()}
            />

            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {filteredProperties.length} properties
              </Badge>
              {comparisonList.length > 0 && (
                <Badge className="bg-blue-600">
                  {comparisonList.length} to compare
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'list' | 'comparison')} className="w-full">
          <div className="bg-white border-b sticky top-[180px] z-20">
            <TabsList className="w-full grid grid-cols-2 h-12">
              <TabsTrigger value="list" className="flex items-center">
                <List className="h-4 w-4 mr-2" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare
                {comparisonList.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {comparisonList.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="mt-0">
            <MobilePropertyList
              properties={displayedProperties}
              onViewDetails={handleViewDetails}
              onFavorite={handleFavorite}
              onCompare={handleCompare}
              favorites={favorites}
              comparisonList={comparisonList}
              onLoadMore={handleLoadMore}
              hasMore={displayedProperties.length < filteredProperties.length}
              isLoading={isLoading}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="comparison" className="mt-0">
            <MobileComparisonView
              properties={comparisonList}
              onRemoveProperty={handleRemoveFromComparison}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        </Tabs>
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