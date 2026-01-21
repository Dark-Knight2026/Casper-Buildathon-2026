import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Scale,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  Shield,
  Building,
  Eye,
  Download,
  Upload,
  Gavel
} from 'lucide-react';

export default function ListingAttorneyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for listing attorney dashboard
  const listings = [
    {
      id: 1,
      clientName: 'John & Sarah Smith',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      listingPrice: 450000,
      status: 'Disclosure Review',
      priority: 'High',
      listingDate: '2024-01-20',
      phone: '(757) 555-0123',
      email: 'john.smith@email.com',
      disclosureStatus: 'Pending Review'
    },
    {
      id: 2,
      clientName: 'Michael Johnson',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      listingPrice: 325000,
      status: 'Legal Review Complete',
      priority: 'Medium',
      listingDate: '2024-01-18',
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com',
      disclosureStatus: 'Approved'
    },
    {
      id: 3,
      clientName: 'Emily Davis',
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      listingPrice: 275000,
      status: 'Documentation Complete',
      priority: 'Low',
      listingDate: '2024-01-15',
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com',
      disclosureStatus: 'Complete'
    }
  ];

  const disclosures = [
    {
      id: 1,
      propertyAddress: '123 Main St, Virginia Beach, VA',
      disclosureType: 'Property Condition Disclosure',
      status: 'Under Review',
      issuesFound: 2,
      reviewDate: '2024-01-12',
      issues: ['Roof repair history', 'Previous water damage']
    },
    {
      id: 2,
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      disclosureType: 'Lead Paint Disclosure',
      status: 'Approved',
      issuesFound: 0,
      reviewDate: '2024-01-10',
      issues: []
    },
    {
      id: 3,
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      disclosureType: 'Environmental Hazards',
      status: 'Needs Revision',
      issuesFound: 1,
      reviewDate: '2024-01-08',
      issues: ['Asbestos testing required']
    }
  ];

  const legalDocuments = [
    {
      id: 1,
      type: 'Listing Agreement Template',
      category: 'Listing Documents',
      lastUpdated: '2024-01-10',
      status: 'Current',
      version: '2.1'
    },
    {
      id: 2,
      type: 'Property Disclosure Form',
      category: 'Disclosure Forms',
      lastUpdated: '2024-01-08',
      status: 'Current',
      version: '1.8'
    },
    {
      id: 3,
      type: 'MLS Listing Compliance',
      category: 'Compliance Documents',
      lastUpdated: '2024-01-05',
      status: 'Needs Update',
      version: '1.5'
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Disclosure Review',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Review property disclosure statement'
    },
    {
      id: 2,
      type: 'Listing Consultation',
      client: 'Robert Wilson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Legal review of listing documentation'
    }
  ];

  const performance = {
    activeListings: 12,
    reviewsCompleted: 28,
    avgReviewTime: 2.1,
    clientSatisfaction: 4.9,
    complianceRate: 99.2
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Legal Review Complete':
      case 'Documentation Complete':
      case 'Approved':
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'Disclosure Review':
      case 'Under Review':
      case 'Pending Review': return 'bg-blue-100 text-blue-800';
      case 'Needs Revision':
      case 'Needs Update': return 'bg-yellow-100 text-yellow-800';
      case 'Current': return 'bg-green-100 text-green-800';
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
      case 'Legal Review Complete':
      case 'Documentation Complete':
      case 'Approved':
      case 'Complete': return <CheckCircle className="h-4 w-4" />;
      case 'Under Review':
      case 'Pending Review': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Listing Attorney Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Listing Attorney'}! Manage seller disclosures and listing reviews.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="disclosures">Disclosures</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Building className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Listings</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeListings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Reviews Done</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.reviewsCompleted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Review Time</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.avgReviewTime} days</p>
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
                  <CardTitle>Recent Disclosure Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {disclosures.slice(0, 3).map((disclosure) => (
                      <div key={disclosure.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{disclosure.propertyAddress}</p>
                          <p className="text-sm text-gray-600">{disclosure.disclosureType}</p>
                          <p className="text-xs text-gray-500">Issues: {disclosure.issuesFound}</p>
                        </div>
                        <Badge className={getStatusColor(disclosure.status)}>
                          {disclosure.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Today's Appointments</CardTitle>
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

          <TabsContent value="listings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Listing Reviews</CardTitle>
                  <Button>New Listing Review</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <Card key={listing.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{listing.clientName}</h3>
                            <p className="text-gray-600">{listing.propertyAddress}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(listing.status)}>
                              {getStatusIcon(listing.status)}
                              <span className="ml-1">{listing.status}</span>
                            </Badge>
                            <Badge className={`${getPriorityColor(listing.priority)} ml-2`}>
                              {listing.priority} Priority
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Listing Price</p>
                            <p className="text-lg font-bold text-blue-600">${listing.listingPrice.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Listing Date</p>
                            <p className="font-medium">{listing.listingDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Disclosure Status</p>
                            <Badge className={getStatusColor(listing.disclosureStatus)}>
                              {listing.disclosureStatus}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact</p>
                            <p className="text-sm">{listing.phone}</p>
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
                            <FileText className="h-4 w-4 mr-1" />
                            Review Docs
                          </Button>
                          <Button size="sm" variant="outline">
                            <Gavel className="h-4 w-4 mr-1" />
                            Legal Review
                          </Button>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Seller Disclosures</CardTitle>
                  <Button>New Disclosure Review</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {disclosures.map((disclosure) => (
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
                            <p className="text-sm text-gray-600">Issues Found</p>
                            <p className="text-lg font-bold text-orange-600">{disclosure.issuesFound}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Review Date</p>
                            <p className="font-medium">{disclosure.reviewDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <Badge className={getStatusColor(disclosure.status)}>
                              {disclosure.status}
                            </Badge>
                          </div>
                        </div>
                        {disclosure.issues.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">Issues Identified:</p>
                            <div className="flex flex-wrap gap-2">
                              {disclosure.issues.map((issue, index) => (
                                <Badge key={index} variant="outline" className="text-xs bg-red-50">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Review Details
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Generate Report
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Send to Client
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
                  <CardTitle>Legal Document Library</CardTitle>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {legalDocuments.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{doc.type}</h3>
                              <p className="text-sm text-gray-600">{doc.category}</p>
                              <p className="text-xs text-gray-500">Version {doc.version} • Updated: {doc.lastUpdated}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(doc.status)}>
                              {doc.status}
                            </Badge>
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

          <TabsContent value="calendar" className="mt-6">
            <CalendarIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}