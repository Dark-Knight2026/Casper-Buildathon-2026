import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Building,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  Upload,
  Download,
  Eye,
  Shield,
  MapPin,
  DollarSign,
  BookOpen
} from 'lucide-react';

export default function HOAManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for HOA manager dashboard
  const properties = [
    {
      id: 1,
      address: '123 Main St, Virginia Beach, VA',
      ownerName: 'John & Sarah Smith',
      propertyType: 'Single Family',
      status: 'Document Request',
      priority: 'High',
      phone: '(757) 555-0123',
      email: 'john.smith@email.com',
      requestDate: '2024-01-12',
      documentsNeeded: ['CC&Rs', 'Bylaws', 'Financial Statement']
    },
    {
      id: 2,
      address: '456 Oak Ave, Norfolk, VA',
      ownerName: 'Michael Johnson',
      propertyType: 'Townhouse',
      status: 'Rules Disclosure Sent',
      priority: 'Medium',
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com',
      requestDate: '2024-01-10',
      documentsNeeded: ['HOA Rules', 'Assessment Schedule']
    },
    {
      id: 3,
      address: '789 Pine Dr, Chesapeake, VA',
      ownerName: 'Emily Davis',
      propertyType: 'Condo',
      status: 'Complete',
      priority: 'Low',
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com',
      requestDate: '2024-01-08',
      documentsNeeded: []
    }
  ];

  const documents = [
    {
      id: 1,
      type: 'CC&Rs (Covenants, Conditions & Restrictions)',
      category: 'Governing Documents',
      lastUpdated: '2024-01-01',
      version: '3.2',
      status: 'Current',
      fileSize: '2.4 MB'
    },
    {
      id: 2,
      type: 'HOA Bylaws',
      category: 'Governing Documents',
      lastUpdated: '2023-12-15',
      version: '2.1',
      status: 'Current',
      fileSize: '1.8 MB'
    },
    {
      id: 3,
      type: 'Architectural Guidelines',
      category: 'Rules & Regulations',
      lastUpdated: '2024-01-05',
      version: '1.5',
      status: 'Current',
      fileSize: '3.1 MB'
    },
    {
      id: 4,
      type: 'Financial Statement',
      category: 'Financial Documents',
      lastUpdated: '2023-12-31',
      version: '2023 Annual',
      status: 'Current',
      fileSize: '856 KB'
    },
    {
      id: 5,
      type: 'Assessment Schedule',
      category: 'Financial Documents',
      lastUpdated: '2024-01-01',
      version: '2024',
      status: 'Current',
      fileSize: '245 KB'
    }
  ];

  const rulesDisclosures = [
    {
      id: 1,
      propertyAddress: '123 Main St, Virginia Beach, VA',
      disclosureType: 'Pet Policy',
      status: 'Sent',
      sentDate: '2024-01-12',
      acknowledged: false
    },
    {
      id: 2,
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      disclosureType: 'Parking Regulations',
      status: 'Acknowledged',
      sentDate: '2024-01-10',
      acknowledged: true
    },
    {
      id: 3,
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      disclosureType: 'Noise Ordinance',
      status: 'Pending',
      sentDate: null,
      acknowledged: false
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Document Delivery',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Deliver HOA governing documents package'
    },
    {
      id: 2,
      type: 'Rules Explanation',
      client: 'Michael Johnson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Explain HOA rules and regulations'
    }
  ];

  const performance = {
    activeRequests: 8,
    documentsDelivered: 45,
    avgResponseTime: 1.2,
    complianceRate: 98.7,
    clientSatisfaction: 4.6
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
      case 'Acknowledged':
      case 'Current': return 'bg-green-100 text-green-800';
      case 'Document Request':
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Rules Disclosure Sent':
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
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
      case 'Complete':
      case 'Acknowledged': return <CheckCircle className="h-4 w-4" />;
      case 'Sent': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HOA Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'HOA Manager'}! Manage document delivery and rules disclosure.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="disclosures">Rules Disclosure</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Requests</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Docs Delivered</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.documentsDelivered}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Response</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.avgResponseTime} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.complianceRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-indigo-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Client Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.clientSatisfaction}/5.0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Document Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {properties.filter(p => p.status !== 'Complete').slice(0, 3).map((property) => (
                      <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{property.ownerName}</p>
                          <p className="text-sm text-gray-600">{property.propertyType}</p>
                          <p className="text-xs text-gray-500">Docs needed: {property.documentsNeeded.length}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(property.status)}>
                            {property.status}
                          </Badge>
                          <Badge className={`${getPriorityColor(property.priority)} ml-1`}>
                            {property.priority}
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

          <TabsContent value="properties" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Property Document Requests</CardTitle>
                  <Button>New Request</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {properties.map((property) => (
                    <Card key={property.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{property.ownerName}</h3>
                            <p className="text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {property.address}
                            </p>
                            <p className="text-sm text-gray-500">{property.propertyType}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(property.status)}>
                              {getStatusIcon(property.status)}
                              <span className="ml-1">{property.status}</span>
                            </Badge>
                            <Badge className={`${getPriorityColor(property.priority)} ml-2`}>
                              {property.priority} Priority
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Request Date</p>
                            <p className="font-medium">{property.requestDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Documents Needed</p>
                            <p className="font-medium">{property.documentsNeeded.length} items</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact</p>
                            <p className="text-sm">{property.phone}</p>
                          </div>
                        </div>
                        {property.documentsNeeded.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">Required Documents:</p>
                            <div className="flex flex-wrap gap-2">
                              {property.documentsNeeded.map((doc, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {doc}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
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
                            <Upload className="h-4 w-4 mr-1" />
                            Send Documents
                          </Button>
                          <Button size="sm" variant="outline">
                            Update Status
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>HOA Document Library</CardTitle>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{doc.type}</h3>
                              <p className="text-sm text-gray-600">{doc.category}</p>
                              <p className="text-xs text-gray-500">
                                Version {doc.version} • Updated: {doc.lastUpdated} • {doc.fileSize}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(doc.status)}>
                              {doc.status}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disclosures" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rules Disclosure Portal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rulesDisclosures.map((disclosure) => (
                    <Card key={disclosure.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{disclosure.propertyAddress}</h3>
                            <p className="text-gray-600">{disclosure.disclosureType}</p>
                          </div>
                          <Badge className={getStatusColor(disclosure.status)}>
                            {getStatusIcon(disclosure.status)}
                            <span className="ml-1">{disclosure.status}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Sent Date</p>
                            <p className="font-medium">{disclosure.sentDate || 'Not sent'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Acknowledged</p>
                            <Badge className={disclosure.acknowledged ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {disclosure.acknowledged ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge className={getStatusColor(disclosure.status)}>
                              {disclosure.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Send Disclosure
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Rules
                          </Button>
                          <Button size="sm" variant="outline">
                            Track Status
                          </Button>
                        </div>
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