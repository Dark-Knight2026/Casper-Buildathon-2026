import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Offer } from '@/types/agent';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Upload
} from 'lucide-react';

export default function ListingsOffers() {
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);

  // Mock offers data
  const offers: Offer[] = [
    {
      id: '1',
      propertyId: '3',
      buyerName: 'John Smith',
      buyerEmail: 'john.smith@email.com',
      amount: 435000,
      status: 'pending',
      submittedDate: new Date('2024-03-01'),
      conditions: ['Inspection contingency', 'Financing contingency'],
      financing: 'mortgage'
    },
    {
      id: '2',
      propertyId: '3',
      buyerName: 'Sarah Wilson',
      buyerEmail: 'sarah.w@email.com',
      amount: 445000,
      status: 'countered',
      submittedDate: new Date('2024-02-28'),
      conditions: ['Cash offer', 'Quick closing'],
      financing: 'cash'
    },
    {
      id: '3',
      propertyId: '4',
      buyerName: 'Mike Johnson',
      buyerEmail: 'mike.j@email.com',
      amount: 320000,
      status: 'accepted',
      submittedDate: new Date('2024-02-25'),
      conditions: ['Home inspection'],
      financing: 'mortgage'
    }
  ];

  const getOfferStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'countered': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFinancingColor = (financing: string) => {
    switch (financing) {
      case 'cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'mortgage': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Listings & Offers</h2>
          <p className="text-gray-600">Create listings and manage incoming offers</p>
        </div>
        <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Property Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Address</Label>
                    <Input placeholder="Enter full address" />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" step="0.5" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Square Feet</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Listing Price</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Description</h3>
                <div className="space-y-2">
                  <Label>Property Description</Label>
                  <Textarea 
                    placeholder="Describe the property features, amenities, and highlights..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Photos</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Upload property photos</p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>

              {/* Open House */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Open House Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateListingOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  Create Listing
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Offers */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Active Offers</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">789 Maple Drive</CardTitle>
                  <Badge className={`${getOfferStatusColor(offer.status)} border`}>
                    {offer.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Offer Amount</p>
                    <p className="text-xl font-bold text-green-600">
                      ${offer.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Financing</p>
                    <Badge className={`${getFinancingColor(offer.financing)} border mt-1`}>
                      {offer.financing}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{offer.buyerName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Submitted: {offer.submittedDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {offer.conditions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Conditions:</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.conditions.map((condition, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {offer.status === 'pending' && (
                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Counter
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-900">Offer Accepted</p>
                    <p className="text-xs text-green-700">Proceed with closing process</p>
                  </div>
                )}

                {offer.status === 'countered' && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Counter Offer Sent</p>
                    <p className="text-xs text-blue-700">Waiting for buyer response</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Manage Documents</h3>
            <p className="text-sm text-gray-600">Upload and share contracts, disclosures</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Schedule Showings</h3>
            <p className="text-sm text-gray-600">Book property viewings and open houses</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Off-Market Deals</h3>
            <p className="text-sm text-gray-600">Track private negotiations with owners</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}