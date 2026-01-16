import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Bell, 
  Bookmark, 
  Edit, 
  Trash2, 
  Plus,
  MapPin,
  DollarSign,
  Home,
  Mail
} from 'lucide-react';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  location: string;
  priceRange: [number, number];
  propertyType: string[];
  bedrooms: number;
  bathrooms: number;
  features: string[];
  alertsEnabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  createdAt: string;
  lastResults: number;
  newResults: number;
}

export default function SavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: 'Beverly Hills Luxury Condos',
      query: 'luxury condo',
      location: 'Beverly Hills',
      priceRange: [800000, 1500000],
      propertyType: ['Condo'],
      bedrooms: 2,
      bathrooms: 2,
      features: ['Pool', 'Garage', 'Ocean View'],
      alertsEnabled: true,
      frequency: 'daily',
      createdAt: '2024-08-15',
      lastResults: 23,
      newResults: 3
    },
    {
      id: '2',
      name: 'Santa Monica Family Homes',
      query: 'family home',
      location: 'Santa Monica',
      priceRange: [1000000, 2000000],
      propertyType: ['Single Family Home'],
      bedrooms: 3,
      bathrooms: 2,
      features: ['Garage', 'Updated Kitchen'],
      alertsEnabled: true,
      frequency: 'instant',
      createdAt: '2024-08-10',
      lastResults: 15,
      newResults: 1
    },
    {
      id: '3',
      name: 'Investment Properties',
      query: 'investment',
      location: 'Los Angeles',
      priceRange: [500000, 1000000],
      propertyType: ['Multi-Family', 'Single Family Home'],
      bedrooms: 0,
      bathrooms: 0,
      features: ['Investment Property'],
      alertsEnabled: false,
      frequency: 'weekly',
      createdAt: '2024-07-25',
      lastResults: 45,
      newResults: 0
    }
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');

  const toggleAlerts = (searchId: string) => {
    setSavedSearches(prev => 
      prev.map(search => 
        search.id === searchId 
          ? { ...search, alertsEnabled: !search.alertsEnabled }
          : search
      )
    );
  };

  const deleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== searchId));
  };

  const createNewSearch = () => {
    if (newSearchName.trim()) {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name: newSearchName,
        query: '',
        location: '',
        priceRange: [0, 2000000],
        propertyType: [],
        bedrooms: 0,
        bathrooms: 0,
        features: [],
        alertsEnabled: true,
        frequency: 'daily',
        createdAt: new Date().toISOString().split('T')[0],
        lastResults: 0,
        newResults: 0
      };
      
      setSavedSearches(prev => [newSearch, ...prev]);
      setNewSearchName('');
      setIsCreating(false);
    }
  };

  const runSearch = (search: SavedSearch) => {
    alert(`Running search: ${search.name}`);
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'instant': return 'bg-red-100 text-red-800';
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saved Searches</h2>
          <p className="text-gray-600">Get notified when new properties match your criteria</p>
        </div>
        
        {!isCreating ? (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Save Current Search
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search name..."
              value={newSearchName}
              onChange={(e) => setNewSearchName(e.target.value)}
              className="w-48"
            />
            <Button onClick={createNewSearch} size="sm">
              Save
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsCreating(false);
                setNewSearchName('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Saved Searches List */}
      <div className="space-y-4">
        {savedSearches.map((search) => (
          <Card key={search.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{search.name}</h3>
                    {search.newResults > 0 && (
                      <Badge className="bg-red-100 text-red-800">
                        {search.newResults} New
                      </Badge>
                    )}
                    <Badge className={getFrequencyColor(search.frequency)}>
                      {search.frequency}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4" />
                      <span>{search.query || 'Any'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{search.location || 'Any Location'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>${search.priceRange[0].toLocaleString()} - ${search.priceRange[1].toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4" />
                      <span>
                        {search.bedrooms > 0 ? `${search.bedrooms}+ bed` : 'Any beds'}, 
                        {search.bathrooms > 0 ? ` ${search.bathrooms}+ bath` : ' any baths'}
                      </span>
                    </div>
                  </div>

                  {/* Property Types */}
                  {search.propertyType.length > 0 && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-sm text-gray-600">Types:</span>
                      <div className="flex flex-wrap gap-1">
                        {search.propertyType.map(type => (
                          <Badge key={type} variant="outline" size="sm">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  {search.features.length > 0 && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-sm text-gray-600">Features:</span>
                      <div className="flex flex-wrap gap-1">
                        {search.features.slice(0, 3).map(feature => (
                          <Badge key={feature} variant="outline" size="sm">
                            {feature}
                          </Badge>
                        ))}
                        {search.features.length > 3 && (
                          <Badge variant="outline" size="sm">
                            +{search.features.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Search Stats */}
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span>Created: {new Date(search.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{search.lastResults} properties found</span>
                    {search.newResults > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-600 font-medium">{search.newResults} new matches</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Email Alerts Toggle */}
                  <div className="flex items-center space-x-2">
                    <Bell className={`h-4 w-4 ${search.alertsEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                    <Switch
                      checked={search.alertsEnabled}
                      onCheckedChange={() => toggleAlerts(search.id)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => runSearch(search)}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => deleteSearch(search.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Alert Settings */}
              {search.alertsEnabled && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Email alerts enabled - {search.frequency} notifications
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {savedSearches.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Searches</h3>
            <p className="text-gray-600 mb-4">
              Save your search criteria to get notified when new properties match your preferences.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Saved Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}