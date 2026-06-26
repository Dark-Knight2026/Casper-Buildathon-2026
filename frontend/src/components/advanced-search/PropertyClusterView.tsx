import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Home, 
  Bed, 
  Bath, 
  Square, 
  Heart,
  Share,
  Eye,
  TrendingUp,
  Navigation
} from 'lucide-react';

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
  distance?: number;
  pricePerSqft?: number;
  daysOnMarket?: number;
  neighborhood?: string;
}

interface PropertyClusterViewProps {
  properties: Property[];
  centerLocation: { lat: number; lng: number };
}

type SortOption = 'price' | 'distance' | 'size' | 'newest';

export default function PropertyClusterView({ properties, centerLocation }: PropertyClusterViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('price');

  // Calculate distance and additional metrics for each property
  const enrichedProperties = properties.map(property => {
    const distance = calculateDistance(
      centerLocation.lat, centerLocation.lng,
      property.lat, property.lng
    );
    
    return {
      ...property,
      distance: Math.round(distance * 10) / 10,
      pricePerSqft: Math.round(property.price / property.sqft),
      daysOnMarket: Math.floor(Math.random() * 30) + 1,
      neighborhood: getNeighborhood(property.address)
    };
  });

  // Sort properties
  const sortedProperties = [...enrichedProperties].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      case 'size':
        return b.sqft - a.sqft;
      case 'newest':
        return (a.daysOnMarket || 0) - (b.daysOnMarket || 0);
      default:
        return 0;
    }
  });

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function getNeighborhood(address: string) {
    const neighborhoods = ['Beverly Hills', 'Santa Monica', 'Hollywood', 'Venice', 'Malibu', 'West Hollywood', 'Brentwood'];
    return neighborhoods.find(n => address.includes(n)) || 'Los Angeles';
  }

  const getPriceColor = (price: number) => {
    if (price < 800000) return 'text-green-600';
    if (price < 1200000) return 'text-blue-600';
    if (price < 1800000) return 'text-orange-600';
    return 'text-red-600';
  };

  const getMarketStatusColor = (days: number) => {
    if (days <= 7) return 'bg-green-100 text-green-800';
    if (days <= 14) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (sortedProperties.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-gray-600">
            Try adjusting your search radius or location to find more properties.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {sortedProperties.length} Properties Found
              </h3>
              <p className="text-sm text-gray-600">
                Within search radius • Sorted by {sortBy}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="price">Price: Low to High</option>
                <option value="distance">Distance</option>
                <option value="size">Size: Large to Small</option>
                <option value="newest">Newest First</option>
              </select>
              
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {sortedProperties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow duration-200">
            <div className="relative">
              <img
                src={property.image}
                alt={property.address}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <div className="absolute top-3 left-3">
                <Badge className={getMarketStatusColor(property.daysOnMarket || 0)}>
                  {property.daysOnMarket} days on market
                </Badge>
              </div>
              <div className="absolute top-3 right-3 flex space-x-1">
                <Button variant="ghost" size="sm" className="bg-white/80 hover:bg-white">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="bg-white/80 hover:bg-white">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Price and Type */}
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${getPriceColor(property.price)}`}>
                    ${property.price.toLocaleString()}
                  </div>
                  <Badge variant="outline">{property.type}</Badge>
                </div>

                {/* Property Details */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Bed className="h-4 w-4" />
                    <span>{property.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bath className="h-4 w-4" />
                    <span>{property.bathrooms} bath</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Square className="h-4 w-4" />
                    <span>{property.sqft.toLocaleString()} sqft</span>
                  </div>
                </div>

                {/* Address and Distance */}
                <div className="space-y-1">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700 line-clamp-2">
                      {property.address}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{property.neighborhood}</span>
                    <div className="flex items-center space-x-1">
                      <Navigation className="h-3 w-3" />
                      <span>{property.distance} miles away</span>
                    </div>
                  </div>
                </div>

                {/* Price per sqft and trend */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-gray-600">
                    ${property.pricePerSqft}/sqft
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>+2.3% vs area</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button className="flex-1" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Tour
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {sortedProperties.length >= 6 && (
        <div className="text-center">
          <Button variant="outline" size="lg">
            Load More Properties
          </Button>
        </div>
      )}
    </div>
  );
}