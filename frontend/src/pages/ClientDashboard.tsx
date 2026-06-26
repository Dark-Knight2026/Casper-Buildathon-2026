import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  Search,
  Heart,
  Calendar,
  FileText,
  User,
  Bell,
  MessageSquare,
  Star,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square
} from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for client dashboard
  const savedProperties = [
    {
      id: 1,
      title: 'Modern Downtown Condo',
      address: '567 Main Street, Norfolk, VA',
      price: 325000,
      bedrooms: 2,
      bathrooms: 2,
      squareFootage: 1200,
      image: '/api/placeholder/300/200',
      saved: true
    },
    {
      id: 2,
      title: 'Waterfront Colonial',
      address: '1234 Ocean View Drive, Virginia Beach, VA',
      price: 485000,
      bedrooms: 4,
      bathrooms: 3,
      squareFootage: 2800,
      image: '/api/placeholder/300/200',
      saved: true
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Property Viewing',
      property: 'Modern Downtown Condo',
      agent: 'Mike Agent',
      date: '2024-01-15',
      time: '10:00 AM',
      status: 'confirmed'
    },
    {
      id: 2,
      type: 'Consultation',
      property: 'Mortgage Pre-approval',
      agent: 'Sarah Johnson',
      date: '2024-01-16',
      time: '2:00 PM',
      status: 'pending'
    }
  ];

  const messages = [
    {
      id: 1,
      from: 'Mike Agent',
      subject: 'New Properties Matching Your Criteria',
      preview: 'I found 3 new properties that match your search criteria...',
      date: '2024-01-14',
      unread: true
    },
    {
      id: 2,
      from: 'KeyChain Realty',
      subject: 'Market Update for Virginia Beach',
      preview: 'Here\'s your monthly market update with the latest trends...',
      date: '2024-01-12',
      unread: false
    }
  ];

  const searchCriteria = {
    location: 'Norfolk, VA',
    priceRange: '$200K - $400K',
    bedrooms: '2-3',
    propertyType: 'Condo, Townhouse'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Client'}! Track your property search and manage your real estate journey.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="saved">Saved Properties</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Heart className="h-8 w-8 text-red-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Saved Properties</p>
                      <p className="text-2xl font-bold text-gray-900">{savedProperties.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
                      <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                      <p className="text-2xl font-bold text-gray-900">{messages.filter(m => m.unread).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Search className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Searches</p>
                      <p className="text-2xl font-bold text-gray-900">1</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search Criteria */}
            <Card>
              <CardHeader>
                <CardTitle>Your Search Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Location</p>
                    <p className="text-lg font-semibold">{searchCriteria.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Price Range</p>
                    <p className="text-lg font-semibold">{searchCriteria.priceRange}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bedrooms</p>
                    <p className="text-lg font-semibold">{searchCriteria.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Property Type</p>
                    <p className="text-lg font-semibold">{searchCriteria.propertyType}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button>Update Search Criteria</Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Messages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {messages.slice(0, 3).map((message) => (
                      <div key={message.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{message.from}</p>
                            {message.unread && <Badge className="bg-red-100 text-red-800">New</Badge>}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{message.subject}</p>
                          <p className="text-xs text-gray-500 mt-1">{message.preview}</p>
                          <p className="text-xs text-gray-400 mt-1">{message.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">{appointment.type}</p>
                          <p className="text-sm text-gray-600">{appointment.property}</p>
                          <p className="text-xs text-gray-500">{appointment.date} at {appointment.time}</p>
                          <p className="text-xs text-gray-500">with {appointment.agent}</p>
                        </div>
                        <Badge className={appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savedProperties.map((property) => (
                    <Card key={property.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                          <Home className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{property.title}</h3>
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">{property.address}</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600 mb-3">
                          ${property.price.toLocaleString()}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <Bed className="h-4 w-4 mr-1" />
                            <span>{property.bedrooms} bed</span>
                          </div>
                          <div className="flex items-center">
                            <Bath className="h-4 w-4 mr-1" />
                            <span>{property.bathrooms} bath</span>
                          </div>
                          <div className="flex items-center">
                            <Square className="h-4 w-4 mr-1" />
                            <span>{property.squareFootage.toLocaleString()} sqft</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="flex-1">View Details</Button>
                          <Button size="sm" variant="outline">Schedule Tour</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Appointments</CardTitle>
                  <Button>Schedule New Appointment</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{appointment.type}</h3>
                            <p className="text-gray-600">{appointment.property}</p>
                            <p className="text-sm text-gray-500">
                              {appointment.date} at {appointment.time} with {appointment.agent}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {appointment.status}
                            </Badge>
                            <Button size="sm" variant="outline">Reschedule</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card key={message.id} className={message.unread ? 'border-blue-200 bg-blue-50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold">{message.from}</h3>
                              {message.unread && <Badge className="bg-red-100 text-red-800">New</Badge>}
                            </div>
                            <p className="font-medium text-gray-900 mb-1">{message.subject}</p>
                            <p className="text-sm text-gray-600 mb-2">{message.preview}</p>
                            <p className="text-xs text-gray-500">{message.date}</p>
                          </div>
                          <Button size="sm" variant="outline">Reply</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <p className="text-lg font-semibold">{user?.name || 'Client Name'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-lg font-semibold">{user?.email || 'client@example.com'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-lg font-semibold">(757) 555-0123</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                      <p className="text-lg font-semibold">Email</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button>Edit Profile</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}