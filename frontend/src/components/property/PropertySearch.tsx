import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  MapPin, 
  Filter, 
  Star, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  DollarSign,
  Heart,
  Share2,
  Eye,
  TrendingUp,
  Map,
  List,
  Grid3X3,
  Zap,
  Home,
  Building2,
  TreePine,
  Car,
  Wifi,
  Dumbbell,
  ShoppingCart,
  GraduationCap,
  Stethoscope
} from 'lucide-react';

interface PropertySearchProps {
  onSearch?: (filters: SearchFilters) => void;
}

interface SearchFilters {
  location: string;
  propertyType: string;
  priceRange: [number, number];
  bedrooms: string;
  bathrooms: string;
  sqftRange: [number, number];
  amenities: string[];
  features: string[];
  listingType: string;
  daysOnMarket: string;
  keywords: string;
}

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  listingType: 'sale' | 'rent';
  images: string[];
  description: string;
  features: string[];
  amenities: string[];
  neighborhood: string;
  walkScore: number;
  daysOnMarket: number;
  priceHistory: Array<{ date: string; price: number; event: string }>;
  agent: {
    name: string;
    phone: string;
    email: string;
    photo: string;
  };
  virtualTour?: string;
  floorPlan?: string;
  isFavorite: boolean;
  views: number;
  saves: number;
}

