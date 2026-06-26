import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  DollarSign,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Calculator,
  CreditCard,
  Building,
  PieChart,
  BarChart3
} from 'lucide-react';

export default function MortgageBrokerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for mortgage broker dashboard
  const preApprovals = [
    {
      id: 1,
      clientName: 'John & Sarah Smith',
      loanAmount: 450000,
      loanType: 'Conventional',
      status: 'Pre-approved',
      creditScore: 750,
      dti: 28,
      rate: 6.75,
      expiryDate: '2024-04-15',
      phone: '(757) 555-0123',
      email: 'john.smith@email.com'
    },
    {
      id: 2,
      clientName: 'Michael Johnson',
      loanAmount: 325000,
      loanType: 'FHA',
      status: 'In Progress',
      creditScore: 680,
      dti: 35,
      rate: 6.85,
      expiryDate: '2024-03-28',
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com'
    },
    {
      id: 3,
      clientName: 'Emily Davis',
      loanAmount: 275000,
      loanType: 'VA',
      status: 'Documentation Review',
      creditScore: 720,
      dti: 30,
      rate: 6.25,
      expiryDate: '2024-04-02',
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com'
    }
  ];

  const loanApplications = [
    {
      id: 1,
      clientName: 'Robert Wilson',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      loanAmount: 385000,
      loanType: 'Conventional',
      status: 'Underwriting',
      submittedDate: '2024-01-10',
      expectedClosing: '2024-02-15'
    },
    {
      id: 2,
      clientName: 'Lisa Chen',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      loanAmount: 295000,
      loanType: 'FHA',
      status: 'Appraisal Ordered',
      submittedDate: '2024-01-12',
      expectedClosing: '2024-02-20'
    }
  ];

  const rateOffers = [
    {
      lender: 'First National Bank',
      loanType: 'Conventional 30-year',
      rate: 6.75,
      apr: 6.89,
      points: 0,
      fees: 2500
    },
    {
      lender: 'Community Credit Union',
      loanType: 'Conventional 30-year',
      rate: 6.85,
      apr: 6.92,
      points: 0.5,
      fees: 2200
    },
    {
      lender: 'Regional Mortgage Co',
      loanType: 'FHA 30-year',
      rate: 6.65,
      apr: 6.78,
      points: 0,
      fees: 2800
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Pre-approval Meeting',
      client: 'David & Maria Rodriguez',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Initial consultation and document review'
    },
    {
      id: 2,
      type: 'Rate Lock Meeting',
      client: 'Robert Wilson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Lock in rate for approved application'
    }
  ];

  const performance = {
    monthlyVolume: 2850000,
    activeApplications: 12,
    averageProcessingTime: 18,
    approvalRate: 94.2,
    clientSatisfaction: 4.9
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pre-approved': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Documentation Review': return 'bg-yellow-100 text-yellow-800';
      case 'Underwriting': return 'bg-purple-100 text-purple-800';
      case 'Appraisal Ordered': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pre-approved': return <CheckCircle className="h-4 w-4" />;
      case 'In Progress': return <Clock className="h-4 w-4" />;
      case 'Documentation Review': return <FileText className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mortgage Broker Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Mortgage Broker'}! Manage pre-approvals, applications, and rate offers.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preapprovals">Pre-Approvals</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="rates">Rate Offers</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Monthly Volume</p>
                      <p className="text-2xl font-bold text-gray-900">${(performance.monthlyVolume / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Applications</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeApplications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.averageProcessingTime} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.approvalRate}%</p>
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
                  <CardTitle>Recent Pre-Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {preApprovals.slice(0, 3).map((approval) => (
                      <div key={approval.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{approval.clientName}</p>
                          <p className="text-sm text-gray-600">${approval.loanAmount.toLocaleString()} • {approval.loanType}</p>
                          <p className="text-xs text-gray-500">Rate: {approval.rate}% • Credit: {approval.creditScore}</p>
                        </div>
                        <Badge className={getStatusColor(approval.status)}>
                          {approval.status}
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

          <TabsContent value="preapprovals" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pre-Approval Management</CardTitle>
                  <Button>New Pre-Approval</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {preApprovals.map((approval) => (
                    <Card key={approval.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{approval.clientName}</h3>
                            <p className="text-gray-600">{approval.loanType} Loan</p>
                          </div>
                          <Badge className={getStatusColor(approval.status)}>
                            {getStatusIcon(approval.status)}
                            <span className="ml-1">{approval.status}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Loan Amount</p>
                            <p className="text-lg font-bold text-green-600">${approval.loanAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Rate & DTI</p>
                            <p className="font-medium">{approval.rate}% • {approval.dti}% DTI</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Credit Score</p>
                            <p className="font-medium">{approval.creditScore}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Expires</p>
                            <p className="font-medium">{approval.expiryDate}</p>
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
                            Generate Letter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Loan Applications</CardTitle>
                  <Button>New Application</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loanApplications.map((application) => (
                    <Card key={application.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{application.clientName}</h3>
                            <p className="text-gray-600">{application.propertyAddress}</p>
                          </div>
                          <Badge className={getStatusColor(application.status)}>
                            {application.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Loan Amount</p>
                            <p className="text-lg font-bold text-blue-600">${application.loanAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Loan Type</p>
                            <p className="font-medium">{application.loanType}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Expected Closing</p>
                            <p className="font-medium">{application.expectedClosing}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            Update Status
                          </Button>
                          <Button size="sm" variant="outline">
                            Contact Underwriter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Rate Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rateOffers.map((offer, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{offer.lender}</h3>
                            <p className="text-gray-600">{offer.loanType}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">{offer.rate}%</div>
                            <div className="text-sm text-gray-600">APR: {offer.apr}%</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-semibold">{offer.points}</div>
                            <div className="text-gray-600">Points</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <div className="font-semibold">${offer.fees.toLocaleString()}</div>
                            <div className="text-gray-600">Lender Fees</div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Calculator className="h-4 w-4 mr-1" />
                            Calculate Payment
                          </Button>
                          <Button size="sm" variant="outline">
                            Compare Rates
                          </Button>
                          <Button size="sm">
                            Select Rate
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