import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Bell, 
  Trash2, 
  Edit, 
  Plus, 
  Star,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { FilterCriteria } from '../filters/AdvancedFilters';

interface SavedSearch {
  id: string;
  name: string;
  filters: FilterCriteria;
  alertsEnabled: boolean;
  createdAt: Date;
  lastRun: Date;
  resultCount: number;
  newResultsCount: number;
}

interface SavedSearchesProps {
  onRunSearch: (filters: FilterCriteria) => void;
  onCreateSearch: (filters: FilterCriteria) => void;
  className?: string;
}

// Mock saved searches data
const mockSavedSearches: SavedSearch[] = [
  {
    id: '1',
    name: 'Downtown Apartments',
    filters: {
      priceRange: [1500, 3000],
      propertyTypes: ['apartment'],
      bedrooms: '2',
      bathrooms: '1',
      sqftRange: [800, 1200],
      amenities: ['wifi', 'parking'],
      location: 'Downtown',
      availableFrom: '',
      rating: 4,
      petFriendly: false,
      furnished: false,
      utilities: [],
      leaseTerms: [],
      keywords: ''
    },
    alertsEnabled: true,
    createdAt: new Date('2024-01-15'),
    lastRun: new Date('2024-01-20'),
    resultCount: 23,
    newResultsCount: 3
  },
  {
    id: '2',
    name: 'Pet-Friendly Houses',
    filters: {
      priceRange: [2000, 5000],
      propertyTypes: ['house', 'villa'],
      bedrooms: '3',
      bathrooms: '2',
      sqftRange: [1200, 2500],
      amenities: ['garden', 'parking'],
      location: 'Suburbs',
      availableFrom: '',
      rating: 3,
      petFriendly: true,
      furnished: false,
      utilities: [],
      leaseTerms: ['1 year'],
      keywords: 'yard'
    },
    alertsEnabled: false,
    createdAt: new Date('2024-01-10'),
    lastRun: new Date('2024-01-18'),
    resultCount: 15,
    newResultsCount: 0
  },
  {
    id: '3',
    name: 'Luxury Condos',
    filters: {
      priceRange: [4000, 8000],
      propertyTypes: ['condo'],
      bedrooms: '2',
      bathrooms: '2',
      sqftRange: [1000, 2000],
      amenities: ['pool', 'gym', 'security'],
      location: 'Uptown',
      availableFrom: '',
      rating: 4,
      petFriendly: false,
      furnished: true,
      utilities: ['electricity', 'water'],
      leaseTerms: [],
      keywords: 'luxury'
    },
    alertsEnabled: true,
    createdAt: new Date('2024-01-05'),
    lastRun: new Date('2024-01-19'),
    resultCount: 8,
    newResultsCount: 1
  }
];

export default function SavedSearches({ onRunSearch, onCreateSearch, className = '' }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(mockSavedSearches);
  const [editingSearch, setEditingSearch] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const formatFilters = (filters: FilterCriteria) => {
    const parts = [];
    
    if (filters.location) {
      parts.push(`📍 ${filters.location}`);
    }
    
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
      parts.push(`💰 $${filters.priceRange[0].toLocaleString()} - $${filters.priceRange[1].toLocaleString()}`);
    }
    
    if (filters.propertyTypes.length > 0) {
      parts.push(`🏠 ${filters.propertyTypes.join(', ')}`);
    }
    
    if (filters.bedrooms !== 'any') {
      parts.push(`🛏️ ${filters.bedrooms}+ bed`);
    }
    
    if (filters.bathrooms !== 'any') {
      parts.push(`🚿 ${filters.bathrooms}+ bath`);
    }
    
    if (filters.amenities.length > 0) {
      parts.push(`✨ ${filters.amenities.slice(0, 2).join(', ')}${filters.amenities.length > 2 ? '...' : ''}`);
    }

    return parts.slice(0, 3).join(' • ');
  };

  const handleRunSearch = (search: SavedSearch) => {
    onRunSearch(search.filters);
    
    // Update last run time
    setSavedSearches(prev => 
      prev.map(s => 
        s.id === search.id 
          ? { ...s, lastRun: new Date(), newResultsCount: 0 }
          : s
      )
    );
  };

  const handleToggleAlerts = (searchId: string, enabled: boolean) => {
    setSavedSearches(prev => 
      prev.map(s => 
        s.id === searchId 
          ? { ...s, alertsEnabled: enabled }
          : s
      )
    );
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
  };

  const handleEditName = (searchId: string, newName: string) => {
    setSavedSearches(prev => 
      prev.map(s => 
        s.id === searchId 
          ? { ...s, name: newName }
          : s
      )
    );
    setEditingSearch(null);
    setEditName('');
  };

  const startEditing = (search: SavedSearch) => {
    setEditingSearch(search.id);
    setEditName(search.name);
  };

  const cancelEditing = () => {
    setEditingSearch(null);
    setEditName('');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Saved Searches
            <Badge variant="secondary" className="ml-2">
              {savedSearches.length}
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => onCreateSearch({} as FilterCriteria)}>
            <Plus className="h-4 w-4 mr-1" />
            New Search
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {savedSearches.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Searches</h3>
            <p className="text-gray-600 mb-4">
              Save your search criteria to quickly find properties that match your preferences
            </p>
            <Button onClick={() => onCreateSearch({} as FilterCriteria)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Search
            </Button>
          </div>
        ) : (
          savedSearches.map((search) => (
            <Card key={search.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {editingSearch === search.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-lg font-semibold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditName(search.id, editName);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleEditName(search.id, editName)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">{search.name}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => startEditing(search)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {formatFilters(search.filters)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {search.newResultsCount > 0 && (
                      <Badge className="bg-red-500">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {search.newResultsCount} new
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteSearch(search.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Home className="h-4 w-4 mr-1" />
                      {search.resultCount} properties
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Last run: {search.lastRun.toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`alerts-${search.id}`} className="text-sm">
                      Alerts
                    </Label>
                    <Switch
                      id={`alerts-${search.id}`}
                      checked={search.alertsEnabled}
                      onCheckedChange={(checked) => handleToggleAlerts(search.id, checked)}
                    />
                    <Bell className={`h-4 w-4 ${search.alertsEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleRunSearch(search)}
                    className="flex-1"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Run Search
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => onCreateSearch(search.filters)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Filters
                  </Button>
                </div>

                {search.alertsEnabled && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center text-sm text-blue-800">
                      <Bell className="h-4 w-4 mr-2" />
                      You'll receive notifications when new properties match this search
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}