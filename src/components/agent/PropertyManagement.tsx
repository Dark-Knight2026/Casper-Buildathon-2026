import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ManagedProperty, MaintenanceRequest } from '@/types/agent';
import { 
  Home, 
  DollarSign, 
  Calendar, 
  User, 
  Wrench,
  Search,
  Plus,
  Eye,
  Edit,
  AlertTriangle
} from 'lucide-react';

export default function PropertyManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('rental');

  // Mock data
  const rentalProperties: ManagedProperty[] = [
    {
      id: '1',
      address: '123 Oak Street, Downtown',
      type: 'rental',
      status: 'rented',
      price: 2500,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      images: ['/api/placeholder/300/200'],
      listingDate: new Date('2024-01-15'),
      tenant: {
        name: 'Alice Johnson',
        email: 'alice.j@email.com',
        phone: '(555) 123-4567',
        leaseStart: new Date('2024-02-01'),
        leaseEnd: new Date('2025-01-31'),
        monthlyRent: 2500,
        deposit: 5000
      }
    },
    {
      id: '2',
      address: '456 Pine Avenue, Midtown',
      type: 'rental',
      status: 'active',
      price: 1800,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 800,
      images: ['/api/placeholder/300/200'],
      listingDate: new Date('2024-02-20'),
    }
  ];

  const saleProperties: ManagedProperty[] = [
    {
      id: '3',
      address: '789 Maple Drive, Suburbs',
      type: 'sale',
      status: 'active',
      price: 450000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1800,
      images: ['/api/placeholder/300/200'],
      listingDate: new Date('2024-02-10'),
      daysOnMarket: 20,
      offers: [
        {
          id: '1',
          propertyId: '3',
          buyerName: 'John Smith',
          buyerEmail: 'john@email.com',
          amount: 435000,
          status: 'pending',
          submittedDate: new Date('2024-03-01'),
          conditions: ['Inspection contingency', 'Financing contingency'],
          financing: 'mortgage'
        }
      ]
    }
  ];

  const maintenanceRequests: MaintenanceRequest[] = [
    {
      id: '1',
      propertyId: '1',
      tenantName: 'Alice Johnson',
      title: 'Leaky faucet in kitchen',
      description: 'Kitchen faucet has been dripping for 3 days',
      priority: 'medium',
      status: 'open',
      submittedDate: new Date('2024-03-01')
    },
    {
      id: '2',
      propertyId: '1',
      tenantName: 'Alice Johnson',
      title: 'Heating not working',
      description: 'Heating system stopped working yesterday evening',
      priority: 'urgent',
      status: 'in-progress',
      submittedDate: new Date('2024-02-28'),
      contractor: 'ABC Heating Services'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'rented': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const currentProperties = activeView === 'rental' ? rentalProperties : saleProperties;
  const filteredProperties = currentProperties.filter(property =>
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
          <p className="text-gray-600">Manage your rental and sale properties</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="rental" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Rental Properties</span>
            </TabsTrigger>
            <TabsTrigger value="sale" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Sale Properties</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center space-x-2">
              <Wrench className="h-4 w-4" />
              <span>Maintenance</span>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Rental Properties */}
        <TabsContent value="rental" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getStatusColor(property.status)} border`}>
                      {property.status}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{property.address}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Monthly Rent</p>
                      <p className="font-semibold">${property.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Size</p>
                      <p className="font-semibold">{property.bedrooms}BR/{property.bathrooms}BA</p>
                    </div>
                  </div>

                  {property.tenant && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <p className="font-medium text-blue-900">Current Tenant</p>
                      </div>
                      <p className="text-sm text-blue-800">{property.tenant.name}</p>
                      <p className="text-xs text-blue-600">
                        Lease: {property.tenant.leaseStart.toLocaleDateString()} - {property.tenant.leaseEnd.toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                    {property.tenant && (
                      <Button size="sm" variant="outline" className="flex-1">
                        Contact Tenant
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Sale Properties */}
        <TabsContent value="sale" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saleProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${getStatusColor(property.status)} border`}>
                      {property.status}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{property.address}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Listing Price</p>
                      <p className="font-semibold">${property.price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Days on Market</p>
                      <p className="font-semibold">{property.daysOnMarket} days</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Beds</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Baths</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Sq Ft</p>
                      <p className="font-semibold">{property.sqft.toLocaleString()}</p>
                    </div>
                  </div>

                  {property.offers && property.offers.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="font-medium text-green-900 mb-1">
                        {property.offers.length} Active Offer{property.offers.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-green-700">
                        Highest: ${Math.max(...property.offers.map(o => o.amount)).toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Manage Offers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Maintenance Requests */}
        <TabsContent value="maintenance" className="space-y-6">
          <div className="space-y-4">
            {maintenanceRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.title}</h3>
                        <Badge className={`${getPriorityColor(request.priority)} border`}>
                          {request.priority}
                        </Badge>
                        <Badge variant="outline">
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Property</p>
                          <p className="font-medium">
                            {rentalProperties.find(p => p.id === request.propertyId)?.address}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Tenant</p>
                          <p className="font-medium">{request.tenantName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Submitted</p>
                          <p className="font-medium">{request.submittedDate.toLocaleDateString()}</p>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">{request.description}</p>

                      {request.contractor && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                          <p className="text-sm font-medium text-blue-900">Assigned Contractor</p>
                          <p className="text-sm text-blue-700">{request.contractor}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button size="sm" variant="outline">
                        Update Status
                      </Button>
                      <Button size="sm" variant="outline">
                        Contact Tenant
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}