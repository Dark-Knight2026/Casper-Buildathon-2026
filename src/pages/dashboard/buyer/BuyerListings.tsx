import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  Eye,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface PropertyListing {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  listingType: 'rental' | 'for_sale';
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  price: number;
  monthlyRent?: number;
  status: 'active' | 'pending' | 'sold' | 'rented';
  views: number;
  inquiries: number;
  daysOnMarket: number;
  image?: string;
  createdAt: string;
}

export default function BuyerListings() {
  const [myListings] = useState<PropertyListing[]>([]);

  const getListingStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rented': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatPrice = (listing: PropertyListing) => {
    if (listing.listingType === 'for_sale') {
      return `$${listing.price.toLocaleString()}`;
    } else {
      return `$${listing.price.toLocaleString()}/mo`;
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">My Property Listings</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your property listings and track their performance
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {myListings.length > 0 ? (
              <div className="space-y-6">
                {myListings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row">
                      {/* Property Image Placeholder */}
                      <div className="w-full md:w-48 h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                        <Home className="h-16 w-16 text-blue-400" />
                      </div>

                      {/* Property Details */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold mb-2 capitalize">
                              {listing.title}
                            </h3>
                            <p className="text-gray-600 flex items-center mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {listing.address}, {listing.city}, {listing.state} {listing.zipCode}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center">
                                <Bed className="h-4 w-4 mr-1" />
                                {listing.bedrooms} bed
                              </span>
                              <span className="flex items-center">
                                <Bath className="h-4 w-4 mr-1" />
                                {listing.bathrooms} bath
                              </span>
                              <span className="flex items-center">
                                <Square className="h-4 w-4 mr-1" />
                                {listing.squareFootage.toLocaleString()} sqft
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="capitalize">
                                {listing.propertyType.replace('-', ' ')}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {listing.listingType === 'for_sale' ? 'For Sale' : 'Rental'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600 mb-2">
                              {formatPrice(listing)}
                            </div>
                            <Badge className={getListingStatusColor(listing.status)} variant="outline">
                              {listing.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center mb-1">
                              <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="font-semibold">{listing.daysOnMarket}</span>
                            </div>
                            <div className="text-gray-600 text-xs">Days on Market</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center mb-1">
                              <Eye className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="font-semibold">{listing.views}</span>
                            </div>
                            <div className="text-gray-600 text-xs">Views</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-center mb-1">
                              <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="font-semibold">{listing.inquiries}</span>
                            </div>
                            <div className="text-gray-600 text-xs">Inquiries</div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                          <Button size="sm" variant="outline">
                            Edit Listing
                          </Button>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            Share
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Home}
                title="No listings yet"
                description="You don't have any property listings at the moment"
              />
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        {myListings.length === 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Browse Available Properties
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    As a buyer, you can browse and save properties you're interested in. Use the search and recommendations features to find your dream home.
                  </p>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Browse thousands of available properties</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Save favorites to your wishlist</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Schedule property tours</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Make offers on properties you love</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
}