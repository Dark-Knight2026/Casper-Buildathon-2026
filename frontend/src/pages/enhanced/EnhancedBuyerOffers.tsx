import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Heart, 
  FileText, 
  Calculator, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Home,
  TrendingUp
} from 'lucide-react';

export default function EnhancedBuyerOffers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('offers');

  const myOffers = [
    {
      id: 1,
      property: '123 Oak Street, Norfolk',
      offerAmount: 850000,
      status: 'pending',
      submittedDate: '2024-01-10',
      responseDeadline: '2024-01-12',
      contingencies: ['Inspection', 'Financing', 'Appraisal']
    },
    {
      id: 2,
      property: '456 Harbor Drive, Virginia Beach',
      offerAmount: 720000,
      status: 'countered',
      submittedDate: '2024-01-08',
      counterOffer: 750000,
      contingencies: ['Inspection', 'Financing']
    }
  ];

  const savedProperties = [
    {
      id: 1,
      address: '789 Pine Avenue, Chesapeake',
      price: 650000,
      beds: 4,
      baths: 3,
      sqft: 2800,
      status: 'active'
    },
    {
      id: 2,
      address: '321 Elm Street, Portsmouth',
      price: 485000,
      beds: 3,
      baths: 2,
      sqft: 2200,
      status: 'active'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Buyer Features</h1>
          <p className="text-gray-600 mt-1">
            Advanced tools for home buyers - digital offers, market analysis, and more
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="offers">My Offers</TabsTrigger>
            <TabsTrigger value="calculator">Affordability</TabsTrigger>
            <TabsTrigger value="saved">Saved Properties</TabsTrigger>
            <TabsTrigger value="market">Market Analysis</TabsTrigger>
            <TabsTrigger value="financing">Pre-Approval</TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Offers</p>
                      <p className="text-2xl font-bold text-blue-600">{myOffers.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Offered</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${(myOffers.reduce((sum, offer) => sum + offer.offerAmount, 0) / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saved Properties</p>
                      <p className="text-2xl font-bold text-purple-600">{savedProperties.length}</p>
                    </div>
                    <Heart className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>My Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myOffers.map((offer) => (
                    <div key={offer.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{offer.property}</h4>
                          <p className="text-sm text-gray-600">
                            Submitted: {offer.submittedDate}
                          </p>
                        </div>
                        <Badge className={
                          offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          offer.status === 'countered' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {offer.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Your Offer</p>
                          <p className="font-medium text-lg">${offer.offerAmount.toLocaleString()}</p>
                        </div>
                        {offer.counterOffer && (
                          <div>
                            <p className="text-sm text-gray-600">Counter Offer</p>
                            <p className="font-medium text-lg text-blue-600">${offer.counterOffer.toLocaleString()}</p>
                          </div>
                        )}
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
                        <Button size="sm">View Details</Button>
                        {offer.status === 'countered' && (
                          <Button size="sm" variant="outline">Respond to Counter</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Affordability Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-4">Calculate Your Budget</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Annual Income
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-md"
                          placeholder="$75,000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monthly Debts
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-md"
                          placeholder="$500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Down Payment
                        </label>
                        <input 
                          type="number" 
                          className="w-full p-2 border rounded-md"
                          placeholder="$50,000"
                        />
                      </div>
                      <Button className="w-full">Calculate</Button>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="font-medium mb-4">Your Estimated Budget</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Maximum Home Price:</span>
                        <span className="font-medium">$425,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Payment:</span>
                        <span className="font-medium">$2,850</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Property Tax (est):</span>
                        <span className="font-medium">$354</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insurance (est):</span>
                        <span className="font-medium">$125</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Saved Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savedProperties.map((property) => (
                    <div key={property.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{property.address}</h4>
                        <Badge className="bg-green-100 text-green-800">{property.status}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Price</p>
                          <p className="font-medium">${(property.price / 1000).toFixed(0)}K</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Beds/Baths</p>
                          <p className="font-medium">{property.beds}/{property.baths}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Sq Ft</p>
                          <p className="font-medium">{property.sqft.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm">Make Offer</Button>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="market">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Analysis</h3>
                <p className="text-gray-600">Comprehensive market trends and property value analysis for buyers</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financing">
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pre-Approval Center</h3>
                <p className="text-gray-600">Get pre-approved for your mortgage and strengthen your offers</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}