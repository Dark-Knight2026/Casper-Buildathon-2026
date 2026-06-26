import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  Eye,
  Phone,
  Mail,
  MessageSquare,
  Star,
  ChevronLeft,
  ChevronRight,
  Play,
  Download,
  Calculator,
  School,
  ShoppingCart,
  Hospital,
  TreePine,
  Camera,
  Video,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Building2,
  Home,
  Shield,
  Zap
} from 'lucide-react';

interface PropertyDetailsProps {
  propertyId: string;
}

export default function PropertyDetails({ propertyId }: PropertyDetailsProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMortgageCalculator, setShowMortgageCalculator] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I am interested in this property. Please contact me with more information.'
  });

  // Mock property data
  const property = {
    id: propertyId,
    address: '123 Luxury Lane, Beverly Hills, CA 90210',
    price: 2850000,
    bedrooms: 4,
    bathrooms: 3.5,
    sqft: 3200,
    lotSize: '0.25 acres',
    yearBuilt: 2018,
    propertyType: 'Single Family',
    listingType: 'sale' as const,
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    description: 'Stunning modern home with panoramic city views, gourmet kitchen, and resort-style backyard. This architectural masterpiece features soaring ceilings, floor-to-ceiling windows, and premium finishes throughout.',
    features: [
      'Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Walk-in Closets',
      'Central Air', 'Fireplace', 'Balcony/Deck', 'Smart Home Technology'
    ],
    amenities: ['Pool', 'Spa', 'Outdoor Kitchen', 'Home Theater', 'Wine Cellar', 'Gym'],
    neighborhood: 'Beverly Hills',
    walkScore: 85,
    daysOnMarket: 12,
    priceHistory: [
      { date: '2024-08-01', price: 2950000, event: 'Listed' },
      { date: '2024-08-15', price: 2850000, event: 'Price Reduction' }
    ],
    nearbyPlaces: {
      schools: [
        { name: 'Beverly Hills High School', rating: 9, distance: '0.5 miles', type: 'Public' },
        { name: 'Hawthorne Elementary', rating: 10, distance: '0.3 miles', type: 'Public' }
      ],
      shopping: [
        { name: 'Rodeo Drive', distance: '0.8 miles', type: 'Luxury Shopping' },
        { name: 'Beverly Center', distance: '1.2 miles', type: 'Mall' }
      ],
      healthcare: [
        { name: 'Cedars-Sinai Medical Center', distance: '2.3 miles', type: 'Hospital' }
      ],
      parks: [
        { name: 'Beverly Gardens Park', distance: '0.7 miles', type: 'Public Park' }
      ]
    },
    agent: {
      name: 'Sarah Johnson',
      phone: '(555) 123-4567',
      email: 'sarah@luxuryrealty.com',
      photo: '/api/placeholder/64/64',
      bio: 'Luxury real estate specialist with 15+ years of experience in Beverly Hills and surrounding areas.',
      listings: 47,
      experience: 15
    },
    virtualTour: 'https://example.com/virtual-tour',
    floorPlan: '/api/placeholder/600/400',
    documents: [
      { name: 'Property Disclosure', type: 'PDF', url: '/documents/disclosure.pdf' },
      { name: 'HOA Documents', type: 'PDF', url: '/documents/hoa.pdf' }
    ],
    taxes: {
      annual: 28500,
      history: [
        { year: 2023, amount: 28500 },
        { year: 2022, amount: 27200 }
      ]
    },
    hoa: {
      fee: 350,
      frequency: 'monthly',
      amenities: ['Security', 'Landscaping', 'Community Pool']
    },
    utilities: {
      electric: 'LADWP',
      gas: 'SoCalGas',
      water: 'City of Beverly Hills',
      internet: 'Fiber Available'
    },
    isFavorite: false,
    views: 1247,
    saves: 89,
    marketInsights: {
      pricePerSqft: 891,
      neighborhoodAvg: 1150,
      appreciation: 8.5,
      inventory: 23,
      daysOnMarketAvg: 45
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const handleContactSubmit = () => {
    console.log('Contact form submitted:', contactForm);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.address}</h1>
          <div className="flex items-center space-x-4 text-gray-600">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {property.neighborhood}
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              {property.views} views
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {property.daysOnMarket} days on market
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            Save
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card>
            <div className="relative">
              <img
                src={property.images[currentImageIndex]}
                alt={`Property view ${currentImageIndex + 1}`}
                className="w-full h-96 object-cover rounded-t-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute left-2 top-1/2 transform -translate-y-1/2"
                onClick={prevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={nextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-2 flex space-x-1">
                <Badge variant="secondary" className="bg-black/50 text-white">
                  <Camera className="h-3 w-3 mr-1" />
                  {property.images.length} Photos
                </Badge>
                {property.virtualTour && (
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    <Video className="h-3 w-3 mr-1" />
                    Virtual Tour
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4 flex space-x-2 overflow-x-auto">
              {property.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className={`w-16 h-16 object-cover rounded cursor-pointer ${
                    index === currentImageIndex ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </Card>

          {/* Property Details Tabs */}
          <Card>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>
                <TabsTrigger value="insights">Market Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Bed className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{property.bedrooms}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Bath className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{property.bathrooms}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Square className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{property.sqft.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Sq Ft</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Home className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{property.yearBuilt}</div>
                    <div className="text-sm text-gray-600">Year Built</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Property Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Property Type:</span>
                        <span>{property.propertyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lot Size:</span>
                        <span>{property.lotSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Walk Score:</span>
                        <span>{property.walkScore}/100</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Financial Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Annual Taxes:</span>
                        <span>${property.taxes.annual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HOA Fee:</span>
                        <span>${property.hoa.fee}/{property.hoa.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Price per Sq Ft:</span>
                        <span>${property.marketInsights.pricePerSqft}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Interior Features</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {property.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="justify-start">
                          <Shield className="h-3 w-3 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {property.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="justify-start">
                          <Zap className="h-3 w-3 mr-1" />
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="neighborhood" className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Schools</h3>
                    <div className="space-y-2">
                      {property.nearbyPlaces.schools.map((school, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <School className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium">{school.name}</div>
                              <div className="text-sm text-gray-600">{school.type} • {school.distance}</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="font-medium">{school.rating}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Shopping & Dining</h3>
                    <div className="space-y-2">
                      {property.nearbyPlaces.shopping.map((place, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <ShoppingCart className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium">{place.name}</div>
                            <div className="text-sm text-gray-600">{place.type} • {place.distance}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Market Insights</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Price per Sq Ft</span>
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold">${property.marketInsights.pricePerSqft}</div>
                        <div className="text-sm text-gray-600">
                          Neighborhood avg: ${property.marketInsights.neighborhoodAvg}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Price Appreciation</span>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          +{property.marketInsights.appreciation}%
                        </div>
                        <div className="text-sm text-gray-600">Last 12 months</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Price and Contact */}
        <div className="space-y-6">
          {/* Price Card */}
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${property.price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                ${Math.round(property.price / property.sqft)} per sq ft
              </div>
              
              <div className="space-y-3 mb-6">
                <Button className="w-full" size="lg">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Agent
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setShowMortgageCalculator(!showMortgageCalculator)}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Mortgage Calculator
                </Button>
                {property.virtualTour && (
                  <Button variant="outline" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Virtual Tour
                  </Button>
                )}
              </div>

              {showMortgageCalculator && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Mortgage Calculator</h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Down Payment (20%)</Label>
                      <div className="text-sm font-medium">${(property.price * 0.2).toLocaleString()}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Monthly Payment (Est.)</Label>
                      <div className="text-sm font-medium">$12,847</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={property.agent.photo}
                  alt={property.agent.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="font-semibold">{property.agent.name}</div>
                  <div className="text-sm text-gray-600">{property.agent.experience} years experience</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{property.agent.bio}</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Phone className="h-4 w-4 mr-2" />
                  {property.agent.phone}
                </Button>
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Agent
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Your email"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Your phone number"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>
              <Button className="w-full" onClick={handleContactSubmit}>
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}