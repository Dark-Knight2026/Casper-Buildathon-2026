import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/useAuth';
import InvestmentCalculator from '@/components/InvestmentCalculator';
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Calendar,
  Heart,
  Share2,
  Phone,
  Mail,
  Calculator,
  Camera,
  Play,
  School,
  ShoppingCart,
  Hospital,
  Coffee,
  ArrowLeft,
  Star,
  TrendingUp,
  Home,
  DollarSign
} from 'lucide-react';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mortgage Calculator State
  const [loanAmount, setLoanAmount] = useState(400000);
  const [downPayment, setDownPayment] = useState(80000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);

  // Mock property data - in real app, fetch based on ID
  const property = {
    id: id || '1',
    title: 'Stunning Waterfront Colonial',
    address: '1234 Ocean View Drive, Virginia Beach, VA 23451',
    price: 485000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2850,
    lotSize: '0.75 acres',
    yearBuilt: 2018,
    parking: 2,
    propertyType: 'Single Family',
    status: 'For Sale',
    daysOnMarket: 12,
    description: 'Discover luxury living in this stunning waterfront colonial home featuring panoramic ocean views, modern amenities, and premium finishes throughout. This exceptional property offers the perfect blend of coastal elegance and contemporary comfort.',
    features: [
      'Waterfront location with private dock',
      'Gourmet kitchen with granite countertops',
      'Master suite with ocean views',
      'Hardwood floors throughout',
      'Two-car garage',
      'Landscaped gardens',
      'Central air conditioning',
      'Security system'
    ],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    agent: {
      name: 'Sarah Johnson',
      phone: '(757) 555-0123',
      email: 'sarah.johnson@realestate.com',
      photo: '/api/placeholder/100/100',
      rating: 4.9,
      reviews: 127
    },
    neighborhood: {
      walkScore: 78,
      transitScore: 65,
      bikeScore: 82,
      schools: [
        { name: 'Ocean View Elementary', rating: 9, distance: '0.3 miles' },
        { name: 'Bayside Middle School', rating: 8, distance: '0.8 miles' },
        { name: 'First Colonial High', rating: 9, distance: '1.2 miles' }
      ],
      amenities: [
        { name: 'Whole Foods Market', type: 'grocery', distance: '0.5 miles' },
        { name: 'Virginia Beach General Hospital', type: 'hospital', distance: '2.1 miles' },
        { name: 'Town Center', type: 'shopping', distance: '1.8 miles' },
        { name: 'Starbucks', type: 'coffee', distance: '0.4 miles' }
      ]
    },
    marketTrends: {
      averagePrice: 425000,
      priceChange: '+5.2%',
      daysOnMarket: 18,
      pricePerSqft: 170
    }
  };

  // Calculate monthly payment
  const calculateMonthlyPayment = () => {
    const principal = loanAmount - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return monthlyPayment;
  };

  const monthlyPayment = calculateMonthlyPayment();

  useEffect(() => {
    setLoanAmount(property.price);
    setDownPayment(property.price * 0.2);
  }, [property.price]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/listings')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Listings
            </Button>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFavorited(!isFavorited)}
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="relative">
                <img 
                  src={property.images[activeImageIndex]} 
                  alt={property.title}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-600 text-white">
                    {property.status}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4 flex space-x-2">
                  <Button size="sm" variant="secondary" className="bg-white/80">
                    <Camera className="h-4 w-4 mr-1" />
                    {property.images.length}
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white/80">
                    <Play className="h-4 w-4 mr-1" />
                    Tour
                  </Button>
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {property.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`w-3 h-3 rounded-full ${
                        index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Property Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    <p className="text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      ${property.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${Math.round(property.price / property.sqft)}/sq ft
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bed className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <div className="font-semibold">{property.bedrooms}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bath className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <div className="font-semibold">{property.bathrooms}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Square className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <div className="font-semibold">{property.sqft.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Sq Ft</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Car className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <div className="font-semibold">{property.parking}</div>
                    <div className="text-sm text-gray-600">Parking</div>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </CardContent>
            </Card>

            {/* Detailed Tabs */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>
                  <TabsTrigger value="market">Market</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">Property Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Property Type:</span>
                          <span>{property.propertyType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Year Built:</span>
                          <span>{property.yearBuilt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lot Size:</span>
                          <span>{property.lotSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days on Market:</span>
                          <span>{property.daysOnMarket} days</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-3">Financial Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price per Sq Ft:</span>
                          <span>${Math.round(property.price / property.sqft)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Monthly Payment:</span>
                          <span>${Math.round(monthlyPayment).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Property Taxes:</span>
                          <span>${Math.round(property.price * 0.012 / 12).toLocaleString()}/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">HOA Fees:</span>
                          <span>$125/mo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="p-6">
                  <h3 className="font-semibold mb-4">Property Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="neighborhood" className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Walkability Scores</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{property.neighborhood.walkScore}</div>
                          <div className="text-sm text-gray-600">Walk Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{property.neighborhood.transitScore}</div>
                          <div className="text-sm text-gray-600">Transit Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{property.neighborhood.bikeScore}</div>
                          <div className="text-sm text-gray-600">Bike Score</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Schools</h3>
                      <div className="space-y-3">
                        {property.neighborhood.schools.map((school, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <School className="h-5 w-5 text-blue-600 mr-3" />
                              <div>
                                <div className="font-medium">{school.name}</div>
                                <div className="text-sm text-gray-600">{school.distance}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="font-semibold">{school.rating}/10</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Nearby Amenities</h3>
                      <div className="space-y-3">
                        {property.neighborhood.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              {amenity.type === 'grocery' && <ShoppingCart className="h-5 w-5 text-green-600 mr-3" />}
                              {amenity.type === 'hospital' && <Hospital className="h-5 w-5 text-red-600 mr-3" />}
                              {amenity.type === 'shopping' && <ShoppingCart className="h-5 w-5 text-purple-600 mr-3" />}
                              {amenity.type === 'coffee' && <Coffee className="h-5 w-5 text-orange-600 mr-3" />}
                              <div>
                                <div className="font-medium">{amenity.name}</div>
                                <div className="text-sm text-gray-600 capitalize">{amenity.type}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">{amenity.distance}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="market" className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Market Trends</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                          <div className="font-semibold">${property.marketTrends.averagePrice.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">Avg. Price</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                          <div className="font-semibold">{property.marketTrends.priceChange}</div>
                          <div className="text-sm text-gray-600">Price Change</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                          <div className="font-semibold">{property.marketTrends.daysOnMarket}</div>
                          <div className="text-sm text-gray-600">Avg. DOM</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <Home className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                          <div className="font-semibold">${property.marketTrends.pricePerSqft}</div>
                          <div className="text-sm text-gray-600">Price/Sq Ft</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Enhanced Investment Calculator */}
            <InvestmentCalculator 
              propertyPrice={property.price}
              propertyType={property.propertyType}
              location={property.address}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <img 
                    src={property.agent.photo} 
                    alt={property.agent.name}
                    className="w-16 h-16 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="font-semibold">{property.agent.name}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      {property.agent.rating} ({property.agent.reviews} reviews)
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Button className="w-full" size="lg">
                    <Phone className="h-4 w-4 mr-2" />
                    Call {property.agent.phone}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Tour
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mortgage Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Mortgage Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="loan-amount">Loan Amount</Label>
                  <Input
                    id="loan-amount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="down-payment">Down Payment</Label>
                  <Input
                    id="down-payment"
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <div className="px-3">
                    <Slider
                      value={[interestRate]}
                      onValueChange={(value) => setInterestRate(value[0])}
                      max={10}
                      min={3}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>3%</span>
                      <span>{interestRate}%</span>
                      <span>10%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="loan-term">Loan Term (years)</Label>
                  <div className="px-3">
                    <Slider
                      value={[loanTerm]}
                      onValueChange={(value) => setLoanTerm(value[0])}
                      max={30}
                      min={15}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>15</span>
                      <span>{loanTerm} years</span>
                      <span>30</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${Math.round(monthlyPayment).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Payment</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Offer Management CTA */}
            {user && ['buyer', 'seller', 'agent', 'broker', 'landlord', 'tenant'].includes(user.role) && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">Enhanced Offer Management</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Submit competitive offers with digital signatures and real-time tracking
                  </p>
                  <Button 
                    onClick={() => navigate('/enhanced-offers')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Make an Offer
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}