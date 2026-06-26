import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  Bell,
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Home,
  MapPin,
  Bed,
  Bath,
  Maximize,
} from 'lucide-react';

interface SavedSearch {
  id: string;
  name: string;
  criteria: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    location?: string;
    minSqft?: number;
    maxSqft?: number;
  };
  alertsEnabled: boolean;
  createdDate: string;
  matchCount: number;
}

export function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: 'Family Home in Suburbs',
      criteria: {
        minPrice: 400000,
        maxPrice: 600000,
        bedrooms: 4,
        bathrooms: 2,
        propertyType: 'house',
        location: 'San Francisco Bay Area',
      },
      alertsEnabled: true,
      createdDate: '2024-01-15',
      matchCount: 12,
    },
    {
      id: '2',
      name: 'Downtown Condo',
      criteria: {
        minPrice: 300000,
        maxPrice: 500000,
        bedrooms: 2,
        bathrooms: 2,
        propertyType: 'condo',
        location: 'San Francisco',
      },
      alertsEnabled: true,
      createdDate: '2024-01-20',
      matchCount: 8,
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSearch, setNewSearch] = useState<Partial<SavedSearch>>({
    name: '',
    criteria: {},
    alertsEnabled: true,
  });

  const handleToggleAlerts = (searchId: string) => {
    setSearches((prev) =>
      prev.map((search) =>
        search.id === searchId
          ? { ...search, alertsEnabled: !search.alertsEnabled }
          : search
      )
    );
  };

  const handleDeleteSearch = (searchId: string) => {
    setSearches((prev) => prev.filter((search) => search.id !== searchId));
  };

  const handleCreateSearch = () => {
    if (!newSearch.name) {
      alert('Please enter a search name');
      return;
    }

    const search: SavedSearch = {
      id: Date.now().toString(),
      name: newSearch.name,
      criteria: newSearch.criteria || {},
      alertsEnabled: newSearch.alertsEnabled || false,
      createdDate: new Date().toISOString().split('T')[0],
      matchCount: 0,
    };

    setSearches((prev) => [...prev, search]);
    setNewSearch({ name: '', criteria: {}, alertsEnabled: true });
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Saved Searches
              </CardTitle>
              <CardDescription>
                Create custom searches and get notified when new properties match
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-2" />
              New Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <Card className="mb-6 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Create New Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search-name">Search Name</Label>
                  <Input
                    id="search-name"
                    placeholder="e.g., Family Home in Suburbs"
                    value={newSearch.name}
                    onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-price">Min Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="min-price"
                        type="number"
                        placeholder="300000"
                        className="pl-7"
                        value={newSearch.criteria?.minPrice || ''}
                        onChange={(e) =>
                          setNewSearch({
                            ...newSearch,
                            criteria: {
                              ...newSearch.criteria,
                              minPrice: parseInt(e.target.value) || undefined,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="max-price">Max Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="max-price"
                        type="number"
                        placeholder="600000"
                        className="pl-7"
                        value={newSearch.criteria?.maxPrice || ''}
                        onChange={(e) =>
                          setNewSearch({
                            ...newSearch,
                            criteria: {
                              ...newSearch.criteria,
                              maxPrice: parseInt(e.target.value) || undefined,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      placeholder="3"
                      value={newSearch.criteria?.bedrooms || ''}
                      onChange={(e) =>
                        setNewSearch({
                          ...newSearch,
                          criteria: {
                            ...newSearch.criteria,
                            bedrooms: parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      placeholder="2"
                      value={newSearch.criteria?.bathrooms || ''}
                      onChange={(e) =>
                        setNewSearch({
                          ...newSearch,
                          criteria: {
                            ...newSearch.criteria,
                            bathrooms: parseInt(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="property-type">Property Type</Label>
                    <select
                      id="property-type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={newSearch.criteria?.propertyType || ''}
                      onChange={(e) =>
                        setNewSearch({
                          ...newSearch,
                          criteria: {
                            ...newSearch.criteria,
                            propertyType: e.target.value || undefined,
                          },
                        })
                      }
                    >
                      <option value="">Any</option>
                      <option value="house">House</option>
                      <option value="condo">Condo</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="apartment">Apartment</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="City or Zip Code"
                      value={newSearch.criteria?.location || ''}
                      onChange={(e) =>
                        setNewSearch({
                          ...newSearch,
                          criteria: {
                            ...newSearch.criteria,
                            location: e.target.value || undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newSearch.alertsEnabled}
                      onCheckedChange={(checked) =>
                        setNewSearch({ ...newSearch, alertsEnabled: checked })
                      }
                    />
                    <Label>Enable email alerts for new matches</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateSearch}>Create Search</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saved Searches List */}
          <div className="space-y-4">
            {searches.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No saved searches yet</p>
                <p className="text-sm text-gray-500">
                  Create a search to get notified about new matching properties
                </p>
              </div>
            ) : (
              searches.map((search) => (
                <Card key={search.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{search.name}</h3>
                        <p className="text-sm text-gray-600">
                          Created on {new Date(search.createdDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSearch(search.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {search.criteria.minPrice && search.criteria.maxPrice && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${(search.criteria.minPrice / 1000).toFixed(0)}K - $
                          {(search.criteria.maxPrice / 1000).toFixed(0)}K
                        </Badge>
                      )}
                      {search.criteria.bedrooms && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          {search.criteria.bedrooms}+ Beds
                        </Badge>
                      )}
                      {search.criteria.bathrooms && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          {search.criteria.bathrooms}+ Baths
                        </Badge>
                      )}
                      {search.criteria.propertyType && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          {search.criteria.propertyType}
                        </Badge>
                      )}
                      {search.criteria.location && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {search.criteria.location}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={search.alertsEnabled}
                            onCheckedChange={() => handleToggleAlerts(search.id)}
                          />
                          <span className="text-sm text-gray-600">
                            {search.alertsEnabled ? 'Alerts On' : 'Alerts Off'}
                          </span>
                        </div>
                        <Badge className="bg-blue-600">
                          {search.matchCount} {search.matchCount === 1 ? 'Match' : 'Matches'}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm">
                        <Search className="w-4 h-4 mr-2" />
                        View Results
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}