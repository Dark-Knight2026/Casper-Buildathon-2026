import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  FileText,
  Users,
  Scale,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Building,
  Shield,
  Gavel,
  BookOpen,
  Download,
  Upload,
  Eye
} from 'lucide-react';

export default function RealEstateAttorneyDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for real estate attorney dashboard
  const clients = [
    {
      id: 1,
      name: 'John & Sarah Smith',
      type: 'Purchase Contract Review',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      contractValue: 450000,
      status: 'Under Review',
      urgency: 'High',
      phone: '(757) 555-0123',
      email: 'john.smith@email.com',
      dueDate: '2024-01-18'
    },
    {
      id: 2,
      name: 'Michael Johnson',
      type: 'Title Issue Resolution',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      contractValue: 325000,
      status: 'Research Phase',
      urgency: 'Medium',
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com',
      dueDate: '2024-01-22'
    },
    {
      id: 3,
      name: 'Emily Davis',
      type: 'Contract Negotiation',
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      contractValue: 275000,
      status: 'Active Negotiation',
      urgency: 'High',
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com',
      dueDate: '2024-01-16'
    }
  ];

  const contractReviews = [
    {
      id: 1,
      clientName: 'Robert Wilson',
      propertyAddress: '321 Elm St, Portsmouth, VA',
      contractType: 'Purchase Agreement',
      reviewStatus: 'Completed',
      issuesFound: 3,
      recommendations: ['Inspection contingency modification', 'Financing terms clarification', 'Closing date adjustment'],
      submittedDate: '2024-01-10',
      completedDate: '2024-01-12'
    },
    {
      id: 2,
      clientName: 'Lisa Chen',
      propertyAddress: '654 Maple Ave, Suffolk, VA',
      contractType: 'Sale Agreement',
      reviewStatus: 'In Progress',
      issuesFound: 1,
      recommendations: ['Property disclosure review needed'],
      submittedDate: '2024-01-13',
      completedDate: null
    }
  ];

  const legalDocuments = [
    {
      id: 1,
      type: 'Purchase Agreement Template',
      category: 'Contract Templates',
      lastUpdated: '2024-01-10',
      status: 'Current'
    },
    {
      id: 2,
      type: 'Disclosure Statement',
      category: 'Legal Forms',
      lastUpdated: '2024-01-08',
      status: 'Current'
    },
    {
      id: 3,
      type: 'Title Insurance Policy',
      category: 'Insurance Documents',
      lastUpdated: '2024-01-05',
      status: 'Needs Review'
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Contract Review Meeting',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Purchase agreement review and guidance'
    },
    {
      id: 2,
      type: 'Title Issue Consultation',
      client: 'Michael Johnson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Discuss title search findings and resolution options'
    }
  ];

  const performance = {
    activeCases: 15,
    contractsReviewed: 28,
    avgReviewTime: 2.5,
    clientSatisfaction: 4.9,
    successRate: 98.5
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Under Review':
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Research Phase': return 'bg-yellow-100 text-yellow-800';
      case 'Active Negotiation': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Current': return 'bg-green-100 text-green-800';
      case 'Needs Review': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-4 w-4" />;
      case 'In Progress':
      case 'Under Review': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Real Estate Attorney Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Attorney'}! Manage contract reviews, legal guidance, and documentation.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="contracts">Contract Reviews</TabsTrigger>
            <TabsTrigger value="documents">Legal Documents</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Scale className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Cases</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Contracts Reviewed</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.contractsReviewed}</p>
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
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.successRate}%</p>
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
                  <CardTitle>Recent Contract Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contractReviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{review.clientName}</p>
                          <p className="text-sm text-gray-600">{review.contractType}</p>
                          <p className="text-xs text-gray-500">Issues Found: {review.issuesFound}</p>
                        </div>
                        <Badge className={getStatusColor(review.reviewStatus)}>
                          {review.reviewStatus}
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

          <TabsContent value="clients" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Client Cases</CardTitle>
                  <Button>New Case</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients.map((client) => (
                    <Card key={client.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{client.name}</h3>
                            <p className="text-gray-600">{client.type}</p>
                            <p className="text-sm text-gray-500">{client.propertyAddress}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(client.status)}>
                              {client.status}
                            </Badge>
                            <Badge className={`${getUrgencyColor(client.urgency)} ml-2`}>
                              {client.urgency} Priority
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Contract Value</p>
                            <p className="text-lg font-bold text-blue-600">${client.contractValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Due Date</p>
                            <p className="font-medium">{client.dueDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Contact</p>
                            <p className="text-sm">{client.phone}</p>
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
                            View Documents
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contract Reviews</CardTitle>
                  <Button>New Review</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contractReviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{review.clientName}</h3>
                            <p className="text-gray-600">{review.contractType}</p>
                            <p className="text-sm text-gray-500">{review.propertyAddress}</p>
                          </div>
                          <Badge className={getStatusColor(review.reviewStatus)}>
                            {getStatusIcon(review.reviewStatus)}
                            <span className="ml-1">{review.reviewStatus}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Issues Found</p>
                            <p className="text-lg font-bold text-orange-600">{review.issuesFound}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Submitted</p>
                            <p className="font-medium">{review.submittedDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="font-medium">{review.completedDate || 'In Progress'}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Recommendations:</p>
                          <div className="flex flex-wrap gap-2">
                            {review.recommendations.map((rec, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {rec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Contract
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
                              <p className="text-xs text-gray-500">Last updated: {doc.lastUpdated}</p>
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