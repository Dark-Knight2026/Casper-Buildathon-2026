import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, 
  FileText, 
  DollarSign, 
  Wrench, 
  Heart,
  Calendar,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';

export default function EnhancedTenantOffers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('applications');

  const myApplications = [
    {
      id: 1,
      property: 'Harbor View Apartments - Unit 3B',
      address: '456 Harbor Drive, Virginia Beach, VA',
      rent: 1650,
      status: 'pending',
      submittedDate: '2024-01-10',
      landlord: 'Jennifer Martinez',
      moveInDate: '2024-02-01'
    },
    {
      id: 2,
      property: 'Downtown Loft - Unit 5A',
      address: '789 Main Street, Norfolk, VA',
      rent: 2100,
      status: 'approved',
      submittedDate: '2024-01-08',
      landlord: 'Michael Chen',
      moveInDate: '2024-01-15'
    }
  ];

  const savedProperties = [
    {
      id: 1,
      title: 'Oceanview Condos',
      address: '321 Beach Road, Virginia Beach, VA',
      rent: 1850,
      beds: 2,
      baths: 2,
      sqft: 1200,
      available: '2024-02-15'
    },
    {
      id: 2,
      title: 'Garden Apartments',
      address: '654 Oak Street, Norfolk, VA',
      rent: 1450,
      beds: 1,
      baths: 1,
      sqft: 900,
      available: '2024-01-20'
    }
  ];

  const currentLease = {
    property: 'Oak Street Apartments - Unit 4B',
    address: '123 Oak Street, Norfolk, VA',
    rent: 1850,
    leaseEnd: '2024-12-31',
    landlord: 'Jennifer Martinez',
    renewalOption: true
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Tenant Features</h1>
          <p className="text-gray-600 mt-1">
            Advanced rental tools - digital applications, lease management, and maintenance requests
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="applications">My Applications</TabsTrigger>
            <TabsTrigger value="lease">Current Lease</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="saved">Saved Properties</TabsTrigger>
            <TabsTrigger value="payments">Rent Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Applications</p>
                      <p className="text-2xl font-bold text-teal-600">{myApplications.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-teal-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {myApplications.filter(app => app.status === 'pending').length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-green-600">
                        {myApplications.filter(app => app.status === 'approved').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Saved Properties</p>
                      <p className="text-2xl font-bold text-blue-600">{savedProperties.length}</p>
                    </div>
                    <Heart className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>My Rental Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myApplications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{application.property}</h4>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {application.address}
                          </p>
                        </div>
                        <Badge className={
                          application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          application.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {application.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Monthly Rent</p>
                          <p className="font-medium text-lg text-teal-600">${application.rent}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Landlord</p>
                          <p className="font-medium">{application.landlord}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Move-in Date</p>
                          <p className="font-medium">{application.moveInDate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Applied</p>
                          <p className="font-medium">{application.submittedDate}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">View Application</Button>
                        {application.status === 'approved' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">Sign Lease</Button>
                        )}
                        {application.status === 'pending' && (
                          <Button size="sm" variant="outline">Contact Landlord</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lease" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Lease Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-lg mb-4">{currentLease.property}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span className="font-medium">{currentLease.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Rent:</span>
                        <span className="font-medium text-teal-600">${currentLease.rent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lease Ends:</span>
                        <span className="font-medium">{currentLease.leaseEnd}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Landlord:</span>
                        <span className="font-medium">{currentLease.landlord}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Lease Actions</h4>
                    <div className="space-y-2">
                      <Button className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Renewal Discussion
                      </Button>
                      <Button className="w-full" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Download Lease Copy
                      </Button>
                      <Button className="w-full" variant="outline">
                        Contact Landlord
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardContent className="p-6 text-center">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Maintenance Requests</h3>
                <p className="text-gray-600 mb-4">Submit and track maintenance requests for your rental unit</p>
                <Button>Submit New Request</Button>
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
                        <h4 className="font-medium text-lg">{property.title}</h4>
                        <Button variant="ghost" size="sm">
                          <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {property.address}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600">Rent</p>
                          <p className="font-medium">${property.rent}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Beds/Baths</p>
                          <p className="font-medium">{property.beds}/{property.baths}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Sq Ft</p>
                          <p className="font-medium">{property.sqft}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-gray-600">Available:</span>
                        <span className="font-medium">{property.available}</span>
                      </div>
                      <Button className="w-full">Apply Now</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rent Payment Portal</h3>
                <p className="text-gray-600">Online rent payments, payment history, and automatic payment setup</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}