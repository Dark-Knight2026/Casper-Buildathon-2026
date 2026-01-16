import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import CalendarIntegration from '@/components/CalendarIntegration';
import {
  Calculator,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Building,
  CreditCard,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  Mail
} from 'lucide-react';

export default function CPADashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for CPA dashboard
  const clients = [
    {
      id: 1,
      name: 'John & Sarah Smith',
      type: 'First-time Buyer',
      purchasePrice: 450000,
      downPayment: 90000,
      status: 'Tax Planning Active',
      taxBracket: '24%',
      phone: '(757) 555-0123',
      email: 'john.smith@email.com',
      lastConsultation: '2024-01-12'
    },
    {
      id: 2,
      name: 'Michael Johnson',
      type: 'Investment Property',
      purchasePrice: 325000,
      downPayment: 65000,
      status: '1031 Exchange Planning',
      taxBracket: '32%',
      phone: '(757) 555-0456',
      email: 'mjohnson@email.com',
      lastConsultation: '2024-01-11'
    },
    {
      id: 3,
      name: 'Emily Davis',
      type: 'Primary Residence',
      purchasePrice: 275000,
      downPayment: 55000,
      status: 'Affordability Analysis',
      taxBracket: '22%',
      phone: '(757) 555-0789',
      email: 'emily.davis@email.com',
      lastConsultation: '2024-01-10'
    }
  ];

  const taxAnalyses = [
    {
      id: 1,
      clientName: 'Robert Wilson',
      propertyType: 'Primary Residence',
      purchasePrice: 385000,
      estimatedTaxSavings: 8500,
      deductions: ['Mortgage Interest', 'Property Tax', 'PMI'],
      status: 'Completed',
      createdDate: '2024-01-10'
    },
    {
      id: 2,
      clientName: 'Lisa Chen',
      propertyType: 'Investment Property',
      purchasePrice: 295000,
      estimatedTaxSavings: 12500,
      deductions: ['Depreciation', 'Repairs', 'Management Fees'],
      status: 'In Progress',
      createdDate: '2024-01-12'
    }
  ];

  const affordabilityReports = [
    {
      clientName: 'David Rodriguez',
      grossIncome: 125000,
      monthlyDebts: 2800,
      recommendedBudget: 425000,
      maxBudget: 485000,
      dtiRatio: 28,
      status: 'Approved'
    },
    {
      clientName: 'Maria Garcia',
      grossIncome: 95000,
      monthlyDebts: 1200,
      recommendedBudget: 315000,
      maxBudget: 365000,
      dtiRatio: 25,
      status: 'Under Review'
    }
  ];

  const appointments = [
    {
      id: 1,
      type: 'Tax Planning Consultation',
      client: 'John & Sarah Smith',
      date: '2024-01-15',
      time: '10:00 AM',
      purpose: 'First-time buyer tax benefits review'
    },
    {
      id: 2,
      type: '1031 Exchange Meeting',
      client: 'Michael Johnson',
      date: '2024-01-15',
      time: '2:00 PM',
      purpose: 'Investment property exchange planning'
    }
  ];

  const performance = {
    activeClients: 18,
    avgTaxSavings: 9500,
    consultationsThisMonth: 24,
    clientSatisfaction: 4.8,
    totalSavingsGenerated: 285000
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Tax Planning Active': return 'bg-green-100 text-green-800';
      case '1031 Exchange Planning': return 'bg-blue-100 text-blue-800';
      case 'Affordability Analysis': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Approved': return <CheckCircle className="h-4 w-4" />;
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
          <h1 className="text-3xl font-bold text-gray-900">CPA/Tax Advisor Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'Tax Advisor'}! Manage client tax planning and affordability analysis.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="analyses">Tax Analyses</TabsTrigger>
            <TabsTrigger value="affordability">Affordability</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.activeClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Tax Savings</p>
                      <p className="text-2xl font-bold text-gray-900">${performance.avgTaxSavings.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Consultations</p>
                      <p className="text-2xl font-bold text-gray-900">{performance.consultationsThisMonth}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
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
                    <Calculator className="h-8 w-8 text-indigo-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Savings</p>
                      <p className="text-2xl font-bold text-gray-900">${(performance.totalSavingsGenerated / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tax Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taxAnalyses.slice(0, 3).map((analysis) => (
                      <div key={analysis.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{analysis.clientName}</p>
                          <p className="text-sm text-gray-600">{analysis.propertyType} • ${analysis.purchasePrice.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Est. Savings: ${analysis.estimatedTaxSavings.toLocaleString()}</p>
                        </div>
                        <Badge className={getStatusColor(analysis.status)}>
                          {analysis.status}
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
                            <p className="text-gray-600">{client.type}</p>
                          </div>
                          <Badge className={getStatusColor(client.status)}>
                            {client.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Purchase Price</p>
                            <p className="text-lg font-bold text-blue-600">${client.purchasePrice.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Down Payment</p>
                            <p className="font-medium">${client.downPayment.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tax Bracket</p>
                            <p className="font-medium">{client.taxBracket}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Last Consultation</p>
                            <p className="font-medium">{client.lastConsultation}</p>
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
                            Tax Analysis
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyses" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tax Analyses & Planning</CardTitle>
                  <Button>New Analysis</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxAnalyses.map((analysis) => (
                    <Card key={analysis.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{analysis.clientName}</h3>
                            <p className="text-gray-600">{analysis.propertyType}</p>
                          </div>
                          <Badge className={getStatusColor(analysis.status)}>
                            {getStatusIcon(analysis.status)}
                            <span className="ml-1">{analysis.status}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Purchase Price</p>
                            <p className="text-lg font-bold text-blue-600">${analysis.purchasePrice.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Est. Tax Savings</p>
                            <p className="text-lg font-bold text-green-600">${analysis.estimatedTaxSavings.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Deductions</p>
                            <div className="flex flex-wrap gap-1">
                              {analysis.deductions.map((deduction, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {deduction}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View Report
                          </Button>
                          <Button size="sm" variant="outline">
                            <Calculator className="h-4 w-4 mr-1" />
                            Recalculate
                          </Button>
                          <Button size="sm" variant="outline">
                            Share with Client
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affordability" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Affordability Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {affordabilityReports.map((report, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{report.clientName}</h3>
                            <p className="text-gray-600">Gross Income: ${report.grossIncome.toLocaleString()}/year</p>
                          </div>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Recommended Budget</p>
                            <p className="text-lg font-bold text-green-600">${report.recommendedBudget.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Maximum Budget</p>
                            <p className="text-lg font-bold text-orange-600">${report.maxBudget.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Monthly Debts</p>
                            <p className="font-medium">${report.monthlyDebts.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">DTI Ratio</p>
                            <p className="font-medium">{report.dtiRatio}%</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button size="sm" variant="outline">
                            <Calculator className="h-4 w-4 mr-1" />
                            Recalculate
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Generate Report
                          </Button>
                          <Button size="sm" variant="outline">
                            Share Analysis
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