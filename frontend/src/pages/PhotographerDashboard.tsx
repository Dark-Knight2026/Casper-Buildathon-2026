import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Camera,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  Upload,
  Download,
  Eye,
  MapPin,
  DollarSign,
  Star,
  Image,
  Video,
  Zap
} from 'lucide-react';

export default function PhotographerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for photographer dashboard
  const shoots = [
    {
      id: 1,
      clientName: 'John & Sarah Smith',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      shootType: 'Listing Photography',
      status: 'Scheduled',
      priority: 'High',
      shootDate: '2024-01-16',
      deliveryDate: '2024-01-18',
      package: 'Premium Package',
      fee: 850,
      phone: '(757) 555-0123',
      email: 'john.smith@email.com'
    },
    {
      id: 2,
      clientName: 'Michael Johnson',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      shootType: 'Virtual Tour',
      status: 'In Progress',
      priority: 'Medium',
      shootDate: '2024-01-14',
      deliveryDate: '2024-01-17',
      package: 'Standard Package',
      fee: 650,
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com'
    },
    {
      id: 3,
      clientName: 'Emily Davis',
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      shootType: 'Drone Photography',
      status: 'Completed',
      priority: 'Low',
      shootDate: '2024-01-12',
      deliveryDate: '2024-01-14',
      package: 'Aerial Package',
      fee: 450,
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com'
    }
  ];

  const mediaGallery = [
    {
      id: 1,
      propertyAddress: '123 Main St, Virginia Beach, VA',
      shootDate: '2024-01-12',
      mediaType: 'Photos',
      totalFiles: 45,
      status: 'Delivered',
      clientApproval: 'Approved',
      downloadLink: '#'
    },
    {
      id: 2,
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      shootDate: '2024-01-14',
      mediaType: 'Virtual Tour',
      totalFiles: 1,
      status: 'Processing',
      clientApproval: 'Pending',
      downloadLink: null
    },
    {
      id: 3,
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      shootDate: '2024-01-10',
      mediaType: 'Drone Video',
      totalFiles: 3,
      status: 'Ready for Review',
      clientApproval: 'Under Review',
      downloadLink: '#'
    }
  ];

  const packages = [
    {
      name: 'Basic Package',
      price: 350,
      features: ['25-30 Photos', 'Basic Editing', '48hr Delivery', 'Online Gallery'],
      popular: false
    },
    {
      name: 'Standard Package',
      price: 650,
      features: ['40-50 Photos', 'Advanced Editing', 'Virtual Staging', '24hr Delivery', 'Online Gallery', 'Social Media Kit'],
      popular: true
    },
    {
      name: 'Premium Package',
      price: 850,
      features: ['60+ Photos', 'Premium Editing', 'Virtual Staging', 'Drone Photos', 'Virtual Tour', '24hr Delivery', 'Marketing Materials'],
      popular: false
    },
    {
      name: 'Aerial Package',
      price: 450,
      features: ['Drone Photography', 'Drone Video', 'Aerial Editing', '48hr Delivery', 'Online Gallery'],
      popular: false
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Property Shoot',
      client: 'John & Sarah Smith',
      date: '2024-01-16',
      time: '10:00 AM',
      purpose: 'Listing photography and virtual tour'
    },
    {
      id: 2,
      type: 'Client Review',
      client: 'Michael Johnson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Review and approve edited photos'
    }
  ];

  const performance = {
    activeShots: 6,
    completedShots: 32,
    avgDeliveryTime: 1.8,
    clientSatisfaction: 4.8,
    onTimeDelivery: 98.5
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'In Progress':
      case 'Processing': return 'bg-blue-100 text-blue-800';
      case 'Scheduled':
      case 'Ready for Review': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Under Review':
      case 'Pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered': return <CheckCircle className="h-4 w-4" />;
      case 'In Progress':
      case 'Processing': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Photographer Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Photographer'}! Manage shoots, media uploads, and client deliveries.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shoots">Shoots</TabsTrigger>
            <TabsTrigger value="media">Media Gallery</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Camera className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Shoots</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeShots}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.completedShots}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Delivery</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.avgDeliveryTime} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Client Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.clientSatisfaction}/5.0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Zap className="h-8 w-8 text-indigo-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">On-Time Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.onTimeDelivery}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Shoots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {shoots.filter(s => s.status !== 'Completed').slice(0, 3).map((shoot) => (
                      <div key={shoot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{shoot.clientName}</p>
                          <p className="text-sm text-gray-600">{shoot.shootType} • {shoot.package}</p>
                          <p className="text-xs text-gray-500">Fee: ${shoot.fee.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(shoot.status)}>
                            {shoot.status}
                          </Badge>
                          <Badge className={`${getPriorityColor(shoot.priority)} ml-1`}>
                            {shoot.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">{appointment.type}</p>
                          <p className="text-sm text-gray-600">{appointment.client}</p>
                          <p className="text-xs text-gray-500">{appointment.time} - {appointment.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shoots" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Photography Shoots</CardTitle>
                  <Button>Schedule New Shoot</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shoots.map((shoot) => (
                    <Card key={shoot.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{shoot.clientName}</h3>
                            <p className="text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {shoot.propertyAddress}
                            </p>
                            <p className="text-sm text-gray-500">{shoot.shootType}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(shoot.status)}>
                              {getStatusIcon(shoot.status)}
                              <span className="ml-1">{shoot.status}</span>
                            </Badge>
                            <Badge className={`${getPriorityColor(shoot.priority)} ml-2`}>
                              {shoot.priority} Priority
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Package & Fee</p>
                            <p className="font-medium">{shoot.package}</p>
                            <p className="text-lg font-bold text-green-600">${shoot.fee.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Shoot Date</p>
                            <p className="font-medium">{shoot.shootDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Delivery Date</p>
                            <p className="font-medium">{shoot.deliveryDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact</p>
                            <p className="text-sm">{shoot.phone}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                          <Button size="sm" variant="outline">
                            <Camera className="h-4 w-4 mr-1" />
                            Shoot Details
                          </Button>
                          <Button size="sm" variant="outline">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Media
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Media Gallery & Uploads</CardTitle>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Media
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mediaGallery.map((media) => (
                    <Card key={media.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              {media.mediaType === 'Photos' ? (
                                <Image className="h-8 w-8 text-blue-600" />
                              ) : (
                                <Video className="h-8 w-8 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold">{media.propertyAddress}</h3>
                              <p className="text-sm text-gray-600">{media.mediaType} • {media.totalFiles} files</p>
                              <p className="text-xs text-gray-500">Shot on: {media.shootDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(media.status)}>
                              {media.status}
                            </Badge>
                            <Badge className={`${getStatusColor(media.clientApproval)} ml-2`}>
                              {media.clientApproval}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          {media.downloadLink && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Send to Client
                          </Button>
                          <Button size="sm" variant="outline">
                            Edit Media
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Photography Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {packages.map((pkg, index) => (
                    <Card key={index} className={pkg.popular ? 'ring-2 ring-blue-500' : ''}>
                      <CardContent className="p-6">
                        {pkg.popular && (
                          <Badge className="mb-4 bg-blue-500 text-white">Most Popular</Badge>
                        )}
                        <h3 className="text-lg font-semibold mb-2">{pkg.name}</h3>
                        <div className="text-3xl font-bold text-green-600 mb-4">
                          ${pkg.price}
                        </div>
                        <ul className="space-y-2">
                          {pkg.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-center text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button className="w-full mt-4" variant={pkg.popular ? 'default' : 'outline'}>
                          Select Package
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}