export default function PropertySearch({ onSearch }: PropertySearchProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>({
    location: '',
    propertyType: 'all',
    priceRange: [0, 5000000],
    bedrooms: 'any',
    bathrooms: 'any',
    sqftRange: [0, 10000],
    amenities: [],
    features: [],
    listingType: 'sale',
    daysOnMarket: 'any',
    keywords: ''
  });

  // Mock property data
  const mockProperties: Property[] = [
    {
      id: 'prop-001',
      address: '123 Luxury Lane, Beverly Hills, CA 90210',
      price: 2850000,
      bedrooms: 4,
      bathrooms: 3.5,
      sqft: 3200,
      lotSize: '0.25 acres',
      yearBuilt: 2018,
      propertyType: 'Single Family',
      listingType: 'sale',
      images: ['/api/placeholder/400/300', '/api/placeholder/400/300', '/api/placeholder/400/300'],
      description: 'Stunning modern home with panoramic city views, gourmet kitchen, and resort-style backyard.',
      features: ['Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Walk-in Closets'],
      amenities: ['Pool', 'Spa', 'Outdoor Kitchen', 'Home Theater'],
      neighborhood: 'Beverly Hills',
      walkScore: 85,
      daysOnMarket: 12,
      priceHistory: [
        { date: '2024-08-01', price: 2950000, event: 'Listed' },
        { date: '2024-08-15', price: 2850000, event: 'Price Reduction' }
      ],
      agent: {
        name: 'Sarah Johnson',
        phone: '(555) 123-4567',
        email: 'sarah@luxuryrealty.com',
        photo: '/api/placeholder/64/64'
      },
      virtualTour: 'https://example.com/virtual-tour',
      floorPlan: '/api/placeholder/600/400',
      isFavorite: false,
      views: 1247,
      saves: 89
    },
    {
      id: 'prop-002',
      address: '456 Ocean Drive, Malibu, CA 90265',
      price: 4200000,
      bedrooms: 5,
      bathrooms: 4,
      sqft: 4500,
      lotSize: '0.5 acres',
      yearBuilt: 2020,
      propertyType: 'Single Family',
      listingType: 'sale',
      images: ['/api/placeholder/400/300', '/api/placeholder/400/300'],
      description: 'Oceanfront masterpiece with private beach access, infinity pool, and smart home technology.',
      features: ['Ocean Views', 'Smart Home', 'Wine Cellar', 'Elevator'],
      amenities: ['Private Beach', 'Infinity Pool', 'Guest House', 'Tennis Court'],
      neighborhood: 'Malibu',
      walkScore: 72,
      daysOnMarket: 5,
      priceHistory: [
        { date: '2024-08-25', price: 4200000, event: 'Listed' }
      ],
      agent: {
        name: 'Michael Chen',
        phone: '(555) 987-6543',
        email: 'michael@oceanrealty.com',
        photo: '/api/placeholder/64/64'
      },
      virtualTour: 'https://example.com/virtual-tour-2',
      isFavorite: true,
      views: 2156,
      saves: 234
    }
  ];

  const amenityOptions = [
    { id: 'pool', label: 'Pool', icon: <Zap className="h-4 w-4" /> },
    { id: 'gym', label: 'Gym/Fitness', icon: <Dumbbell className="h-4 w-4" /> },
    { id: 'parking', label: 'Parking', icon: <Car className="h-4 w-4" /> },
    { id: 'wifi', label: 'High-Speed Internet', icon: <Wifi className="h-4 w-4" /> },
    { id: 'shopping', label: 'Shopping Nearby', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 'schools', label: 'Top Schools', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'healthcare', label: 'Healthcare', icon: <Stethoscope className="h-4 w-4" /> },
    { id: 'parks', label: 'Parks & Recreation', icon: <TreePine className="h-4 w-4" /> }
  ];

  const handleSearch = () => {
    onSearch?.(filters);
  };

  const toggleAmenity = (amenityId: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const toggleFavorite = (propertyId: string) => {
    // In a real app, this would update the backend
    console.log('Toggle favorite for property:', propertyId);
  };

  const saveSearch = () => {
    const searchName = `${filters.location || 'All Areas'} - $${filters.priceRange[0].toLocaleString()}-$${filters.priceRange[1].toLocaleString()}`;
    setSavedSearches(prev => [...prev, searchName]);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Find Your Dream Home</h1>
              <p className="text-blue-100">Search from thousands of properties with advanced filters</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{mockProperties.length.toLocaleString()}</div>
              <div className="text-blue-100">Properties Available</div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Enter city, neighborhood, or address..."
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="pl-10 bg-white text-gray-900"
              />
            </div>
            <Select value={filters.propertyType} onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}>
              <SelectTrigger className="w-48 bg-white text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single-family">Single Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="multi-family">Multi-Family</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="bg-white text-blue-600 hover:bg-gray-100">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="border-white text-white hover:bg-white hover:text-blue-600">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Listing Type</Label>
                    <Select value={filters.listingType} onValueChange={(value) => setFilters(prev => ({ ...prev, listingType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bedrooms</Label>
                    <Select value={filters.bedrooms} onValueChange={(value) => setFilters(prev => ({ ...prev, bedrooms: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="1+">1+</SelectItem>
                        <SelectItem value="2+">2+</SelectItem>
                        <SelectItem value="3+">3+</SelectItem>
                        <SelectItem value="4+">4+</SelectItem>
                        <SelectItem value="5+">5+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bathrooms</Label>
                    <Select value={filters.bathrooms} onValueChange={(value) => setFilters(prev => ({ ...prev, bathrooms: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="1+">1+</SelectItem>
                        <SelectItem value="2+">2+</SelectItem>
                        <SelectItem value="3+">3+</SelectItem>
                        <SelectItem value="4+">4+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}</Label>
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                      max={5000000}
                      step={50000}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Square Footage: {filters.sqftRange[0].toLocaleString()} - {filters.sqftRange[1].toLocaleString()} sq ft</Label>
                    <Slider
                      value={filters.sqftRange}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, sqftRange: value as [number, number] }))}
                      max={10000}
                      step={100}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Walk-in Closets', 'Fireplace', 'Balcony/Deck', 'Garage', 'Basement'].map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Switch
                        checked={filters.features.includes(feature)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({ ...prev, features: [...prev.features, feature] }));
                          } else {
                            setFilters(prev => ({ ...prev, features: prev.features.filter(f => f !== feature) }));
                          }
                        }}
                      />
                      <Label>{feature}</Label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="amenities" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {amenityOptions.map((amenity) => (
                    <Button
                      key={amenity.id}
                      variant={filters.amenities.includes(amenity.id) ? 'default' : 'outline'}
                      onClick={() => toggleAmenity(amenity.id)}
                      className="justify-start"
                    >
                      {amenity.icon}
                      <span className="ml-2">{amenity.label}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Days on Market</Label>
                    <Select value={filters.daysOnMarket} onValueChange={(value) => setFilters(prev => ({ ...prev, daysOnMarket: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="7">1 week</SelectItem>
                        <SelectItem value="30">1 month</SelectItem>
                        <SelectItem value="90">3 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Keywords</Label>
                    <Input
                      placeholder="Pool, view, updated, etc..."
                      value={filters.keywords}
                      onChange={(e) => setFilters(prev => ({ ...prev, keywords: e.target.value }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <Button variant="outline" onClick={saveSearch}>
                <Star className="h-4 w-4 mr-2" />
                Save Search
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setFilters({
                  location: '',
                  propertyType: 'all',
                  priceRange: [0, 5000000],
                  bedrooms: 'any',
                  bathrooms: 'any',
                  sqftRange: [0, 10000],
                  amenities: [],
                  features: [],
                  listingType: 'sale',
                  daysOnMarket: 'any',
                  keywords: ''
                })}>
                  Clear All
                </Button>
                <Button onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">{mockProperties.length} properties found</span>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Select defaultValue="newest">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="sqft">Square Footage</SelectItem>
            <SelectItem value="days">Days on Market</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Property Results */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {mockProperties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={property.images[0]}
                alt={property.address}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <div className="absolute top-2 left-2">
                <Badge className="bg-blue-600 text-white">
                  {property.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                </Badge>
              </div>
              <div className="absolute top-2 right-2 flex space-x-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleFavorite(property.id)}
                  className="h-8 w-8 p-0"
                >
                  <Heart className={`h-4 w-4 ${property.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  {property.images.length} Photos
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-2xl font-bold text-green-600">
                  ${property.price.toLocaleString()}
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="h-3 w-3 mr-1" />
                    {property.views}
                  </div>
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">{property.address}</h3>
              
              <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <Bed className="h-4 w-4 mr-1" />
                  {property.bedrooms} bed
                </div>
                <div className="flex items-center">
                  <Bath className="h-4 w-4 mr-1" />
                  {property.bathrooms} bath
                </div>
                <div className="flex items-center">
                  <Square className="h-4 w-4 mr-1" />
                  {property.sqft.toLocaleString()} sqft
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{property.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Walk Score: {property.walkScore}</Badge>
                  <Badge variant="outline">{property.daysOnMarket} days</Badge>
                </div>
                {property.virtualTour && (
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Virtual Tour
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2 pt-3 border-t">
                <img
                  src={property.agent.photo}
                  alt={property.agent.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{property.agent.name}</div>
                  <div className="text-xs text-gray-500">{property.agent.phone}</div>
                </div>
                <Button size="sm">Contact</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((search, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-blue-100">
                  <Star className="h-3 w-3 mr-1" />
                  {search}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}