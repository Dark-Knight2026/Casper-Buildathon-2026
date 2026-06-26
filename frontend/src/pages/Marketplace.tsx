import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import PropertyAnalysis from '@/components/PropertyAnalysis';
import { 
  Store, 
  Search, 
  Plus, 
  MapPin,
  Heart,
  Share2,
  Eye,
  Bed,
  Bath,
  Square,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  Star,
  Camera,
  Calculator,
  BarChart3,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [priceRange, setPriceRange] = useState('all');

  const listings = [
    {
      id: 1,
      title: 'Modern Downtown Apartment',
      address: '123 Main St, Downtown',
      price: 2500,
      type: 'monthly',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      images: ['/images/ModernApartment.jpg', '/images/ModernApartment.jpg'],
      description: 'Beautiful modern apartment in the heart of downtown with city views.',
      amenities: ['Pool', 'Gym', 'Parking', 'Balcony'],
      rating: 4.8,
      reviews: 24,
      owner: 'Sarah Johnson',
      ownerRating: 4.9,
      availability: 'Immediate',
      featured: true,
      views: 145,
      favorites: 12,
      // DealCheck.io style analysis data
      purchasePrice: 320000,
      downPayment: 64000,
      loanAmount: 256000,
      interestRate: 6.5,
      yearBuilt: 2018,
      monthlyExpenses: {
        taxes: 400,
        insurance: 150,
        maintenance: 200,
        utilities: 120,
        management: 150
      },
      financials: {
        capRate: 8.2,
        cashFlow: 380,
        cocReturn: 7.1,
        totalReturn: 12.8,
        breakEven: 0.78,
        appreciation: 3.5
      },
      dealScore: 85,
      riskLevel: 'Medium'
    },
    {
      id: 2,
      title: 'Luxury Beach Villa',
      address: '456 Ocean Drive, Beachside',
      price: 850000,
      type: 'sale',
      propertyType: 'Villa',
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2800,
      images: ['/images/BeachfrontVilla.jpg', '/images/BeachfrontVilla.jpg'],
      description: 'Stunning beachfront villa with private access to pristine beaches.',
      amenities: ['Beach Access', 'Pool', 'Garden', 'Garage'],
      rating: 5.0,
      reviews: 8,
      owner: 'Mike Chen',
      ownerRating: 4.7,
      availability: 'Available',
      featured: false,
      views: 89,
      favorites: 23,
      purchasePrice: 850000,
      downPayment: 170000,
      loanAmount: 680000,
      interestRate: 7.2,
      yearBuilt: 2020,
      monthlyExpenses: {
        taxes: 1200,
        insurance: 450,
        maintenance: 600,
        utilities: 300,
        management: 400
      },
      financials: {
        capRate: 5.8,
        cashFlow: 1200,
        cocReturn: 8.5,
        totalReturn: 14.2,
        breakEven: 0.82,
        appreciation: 4.2
      },
      dealScore: 78,
      riskLevel: 'Low'
    },
    {
      id: 3,
      title: 'Student Housing Complex',
      address: '789 University Ave, Campus Area',
      price: 150,
      type: 'daily',
      propertyType: 'Shared Room',
      bedrooms: 1,
      bathrooms: 1,
      sqft: 400,
      images: ['/images/StudentAccommodation.jpg'],
      description: 'Affordable student accommodation near university campus.',
      amenities: ['WiFi', 'Laundry', 'Study Room', 'Security'],
      rating: 4.3,
      reviews: 67,
      owner: 'Emily Rodriguez',
      ownerRating: 4.8,
      availability: 'Sept 2024',
      featured: false,
      views: 203,
      favorites: 8
    },
    {
      id: 4,
      title: 'Commercial Office Space',
      address: '321 Business Blvd, Financial District',
      price: 4800,
      type: 'monthly',
      propertyType: 'Office',
      bedrooms: 0,
      bathrooms: 2,
      sqft: 1800,
      images: ['/images/OfficeSpace.jpg', '/images/ConferenceRoom.jpg'],
      description: 'Prime commercial office space in the financial district.',
      amenities: ['Reception', 'Conference Room', 'Parking', 'Security'],
      rating: 4.6,
      reviews: 15,
      owner: 'David Wilson',
      ownerRating: 4.9,
      availability: 'Immediate',
      featured: true,
      views: 78,
      favorites: 5,
      purchasePrice: 680000,
      downPayment: 136000,
      loanAmount: 544000,
      interestRate: 6.8,
      yearBuilt: 2019,
      monthlyExpenses: {
        taxes: 950,
        insurance: 280,
        maintenance: 400,
        utilities: 200,
        management: 240
      },
      financials: {
        capRate: 7.8,
        cashFlow: 730,
        cocReturn: 6.4,
        totalReturn: 11.9,
        breakEven: 0.85,
        appreciation: 2.8
      },
      dealScore: 72,
      riskLevel: 'Medium'
    },
    {
      id: 5,
      title: 'Family Home with Garden',
      address: '654 Suburban Lane, Green Valley',
      price: 2200,
      type: 'lease_to_own',
      propertyType: 'House',
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1600,
      images: ['/images/familyhome.jpg'],
      description: 'Perfect family home with large garden and quiet neighborhood.',
      amenities: ['Garden', 'Garage', 'Fireplace', 'Storage'],
      rating: 4.7,
      reviews: 31,
      owner: 'Lisa Thompson',
      ownerRating: 4.8,
      availability: 'Oct 2024',
      featured: false,
      views: 156,
      favorites: 19
    },
    {
      id: 6,
      title: 'Investment Property Portfolio',
      address: 'Multiple Locations, City Center',
      price: 25000,
      type: 'equity',
      propertyType: 'Mixed Portfolio',
      bedrooms: 0,
      bathrooms: 0,
      sqft: 15000,
      images: ['/images/RealEstatePortfolio.jpg'],
      description: '20% equity stake in diversified real estate portfolio.',
      amenities: ['Professional Management', 'Diversified', 'High Yield', 'Liquid'],
      rating: 4.5,
      reviews: 42,
      owner: 'Real Estate Fund LLC',
      ownerRating: 4.6,
      availability: 'Limited Shares',
      featured: true,
      views: 267,
      favorites: 34
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-100 text-blue-800';
      case 'monthly':
        return 'bg-green-100 text-green-800';
      case 'yearly':
        return 'bg-purple-100 text-purple-800';
      case 'sale':
        return 'bg-red-100 text-red-800';
      case 'lease_to_own':
        return 'bg-orange-100 text-orange-800';
      case 'equity':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return 'Daily Rental';
      case 'monthly':
        return 'Monthly Rental';
      case 'yearly':
        return 'Yearly Rental';
      case 'sale':
        return 'For Sale';
      case 'lease_to_own':
        return 'Lease to Own';
      case 'equity':
        return 'Equity Share';
      default:
        return type;
    }
  };

  const formatPrice = (price: number, type: string) => {
    switch (type) {
      case 'daily':
        return `$${price}/day`;
      case 'monthly':
        return `$${price.toLocaleString()}/month`;
      case 'yearly':
        return `$${price.toLocaleString()}/year`;
      case 'sale':
        return `$${price.toLocaleString()}`;
      case 'lease_to_own':
        return `$${price.toLocaleString()}/month`;
      case 'equity':
        return `$${price.toLocaleString()} (20% share)`;
      default:
        return `$${price.toLocaleString()}`;
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.propertyType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || listing.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-2">Discover properties for sale, rent, and investment opportunities</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          List Property
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search properties, locations, or amenities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="daily">Daily Rental</SelectItem>
            <SelectItem value="monthly">Monthly Rental</SelectItem>
            <SelectItem value="yearly">Yearly Rental</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="lease_to_own">Lease to Own</SelectItem>
            <SelectItem value="equity">Equity Share</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Properties ({filteredListings.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="recent">Recently Listed</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="hover:shadow-xl transition-shadow overflow-hidden group">
                <div className="relative">
                  <div className="aspect-video bg-gray-200 flex items-center justify-center relative overflow-hidden">
                    <Camera className="h-12 w-12 text-gray-400" />
                    {listing.featured && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                        Featured
                      </Badge>
                    )}
                    <Badge className={`absolute top-2 right-2 ${getTypeColor(listing.type)}`}>
                      {getTypeLabel(listing.type)}
                    </Badge>
                    <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{listing.title}</CardTitle>
                      <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{listing.address}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{listing.rating}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(listing.price, listing.type)}
                  </div>

                  {listing.type !== 'equity' && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Bed className="h-4 w-4" />
                        <span>{listing.bedrooms} bed</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Bath className="h-4 w-4" />
                        <span>{listing.bathrooms} bath</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Square className="h-4 w-4" />
                        <span>{listing.sqft.toLocaleString()} sqft</span>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 line-clamp-2">{listing.description}</p>

                  <div className="flex flex-wrap gap-1">
                    {listing.amenities.slice(0, 3).map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {listing.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{listing.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{listing.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>{listing.favorites}</span>
                      </div>
                    </div>
                    <span>Available: {listing.availability}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {listing.owner.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs">
                        <p className="font-medium">{listing.owner}</p>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span>{listing.ownerRating}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DealCheck.io Analysis Section */}
                  {(listing.type === 'sale' || listing.type === 'monthly' || listing.type === 'yearly') && listing.financials && (
                    <PropertyAnalysis property={listing} />
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" className="flex-1">
                      {listing.type === 'sale' ? 'Make Offer' : 
                       listing.type === 'equity' ? 'Invest Now' : 'Inquire'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredListings.length === 0 && (
            <div className="text-center py-12">
              <Store className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search criteria or filters</p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                List Your Property
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.filter(l => l.featured).map((listing) => (
              <Card key={listing.id} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-yellow-500 text-white">Featured</Badge>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">High Interest</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{listing.title}</CardTitle>
                  <CardDescription>{listing.address}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-4">
                    {formatPrice(listing.price, listing.type)}
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{listing.description}</p>
                  <Button className="w-full">View Featured Property</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recently Listed Properties</CardTitle>
              <CardDescription>Latest properties added to the marketplace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Recent listings will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-listings">
          <Card>
            <CardHeader>
              <CardTitle>My Property Listings</CardTitle>
              <CardDescription>Manage your active property listings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You haven't listed any properties yet</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Listing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}