import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, 
  FileText, 
  BarChart3, 
  Clock, 
  DollarSign,
  Users,
  TrendingUp,
  Camera,
  Calendar
} from 'lucide-react';

export default function EnhancedSellerOffers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('offers');

  const receivedOffers = [
    {
      id: 1,
      property: '123 Main Street, Norfolk',
      buyer: 'John & Sarah Smith',
      offerAmount: 850000,
      listPrice: 875000,
      status: 'pending',
      submittedDate: '2024-01-10',
      contingencies: ['Inspection', 'Financing', 'Appraisal'],
      earnestMoney: 17000,
      closingDate: '2024-03-15'
    },
    {
      id: 2,
      property: '456 Oak Avenue, Virginia Beach',
      buyer: 'Robert Johnson',
      offerAmount: 720000,
      listPrice: 750000,
      status: 'reviewed',
      submittedDate: '2024-01-08',
      contingencies: ['Inspection', 'Financing'],
      earnestMoney: 14400,
      closingDate: '2024-02-28'
    }
  ];

  const myListings = [
    {
      id: 1,
      address: '123 Main Street, Norfolk',
      listPrice: 875000,
      daysOnMarket: 12,
      views: 245,
      showings: 18,
      offers: 3,
      status: 'active'
    },
    {
      id: 2,
      address: '456 Oak Avenue, Virginia Beach',
      listPrice: 750000,
      daysOnMarket: 8,
      views: 189,
      showings: 14,
      offers: 2,
      status: 'active'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Seller Features</h1>
          <p className="text-gray-600 mt-1">
            Advanced tools for home sellers - offer management, market analytics, and listing optimization
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="offers">Received Offers</TabsTrigger>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="analytics">Performance</TabsTrigger>
            <TabsTrigger value="marketing">Marketing Tools</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Offers</p>
                      <p className="text-2xl font-bold text-green-600">{receivedOffers.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Highest Offer</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${Math.max(...receivedOffers.map(o => o.offerAmount)).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Review</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {receivedOffers.filter(o => o.status === 'pending').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Listings</p>
                      <p className="text-2xl font-bold text-purple-600">{myListings.length}</p>
                    </div>
                    <Home className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Received Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {receivedOffers.map((offer) => (
                    <div key={offer.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{offer.property}</h4>
                          <p className="text-sm text-gray-600">
                            Buyer: {offer.buyer} • Submitted: {offer.submittedDate}
                          </p>
                        </div>
                        <Badge className={
                          offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          offer.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {offer.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Offer Amount</p>
                          <p className="font-medium text-lg text-green-600">${offer.offerAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">List Price</p>
                          <p className="font-medium">${offer.listPrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Earnest Money</p>
                          <p className="font-medium">${offer.earnestMoney.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Closing Date</p>
                          <p className="font-medium">{offer.closingDate}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">Contingencies:</p>
                        <div className="flex flex-wrap gap-2">
                          {offer.contingencies.map((contingency, index) => (
                            <Badge key={index} variant="outline">{contingency}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">Accept</Button>
                        <Button size="sm" variant="outline">Counter Offer</Button>
                        <Button size="sm" variant="outline">View Details</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200">Decline</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  My Active Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <div key={listing.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{listing.address}</h4>
                          <p className="text-sm text-gray-600">
                            Listed at ${listing.listPrice.toLocaleString()}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">{listing.status}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Days on Market</p>
                          <p className="font-medium text-lg">{listing.daysOnMarket}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Views</p>
                          <p className="font-medium">{listing.views}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Showings</p>
                          <p className="font-medium">{listing.showings}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Offers</p>
                          <p className="font-medium text-green-600">{listing.offers}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button size="sm">View Listing</Button>
                        <Button size="sm" variant="outline">Edit Details</Button>
                        <Button size="sm" variant="outline">Schedule Showing</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Analytics</h3>
                <p className="text-gray-600">Detailed analytics on listing performance, market trends, and pricing optimization</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing">
            <Card>
              <CardContent className="p-6 text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Marketing Tools</h3>
                <p className="text-gray-600">Professional photography, virtual tours, and social media marketing tools</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing Strategy</h3>
                <p className="text-gray-600">AI-powered pricing recommendations and market comparison analysis</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}