import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InvestmentCalculator from '@/components/InvestmentCalculator';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Heart,
  Search,
  Filter,
  SlidersHorizontal,
  TrendingUp,
  Calculator,
  Eye,
  Star
} from 'lucide-react';

export default function PropertyListings() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [propertyType, setPropertyType] = useState('all');
  const [bedrooms, setBedrooms] = useState('all');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCalculator, setShowCalculator] = useState<number | null>(null);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    );
  };

  const properties = [
    {
      id: 1,
      title: 'Stunning Waterfront Colonial',
      address: '1234 Ocean View Drive, Virginia Beach, VA',
      price: 485000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2850,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 12,
      priceChange: '+2.5%',
      rating: 4.8,
      photos: 24,
      description: 'Stunning waterfront colonial with panoramic ocean views and modern amenities.'
    },
    {
      id: 2,
      title: 'Modern Downtown Condo',
      address: '567 Main Street, Norfolk, VA',
      price: 325000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      propertyType: 'Condo',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 8,
      priceChange: '+1.8%',
      rating: 4.6,
      photos: 18,
      description: 'Modern downtown condo with city views and premium finishes.'
    },
    {
      id: 3,
      title: 'Charming Suburban Home',
      address: '890 Maple Lane, Chesapeake, VA',
      price: 395000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1950,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 15,
      priceChange: '+3.2%',
      rating: 4.7,
      photos: 21,
      description: 'Charming suburban home with updated kitchen and spacious backyard.'
    },
    {
      id: 4,
      title: 'Luxury Estate with Pool',
      address: '123 Executive Drive, Virginia Beach, VA',
      price: 750000,
      bedrooms: 5,
      bathrooms: 4,
      sqft: 3500,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 22,
      priceChange: '+1.2%',
      rating: 4.9,
      photos: 32,
      description: 'Luxury estate with resort-style pool and premium amenities.'
    },
    {
      id: 5,
      title: 'Historic Townhouse',
      address: '456 Heritage Street, Portsmouth, VA',
      price: 285000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1650,
      propertyType: 'Townhouse',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 18,
      priceChange: '+4.1%',
      rating: 4.5,
      photos: 16,
      description: 'Historic townhouse with original character and modern updates.'
    },
    {
      id: 6,
      title: 'Contemporary Loft',
      address: '789 Arts District, Norfolk, VA',
      price: 425000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1400,
      propertyType: 'Loft',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 6,
      priceChange: '+2.8%',
      rating: 4.8,
      photos: 19,
      description: 'Contemporary loft in the heart of the arts district.'
    },
    {
      id: 7,
      title: 'Beachfront Villa',
      address: '321 Oceanfront Boulevard, Virginia Beach, VA',
      price: 1250000,
      bedrooms: 6,
      bathrooms: 5,
      sqft: 4200,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 35,
      priceChange: '-1.5%',
      rating: 4.9,
      photos: 45,
      description: 'Spectacular beachfront villa with direct ocean access.'
    },
    {
      id: 8,
      title: 'Garden District Cottage',
      address: '654 Rose Garden Way, Norfolk, VA',
      price: 245000,
      bedrooms: 2,
      bathrooms: 1.5,
      sqft: 1100,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 9,
      priceChange: '+5.2%',
      rating: 4.4,
      photos: 14,
      description: 'Cozy cottage in the charming garden district.'
    },
    {
      id: 9,
      title: 'Executive Penthouse',
      address: '987 Skyline Tower, Virginia Beach, VA',
      price: 875000,
      bedrooms: 3,
      bathrooms: 3.5,
      sqft: 2800,
      propertyType: 'Condo',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 28,
      priceChange: '+0.8%',
      rating: 4.7,
      photos: 28,
      description: 'Executive penthouse with panoramic city and ocean views.'
    },
    {
      id: 10,
      title: 'Family Ranch Home',
      address: '147 Country Club Drive, Chesapeake, VA',
      price: 365000,
      bedrooms: 4,
      bathrooms: 2,
      sqft: 2200,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 14,
      priceChange: '+2.1%',
      rating: 4.6,
      photos: 22,
      description: 'Spacious ranch home perfect for families.'
    },
    {
      id: 11,
      title: 'Urban Duplex Investment',
      address: '258 Commerce Street, Norfolk, VA',
      price: 385000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2100,
      propertyType: 'Multi-Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 21,
      priceChange: '+3.7%',
      rating: 4.5,
      photos: 20,
      description: 'Prime investment duplex in growing urban area.'
    },
    {
      id: 12,
      title: 'Waterfront Retreat',
      address: '369 Bay View Circle, Virginia Beach, VA',
      price: 625000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 2400,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 17,
      priceChange: '+1.9%',
      rating: 4.8,
      photos: 26,
      description: 'Peaceful waterfront retreat with private dock.'
    },
    {
      id: 13,
      title: 'New Construction Modern',
      address: '741 Innovation Drive, Chesapeake, VA',
      price: 445000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 2050,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 5,
      priceChange: 'New',
      rating: 4.9,
      photos: 30,
      description: 'Brand new modern home with smart home technology.'
    },
    {
      id: 14,
      title: 'Victorian Mansion',
      address: '852 Historic Avenue, Portsmouth, VA',
      price: 695000,
      bedrooms: 5,
      bathrooms: 3.5,
      sqft: 3200,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 42,
      priceChange: '-2.1%',
      rating: 4.6,
      photos: 35,
      description: 'Restored Victorian mansion with period details.'
    },
    {
      id: 15,
      title: 'Golf Course Villa',
      address: '963 Fairway Lane, Virginia Beach, VA',
      price: 525000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2650,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 11,
      priceChange: '+2.3%',
      rating: 4.7,
      photos: 24,
      description: 'Elegant villa overlooking championship golf course.'
    },
    {
      id: 16,
      title: 'Marina Condo',
      address: '159 Harbor Point, Norfolk, VA',
      price: 355000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1350,
      propertyType: 'Condo',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 13,
      priceChange: '+3.4%',
      rating: 4.5,
      photos: 17,
      description: 'Luxury condo with marina and water views.'
    },
    {
      id: 17,
      title: 'Country Estate',
      address: '753 Rural Route 12, Chesapeake, VA',
      price: 595000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2900,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 26,
      priceChange: '+1.7%',
      rating: 4.8,
      photos: 29,
      description: 'Private country estate on 5 acres.'
    },
    {
      id: 18,
      title: 'City Center High-Rise',
      address: '486 Metropolitan Plaza, Norfolk, VA',
      price: 465000,
      bedrooms: 2,
      bathrooms: 2.5,
      sqft: 1600,
      propertyType: 'Condo',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 19,
      priceChange: '+2.6%',
      rating: 4.6,
      photos: 21,
      description: 'Modern high-rise condo in city center.'
    },
    {
      id: 19,
      title: 'Coastal Craftsman',
      address: '357 Seaside Drive, Virginia Beach, VA',
      price: 415000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1850,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 8,
      priceChange: '+4.3%',
      rating: 4.7,
      photos: 23,
      description: 'Beautiful craftsman home steps from the beach.'
    },
    {
      id: 20,
      title: 'Investment Fourplex',
      address: '642 Rental Row, Portsmouth, VA',
      price: 485000,
      bedrooms: 8,
      bathrooms: 4,
      sqft: 3200,
      propertyType: 'Multi-Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 31,
      priceChange: '+1.4%',
      rating: 4.4,
      photos: 25,
      description: 'Fully occupied fourplex with strong rental income.'
    },
    {
      id: 21,
      title: 'Luxury Waterfront Condo',
      address: '789 Yacht Club Drive, Norfolk, VA',
      price: 675000,
      bedrooms: 3,
      bathrooms: 3,
      sqft: 2200,
      propertyType: 'Condo',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 16,
      priceChange: '+1.8%',
      rating: 4.9,
      photos: 32,
      description: 'Luxury waterfront condo with yacht club access.'
    },
    {
      id: 22,
      title: 'Suburban Starter Home',
      address: '951 Maple Street, Chesapeake, VA',
      price: 225000,
      bedrooms: 3,
      bathrooms: 1.5,
      sqft: 1250,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 7,
      priceChange: '+6.1%',
      rating: 4.3,
      photos: 15,
      description: 'Perfect starter home in quiet suburban neighborhood.'
    },
    {
      id: 23,
      title: 'Executive Townhome',
      address: '147 Executive Row, Virginia Beach, VA',
      price: 385000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1800,
      propertyType: 'Townhouse',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 12,
      priceChange: '+2.9%',
      rating: 4.6,
      photos: 19,
      description: 'Modern executive townhome with garage and patio.'
    },
    {
      id: 24,
      title: 'Riverfront Cabin',
      address: '258 River Bend Lane, Portsmouth, VA',
      price: 295000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 950,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 24,
      priceChange: '+3.8%',
      rating: 4.5,
      photos: 18,
      description: 'Rustic riverfront cabin perfect for weekend getaways.'
    },
    {
      id: 25,
      title: 'Contemporary Masterpiece',
      address: '369 Architectural Way, Norfolk, VA',
      price: 825000,
      bedrooms: 4,
      bathrooms: 4,
      sqft: 3100,
      propertyType: 'Single Family',
      image: '/api/placeholder/400/300',
      status: 'For Sale',
      daysOnMarket: 29,
      priceChange: '+0.9%',
      rating: 4.8,
      photos: 38,
      description: 'Award-winning contemporary home with stunning architecture.'
    }
  ];

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = priceRange === 'all' || 
                        (priceRange === 'under-300k' && property.price < 300000) ||
                        (priceRange === '300k-500k' && property.price >= 300000 && property.price <= 500000) ||
                        (priceRange === '500k-750k' && property.price > 500000 && property.price <= 750000) ||
                        (priceRange === 'over-750k' && property.price > 750000);
    
    const matchesType = propertyType === 'all' || property.propertyType === propertyType;
    
    const matchesBedrooms = bedrooms === 'all' || 
                           (bedrooms === '1' && property.bedrooms === 1) ||
                           (bedrooms === '2' && property.bedrooms === 2) ||
                           (bedrooms === '3' && property.bedrooms === 3) ||
                           (bedrooms === '4+' && property.bedrooms >= 4);
    
    return matchesSearch && matchesPrice && matchesType && matchesBedrooms;
  });

  const PropertyCard = ({ property }: { property: typeof properties[0] }) => (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 bg-white hover:scale-105">
      <div className="relative overflow-hidden">
        <img 
          src={property.image} 
          alt={property.title}
          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        
        <Badge className="absolute top-3 left-3 bg-green-600 text-white shadow-lg">
          {property.status}
        </Badge>
        
        <Badge className="absolute top-3 right-3 bg-blue-600 text-white shadow-lg flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" />
          {property.priceChange}
        </Badge>
        
        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-md text-xs">
          {property.photos} photos
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="absolute bottom-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(property.id);
          }}
        >
          <Heart 
            className={`h-4 w-4 ${
              favorites.includes(property.id) 
                ? 'fill-red-500 text-red-500' 
                : 'text-gray-600'
            }`} 
          />
        </Button>
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {property.title}
            </h3>
            <p className="text-gray-600 text-sm flex items-center mb-3">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              {property.address}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-3xl font-bold text-blue-600">
            ${property.price.toLocaleString()}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Star className="h-4 w-4 text-yellow-500 mr-1" />
            {property.rating}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span className="flex items-center">
            <Bed className="h-4 w-4 mr-1" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center">
            <Bath className="h-4 w-4 mr-1" />
            {property.bathrooms} bath
          </span>
          <span className="flex items-center">
            <Square className="h-4 w-4 mr-1" />
            {property.sqft.toLocaleString()} sqft
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-500">
            {property.daysOnMarket} days on market
          </span>
          <span className="text-xs font-medium text-gray-700">
            ${Math.round(property.price / property.sqft)}/sqft
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {property.description}
        </p>
        
        <div className="flex space-x-2">
          <Button 
            onClick={() => navigate(`/property/${property.id}`)}
            className="flex-1"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowCalculator(showCalculator === property.id ? null : property.id);
            }}
            className="flex-1"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Investment
          </Button>
        </div>

        {/* Investment Calculator */}
        {showCalculator === property.id && (
          <div className="mt-6 border-t pt-6">
            <InvestmentCalculator 
              propertyPrice={property.price}
              propertyType={property.propertyType}
              location={property.address}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">Property Listings</h1>
              <p className="text-gray-600 mt-1">
                {filteredProperties.length} properties found in Hampton Roads, VA
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search properties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Price Range
                  </label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="under-300k">Under $300K</SelectItem>
                      <SelectItem value="300k-500k">$300K - $500K</SelectItem>
                      <SelectItem value="500k-750k">$500K - $750K</SelectItem>
                      <SelectItem value="over-750k">Over $750K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Property Type
                  </label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Single Family">Single Family</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                      <SelectItem value="Loft">Loft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Bedrooms
                  </label>
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bedrooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      <SelectItem value="1">1 Bedroom</SelectItem>
                      <SelectItem value="2">2 Bedrooms</SelectItem>
                      <SelectItem value="3">3 Bedrooms</SelectItem>
                      <SelectItem value="4+">4+ Bedrooms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSearchTerm('');
                    setPriceRange('all');
                    setPropertyType('all');
                    setBedrooms('all');
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Properties Grid */}
          <div className="lg:col-span-3">
            {filteredProperties.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No properties found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search criteria or filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className={`grid gap-8 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {filteredProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}