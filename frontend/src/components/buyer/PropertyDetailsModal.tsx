import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Property } from '../../types/buyer';
import {
  X,
  Heart,
  Share2,
  Calendar,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Car,
  Home,
  TrendingUp,
  School,
  ShoppingCart,
  Coffee,
  Trees,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  Wifi,
  Dumbbell,
  FileText,
} from 'lucide-react';

interface PropertyDetailsModalProps {
  property: Property;
  onClose: () => void;
  onToggleWishlist: (propertyId: string) => void;
  onScheduleTour: (propertyId: string) => void;
  onMakeOffer: (propertyId: string) => void;
  isInWishlist: boolean;
  similarProperties?: Property[];
}

export function PropertyDetailsModal({
  property,
  onClose,
  onToggleWishlist,
  onScheduleTour,
  onMakeOffer,
  isInWishlist,
  similarProperties = [],
}: PropertyDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const priceHistory = [
    { date: '2024-01-01', price: property.price + 20000, event: 'Listed' },
    { date: '2024-01-15', price: property.price + 10000, event: 'Price Reduced' },
    { date: '2024-02-01', price: property.price, event: 'Price Reduced' },
  ];

  // Helper to check for features safely
  const hasFeature = (keyword: string) => {
    if (!property.features) return false;
    const lowerKeyword = keyword.toLowerCase();
    return property.features.some(f => f.toLowerCase().includes(lowerKeyword));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-auto">
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold">{property.title}</h2>
                  <p className="text-sm text-gray-600">
                    {property.address}, {property.city}, {property.state} {property.zipCode}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button
                  variant={isInWishlist ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => onToggleWishlist(property.id)}
                >
                  <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative h-[60vh] bg-black">
          <img
            src={property.images[currentImageIndex]}
            alt={property.title}
            className="w-full h-full object-contain"
          />
          {property.images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                onClick={prevImage}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                onClick={nextImage}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {property.images.length}
              </div>
            </>
          )}
          <div className="absolute bottom-4 left-4 flex gap-2">
            {property.images.slice(0, 5).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-16 h-16 rounded overflow-hidden border-2 ${
                  idx === currentImageIndex ? 'border-white' : 'border-transparent'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price and Key Info */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-3xl font-bold text-green-900">
                        ${property.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        ${(property.price / property.squareFeet).toFixed(0)}/sq ft
                      </p>
                    </div>
                    <Badge className="bg-green-600">Available</Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Bed className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{property.bedrooms}</p>
                      <p className="text-xs text-gray-600">Bedrooms</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Bath className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{property.bathrooms}</p>
                      <p className="text-xs text-gray-600">Bathrooms</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Maximize className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{property.squareFeet.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Sq Ft</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Home className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold">{property.yearBuilt || 'N/A'}</p>
                      <p className="text-xs text-gray-600">Year Built</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{property.description}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Key Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-3">
                        {(hasFeature('parking') || hasFeature('garage')) && (
                          <div className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-blue-600" />
                            <span>Parking Available</span>
                          </div>
                        )}
                        {hasFeature('pool') && (
                          <div className="flex items-center gap-2">
                            <Wifi className="w-5 h-5 text-blue-600" />
                            <span>Swimming Pool</span>
                          </div>
                        )}
                        {hasFeature('gym') && (
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-blue-600" />
                            <span>Fitness Center</span>
                          </div>
                        )}
                        {(hasFeature('garden') || hasFeature('yard')) && (
                          <div className="flex items-center gap-2">
                            <Trees className="w-5 h-5 text-blue-600" />
                            <span>Garden/Yard</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Property Type:</span>
                            <span className="font-semibold capitalize">{property.propertyType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Year Built:</span>
                            <span className="font-semibold">{property.yearBuilt || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Lot Size:</span>
                            <span className="font-semibold">0.25 acres</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">HOA Fees:</span>
                            <span className="font-semibold">$250/month</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Heating:</span>
                            <span className="font-semibold">Central</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cooling:</span>
                            <span className="font-semibold">Central A/C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Parking:</span>
                            <span className="font-semibold">2-car garage</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Stories:</span>
                            <span className="font-semibold">2</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="neighborhood" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Neighborhood Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Walk Score</span>
                            <span className="text-sm font-bold">
                              {property.walkScore || 'N/A'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${property.walkScore || 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Transit Score</span>
                            <span className="text-sm font-bold">
                              {property.transitScore || 'N/A'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${property.transitScore || 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">School Rating</span>
                            <span className="text-sm font-bold">
                              {property.schoolRating || 'N/A'}/10
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{
                                width: `${((property.schoolRating || 0) / 10) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Nearby Amenities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <School className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-semibold">Lincoln Elementary School</p>
                            <p className="text-sm text-gray-600">0.5 miles • Rating: 9/10</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <ShoppingCart className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-semibold">Whole Foods Market</p>
                            <p className="text-sm text-gray-600">1.2 miles</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Coffee className="w-5 h-5 text-orange-600" />
                          <div>
                            <p className="font-semibold">Downtown Shopping District</p>
                            <p className="text-sm text-gray-600">2.0 miles</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Trees className="w-5 h-5 text-green-700" />
                          <div>
                            <p className="font-semibold">Central Park</p>
                            <p className="text-sm text-gray-600">0.8 miles</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Price History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {priceHistory.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-shrink-0">
                              <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{item.event}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(item.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-900">
                                ${item.price.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Days on Market</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center p-6 bg-blue-50 rounded-lg">
                        <p className="text-4xl font-bold text-blue-900 mb-2">32</p>
                        <p className="text-gray-600">Days on Market</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Similar Properties */}
              {similarProperties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Similar Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {similarProperties.slice(0, 4).map((prop) => (
                        <div key={prop.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                          <img
                            src={prop.images[0]}
                            alt={prop.title}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                          <p className="font-semibold text-sm line-clamp-1">{prop.title}</p>
                          <p className="text-lg font-bold text-green-900">
                            ${prop.price.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                            <span>{prop.bedrooms} bd</span>
                            <span>{prop.bathrooms} ba</span>
                            <span>{prop.squareFeet.toLocaleString()} sqft</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    onClick={() => onMakeOffer(property.id)}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Make an Offer
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={() => onScheduleTour(property.id)}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Schedule Tour
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={() => onToggleWishlist(property.id)}
                  >
                    <Heart className={`w-5 h-5 mr-2 ${isInWishlist ? 'fill-current' : ''}`} />
                    {isInWishlist ? 'Saved' : 'Save Property'}
                  </Button>
                </CardContent>
              </Card>

              {/* Agent Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Listing Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=64&h=64&fit=crop&crop=face"
                      alt="Agent"
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <p className="font-semibold">{property.agentName || 'Sarah Johnson'}</p>
                      <p className="text-sm text-gray-600">Premier Realty</p>
                      <p className="text-sm text-gray-600">⭐ 4.9 (127 reviews)</p>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    Contact Agent
                  </Button>
                </CardContent>
              </Card>

              {/* Monthly Payment Estimate */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Est. Monthly Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-blue-900">
                      ${Math.round((property.price * 0.8 * 0.07) / 12).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">per month</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Principal & Interest:</span>
                      <span className="font-semibold">
                        ${Math.round((property.price * 0.8 * 0.06) / 12).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Property Tax:</span>
                      <span className="font-semibold">$450</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">HOA:</span>
                      <span className="font-semibold">$250</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Insurance:</span>
                      <span className="font-semibold">$150</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline" size="sm">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Calculate Full Payment
                  </Button>
                </CardContent>
              </Card>

              {/* Map */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {property.address}, {property.city}, {property.state} {property.zipCode}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}