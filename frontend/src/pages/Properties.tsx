import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  PieChart
} from 'lucide-react';

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const properties = [
    {
      id: 1,
      name: 'Downtown Luxury Apartments',
      type: 'Residential',
      address: '123 Main St, Downtown',
      units: 24,
      occupied: 22,
      monthlyRevenue: 28800,
      value: 2400000,
      rentType: 'Long-term',
      status: 'Active',
      fractionalShares: 45,
      image: '/api/placeholder/300/200'
    },
    {
      id: 2,
      name: 'Beachside Vacation Rentals',
      type: 'Short-term Rental',
      address: '456 Ocean Ave, Beach District',
      units: 8,
      occupied: 6,
      monthlyRevenue: 15600,
      value: 1200000,
      rentType: 'Short-term',
      status: 'Active',
      fractionalShares: 32,
      image: '/api/placeholder/300/200'
    },
    {
      id: 3,
      name: 'Commercial Plaza',
      type: 'Commercial',
      address: '789 Business Blvd, Financial District',
      units: 12,
      occupied: 10,
      monthlyRevenue: 45000,
      value: 3600000,
      rentType: 'Long-term',
      status: 'Active',
      fractionalShares: 78,
      image: '/api/placeholder/300/200'
    },
    {
      id: 4,
      name: 'Student Housing Complex',
      type: 'Residential',
      address: '321 University Way, Campus Area',
      units: 48,
      occupied: 44,
      monthlyRevenue: 35200,
      value: 1800000,
      rentType: 'Long-term',
      status: 'Active',
      fractionalShares: 28,
      image: '/api/placeholder/300/200'
    }
  ];

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || property.type.toLowerCase().includes(filterType.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-2">Manage your real estate portfolio</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="short-term">Short-term Rental</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <Badge variant={property.status === 'Active' ? 'default' : 'secondary'}>
                      {property.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="font-medium">{property.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rent Type</p>
                      <p className="font-medium">{property.rentType}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Units</p>
                      <p className="font-medium">{property.units}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Occupied</p>
                      <p className="font-medium">{property.occupied}/{property.units}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Monthly Revenue</p>
                      <p className="font-medium text-green-600">${property.monthlyRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fractional Shares</p>
                      <p className="font-medium">{property.fractionalShares}% sold</p>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <PieChart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Property List</CardTitle>
              <CardDescription>Detailed view of all properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProperties.map((property) => (
                  <div key={property.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{property.name}</h3>
                        <p className="text-sm text-gray-600">{property.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium">{property.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Occupancy</p>
                        <p className="font-medium">{property.occupied}/{property.units}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Revenue</p>
                        <p className="font-medium text-green-600">${property.monthlyRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fractional</p>
                        <p className="font-medium">{property.fractionalShares}% sold</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Value</span>
                    <span className="text-2xl font-bold">${(properties.reduce((sum, p) => sum + p.value, 0) / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly Revenue</span>
                    <span className="text-xl font-semibold text-green-600">${properties.reduce((sum, p) => sum + p.monthlyRevenue, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Units</span>
                    <span className="text-xl font-semibold">{properties.reduce((sum, p) => sum + p.units, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Occupancy Rate</span>
                    <span className="text-xl font-semibold">
                      {Math.round((properties.reduce((sum, p) => sum + p.occupied, 0) / properties.reduce((sum, p) => sum + p.units, 0)) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fractional Ownership Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {properties.map((property) => (
                    <div key={property.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{property.name}</span>
                        <span className="font-medium">{property.fractionalShares}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${property.fractionalShares}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}