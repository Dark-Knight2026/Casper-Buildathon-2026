import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Shield,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Building,
  Home,
  Calculator,
  MapPin,
  Zap
} from 'lucide-react';

export default function InsuranceAgentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for insurance agent dashboard
  const clients = [
    {
      id: 1,
      name: 'John & Sarah Smith',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      propertyValue: 450000,
      coverageType: 'Homeowners',
      status: 'Quote Pending',
      riskLevel: 'Low',
      phone: '(757) 555-0123',
      email: 'john.smith@email.com',
      requestDate: '2024-01-12'
    },
    {
      id: 2,
      name: 'Michael Johnson',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      propertyValue: 325000,
      coverageType: 'Condo Insurance',
      status: 'Policy Issued',
      riskLevel: 'Medium',
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com',
      requestDate: '2024-01-10'
    },
    {
      id: 3,
      name: 'Emily Davis',
      propertyAddress: '789 Pine Dr, Chesapeake, VA',
      propertyValue: 275000,
      coverageType: 'Homeowners',
      status: 'Under Review',
      riskLevel: 'Low',
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com',
      requestDate: '2024-01-11'
    }
  ];

  const insuranceQuotes = [
    {
      id: 1,
      clientName: 'Robert Wilson',
      propertyAddress: '321 Elm St, Portsmouth, VA',
      propertyValue: 385000,
      coverageAmount: 400000,
      annualPremium: 1850,
      deductible: 2500,
      coverageType: 'Homeowners',
      quoteStatus: 'Active',
      expiryDate: '2024-02-15',
      riskFactors: ['Coastal location', 'Older construction']
    },
    {
      id: 2,
      clientName: 'Lisa Chen',
      propertyAddress: '654 Maple Ave, Suffolk, VA',
      propertyValue: 295000,
      coverageAmount: 300000,
      annualPremium: 1250,
      deductible: 1000,
      coverageType: 'Condo Insurance',
      quoteStatus: 'Pending Review',
      expiryDate: '2024-02-20',
      riskFactors: ['New construction']
    }
  ];

  const riskAssessments = [
    {
      propertyAddress: '789 Ocean Blvd, Virginia Beach, VA',
      floodRisk: 'High',
      hurricaneRisk: 'Medium',
      crimeRate: 'Low',
      fireRisk: 'Low',
      overallRisk: 'Medium',
      recommendedCoverage: 'Flood + Standard',
      estimatedPremium: 2200
    },
    {
      propertyAddress: '123 Suburban Lane, Chesapeake, VA',
      floodRisk: 'Low',
      hurricaneRisk: 'Low',
      crimeRate: 'Very Low',
      fireRisk: 'Low',
      overallRisk: 'Low',
      recommendedCoverage: 'Standard',
      estimatedPremium: 1100
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Insurance Consultation',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'Homeowners insurance quote and coverage options'
    },
    {
      id: 2,
      type: 'Policy Review',
      client: 'Michael Johnson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Annual policy review and coverage updates'
    }
  ];

  const performance = {
    activeQuotes: 12,
    policiesIssued: 28,
    avgPremium: 1650,
    clientSatisfaction: 4.7,
    renewalRate: 92.5
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Quote Pending':
      case 'Pending Review': return 'bg-yellow-100 text-yellow-800';
      case 'Policy Issued': return 'bg-green-100 text-green-800';
      case 'Under Review': return 'bg-blue-100 text-blue-800';
      case 'Active': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
      case 'Very Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Policy Issued':
      case 'Active': return <CheckCircle className="h-4 w-4" />;
      case 'Quote Pending':
      case 'Under Review': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Insurance Agent Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Insurance Agent'}! Manage quotes, policies, and risk assessments.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
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
                      <p className="text-sm font-medium text-gray-600">Active Quotes</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeQuotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Policies Issued</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.policiesIssued}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Premium</p>
                      <p className="text-2xl font-bold text-gray-900">${performance.avgPremium.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Renewal Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.renewalRate}%</p>
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
                  <CardTitle>Recent Insurance Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insuranceQuotes.slice(0, 3).map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{quote.clientName}</p>
                          <p className="text-sm text-gray-600">{quote.coverageType} • ${quote.propertyValue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Premium: ${quote.annualPremium.toLocaleString()}/year</p>
                        </div>
                        <Badge className={getStatusColor(quote.quoteStatus)}>
                          {quote.quoteStatus}
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
                  <CardTitle>Client Management</CardTitle>
                  <Button>Add New Client</Button>
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
                            <p className="text-gray-600 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {client.propertyAddress}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(client.status)}>
                              {getStatusIcon(client.status)}
                              <span className="ml-1">{client.status}</span>
                            </Badge>
                            <Badge className={`${getRiskColor(client.riskLevel)} ml-2`}>
                              {client.riskLevel} Risk
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Property Value</p>
                            <p className="text-lg font-bold text-blue-600">${client.propertyValue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Coverage Type</p>
                            <p className="font-medium">{client.coverageType}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Request Date</p>
                            <p className="font-medium">{client.requestDate}</p>
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
                            <Calculator className="h-4 w-4 mr-1" />
                            Generate Quote
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Insurance Quotes</CardTitle>
                  <Button>New Quote</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insuranceQuotes.map((quote) => (
                    <Card key={quote.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{quote.clientName}</h3>
                            <p className="text-gray-600 flex items-center">
                              <Building className="h-4 w-4 mr-1" />
                              {quote.propertyAddress}
                            </p>
                          </div>
                          <Badge className={getStatusColor(quote.quoteStatus)}>
                            {getStatusIcon(quote.quoteStatus)}
                            <span className="ml-1">{quote.quoteStatus}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Coverage Amount</p>
                            <p className="text-lg font-bold text-green-600">${quote.coverageAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Annual Premium</p>
                            <p className="text-lg font-bold text-blue-600">${quote.annualPremium.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Deductible</p>
                            <p className="font-medium">${quote.deductible.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Quote Expires</p>
                            <p className="font-medium">{quote.expiryDate}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Risk Factors:</p>
                          <div className="flex flex-wrap gap-2">
                            {quote.riskFactors.map((factor, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calculator className="h-4 w-4 mr-1" />
                            Recalculate
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

          <TabsContent value="risk" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskAssessments.map((assessment, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold flex items-center">
                              <Home className="h-5 w-5 mr-2" />
                              {assessment.propertyAddress}
                            </h3>
                          </div>
                          <Badge className={getRiskColor(assessment.overallRisk)}>
                            {assessment.overallRisk} Overall Risk
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Flood Risk</p>
                            <Badge className={getRiskColor(assessment.floodRisk)}>
                              {assessment.floodRisk}
                            </Badge>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Hurricane Risk</p>
                            <Badge className={getRiskColor(assessment.hurricaneRisk)}>
                              {assessment.hurricaneRisk}
                            </Badge>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Crime Rate</p>
                            <Badge className={getRiskColor(assessment.crimeRate)}>
                              {assessment.crimeRate}
                            </Badge>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Fire Risk</p>
                            <Badge className={getRiskColor(assessment.fireRisk)}>
                              {assessment.fireRisk}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Recommended Coverage</p>
                            <p className="font-medium">{assessment.recommendedCoverage}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Estimated Premium</p>
                            <p className="text-lg font-bold text-green-600">${assessment.estimatedPremium.toLocaleString()}/year</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Calculator className="h-4 w-4 mr-1" />
                            Generate Quote
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Detailed Report
                          </Button>
                          <Button size="sm" variant="outline">
                            <Zap className="h-4 w-4 mr-1" />
                            Quick Quote
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