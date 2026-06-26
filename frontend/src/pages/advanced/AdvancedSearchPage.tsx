import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedSearchFilters from '@/components/advanced-search/AdvancedSearchFilters';
import SavedSearches from '@/components/advanced-search/SavedSearches';
import MapSearchInterface from '@/components/advanced-search/MapSearchInterface';
import PropertyClusterView from '@/components/advanced-search/PropertyClusterView';
import { Search, Bookmark, BarChart3, MapPin } from 'lucide-react';

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  type: string;
  lat: number;
  lng: number;
  image: string;
}

export default function AdvancedSearchPage() {
  const [foundProperties, setFoundProperties] = useState<Property[]>([]);
  const [centerLocation, setCenterLocation] = useState({ lat: 34.0522, lng: -118.2437 });

  const handlePropertiesFound = (properties: Property[]) => {
    setFoundProperties(properties);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Property Search</h1>
          <p className="text-gray-600">Find your perfect property with powerful search and filtering tools</p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Advanced Search</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Map Search</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center space-x-2">
              <Bookmark className="h-4 w-4" />
              <span>Saved Searches</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Search Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <AdvancedSearchFilters />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MapSearchInterface onPropertiesFound={handlePropertiesFound} />
              </div>
              <div className="lg:col-span-1">
                <PropertyClusterView 
                  properties={foundProperties} 
                  centerLocation={centerLocation}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <SavedSearches />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-900">Total Searches</h4>
                        <p className="text-2xl font-bold text-blue-600">247</p>
                        <p className="text-sm text-blue-700">This month</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-900">Avg. Results</h4>
                        <p className="text-2xl font-bold text-green-600">18</p>
                        <p className="text-sm text-green-700">Per search</p>
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900">Most Popular Filters</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm">Price Range</span>
                          <span className="text-sm font-medium">89%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Location</span>
                          <span className="text-sm font-medium">76%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Bedrooms</span>
                          <span className="text-sm font-medium">65%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geographic Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-900">Top Search Areas</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Beverly Hills</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-orange-200 rounded">
                              <div className="w-3/4 h-2 bg-orange-500 rounded"></div>
                            </div>
                            <span className="text-sm font-medium">45%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Santa Monica</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-orange-200 rounded">
                              <div className="w-2/3 h-2 bg-orange-500 rounded"></div>
                            </div>
                            <span className="text-sm font-medium">32%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Hollywood</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-orange-200 rounded">
                              <div className="w-1/2 h-2 bg-orange-500 rounded"></div>
                            </div>
                            <span className="text-sm font-medium">23%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900">Search Radius Trends</h4>
                      <div className="mt-2">
                        <div className="text-2xl font-bold text-indigo-600">8.3 miles</div>
                        <div className="text-sm text-indigo-700">Average search radius</div>
                        <div className="text-xs text-indigo-600 mt-1">↑ 12% from last month</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Search Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {[65, 78, 82, 95, 88, 92, 105, 98, 87, 93, 89, 96].map((height, index) => (
                    <div key={index} className="flex-1 bg-blue-200 rounded-t" style={{ height: `${height}%` }}>
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: '60%' }}></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                  <span>Nov</span>
                  <span>Dec</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}