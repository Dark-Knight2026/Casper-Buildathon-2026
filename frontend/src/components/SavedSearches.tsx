import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, Trash2, Edit, MapPin } from 'lucide-react';

export default function SavedSearches() {
  const savedSearches = [
    {
      id: 1,
      name: 'Beverly Hills Luxury Homes',
      criteria: 'Beverly Hills, CA • $2M-$5M • 3+ bed • House',
      newListings: 3,
      priceChanges: 1,
      lastAlert: '2 hours ago'
    },
    {
      id: 2,
      name: 'Downtown LA Condos',
      criteria: 'Downtown LA • $800K-$1.5M • 2+ bed • Condo',
      newListings: 7,
      priceChanges: 2,
      lastAlert: '1 day ago'
    },
    {
      id: 3,
      name: 'Santa Monica Rentals',
      criteria: 'Santa Monica, CA • $4K-$8K/mo • 2+ bed',
      newListings: 12,
      priceChanges: 0,
      lastAlert: '3 hours ago'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Saved Searches</span>
          </CardTitle>
          <Button variant="outline" size="sm">
            Create New Search
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {savedSearches.map((search) => (
            <div key={search.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{search.name}</h3>
                  {search.newListings > 0 && (
                    <Badge className="bg-blue-100 text-blue-800">
                      {search.newListings} new
                    </Badge>
                  )}
                  {search.priceChanges > 0 && (
                    <Badge className="bg-orange-100 text-orange-800">
                      {search.priceChanges} price changes
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{search.criteria}</p>
                <p className="text-xs text-gray-500">Last alert: {search.lastAlert}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}