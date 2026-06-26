import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  Camera,
  Upload,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  Users,
  Phone,
  Mail
} from 'lucide-react';

interface AppraisalOrder {
  id: string;
  propertyAddress: string;
  orderDate: string;
  dueDate: string;
  lender: string;
  loanOfficer: string;
  borrower: string;
  loanAmount: number;
  propertyType: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'delivered';
  rushOrder: boolean;
  fee: number;
}

interface ValuationReport {
  id: string;
  propertyAddress: string;
  appraisedValue: number;
  reportDate: string;
  reportType: string;
  status: 'draft' | 'review' | 'completed' | 'delivered';
  comparables: number;
}

export default function AppraiserDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  
  const [appraisalOrders] = useState<AppraisalOrder[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      orderDate: '2024-01-15',
      dueDate: '2024-01-22',
      lender: 'First National Bank',
      loanOfficer: 'Sarah Johnson',
      borrower: 'John Smith',
      loanAmount: 450000,
      propertyType: 'Single Family',
      status: 'scheduled',
      rushOrder: false,
      fee: 650
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      orderDate: '2024-01-14',
      dueDate: '2024-01-19',
      lender: 'Community Credit Union',
      loanOfficer: 'Mike Davis',
      borrower: 'Jane Doe',
      loanAmount: 325000,
      propertyType: 'Townhouse',
      status: 'in_progress',
      rushOrder: true,
      fee: 750
    }
  ]);

  const [valuationReports] = useState<ValuationReport[]>([
    {
      id: '1',
      propertyAddress: '789 Pine St, Chesapeake, VA',
      appraisedValue: 385000,
      reportDate: '2024-01-12',
      reportType: 'Full Appraisal',
      status: 'completed',
      comparables: 6
    },
    {
      id: '2',
      propertyAddress: '321 Elm Dr, Portsmouth, VA',
      appraisedValue: 275000,
      reportDate: '2024-01-10',
      reportType: 'Drive-By Appraisal',
      status: 'delivered',
      comparables: 4
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'pending':
      case 'draft': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appraiser Dashboard</h1>
          <p className="text-gray-600">Manage appraisal orders and valuation reports</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Report
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Inspection
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {appraisalOrders.filter(o => ['pending', 'scheduled', 'in_progress'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {valuationReports.filter(r => r.status === 'completed' || r.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${appraisalOrders.reduce((sum, order) => sum + order.fee, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Appraisal Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${Math.round(valuationReports.reduce((sum, report) => sum + report.appraisedValue, 0) / valuationReports.length).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Appraisal Orders</TabsTrigger>
          <TabsTrigger value="reports">Valuation Reports</TabsTrigger>
          <TabsTrigger value="lender-portal">Lender Portal</TabsTrigger>
          <TabsTrigger value="calendar">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Appraisal Orders</CardTitle>
              <CardDescription>Manage your active appraisal assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appraisalOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{order.propertyAddress}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                            </Badge>
                            {order.rushOrder && (
                              <Badge variant="destructive">Rush Order</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              {order.propertyType} - ${order.loanAmount.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {order.lender} - {order.loanOfficer}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Due: {new Date(order.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Borrower:</span> {order.borrower}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-lg font-bold text-green-600">
                            ${order.fee}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <MapPin className="h-4 w-4 mr-1" />
                              View Property
                            </Button>
                            <Button size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Start Report
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Valuation Reports</CardTitle>
              <CardDescription>Track and manage your appraisal reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {valuationReports.map((report) => (
                  <Card key={report.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{report.propertyAddress}</h3>
                            <Badge className={getStatusColor(report.status)}>
                              {getStatusIcon(report.status)}
                              <span className="ml-1 capitalize">{report.status}</span>
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              Appraised Value: ${report.appraisedValue.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              {report.reportType}
                            </div>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              {report.comparables} Comparables Used
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-600">
                            Report Date: {new Date(report.reportDate).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Camera className="h-4 w-4 mr-1" />
                            View Photos
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Download PDF
                          </Button>
                          <Button size="sm">
                            <Mail className="h-4 w-4 mr-1" />
                            Send to Lender
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

        <TabsContent value="lender-portal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lender Communication Portal</CardTitle>
              <CardDescription>Direct communication with lending institutions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Completed Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      Request Extension
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Status Update
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Report Issue
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Communications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Report Delivered</p>
                          <p className="text-xs text-gray-600">123 Main St - Sent to First National Bank</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Extension Requested</p>
                          <p className="text-xs text-gray-600">456 Oak Ave - Additional time needed</p>
                          <p className="text-xs text-gray-500">1 day ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Send Update to Lender</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lender">Select Lender</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose lender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first-national">First National Bank</SelectItem>
                          <SelectItem value="community-cu">Community Credit Union</SelectItem>
                          <SelectItem value="regional-bank">Regional Bank</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property">Property Address</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="123-main">123 Main St, Virginia Beach, VA</SelectItem>
                          <SelectItem value="456-oak">456 Oak Ave, Norfolk, VA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message"
                      placeholder="Enter your message to the lender..."
                      rows={4}
                    />
                  </div>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Schedule</CardTitle>
              <CardDescription>Manage your property inspection appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upcoming Inspections</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">123 Main St</p>
                          <p className="text-sm text-gray-600">Tomorrow, 10:00 AM</p>
                          <p className="text-xs text-gray-500">First National Bank</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">456 Oak Ave</p>
                          <p className="text-sm text-gray-600">Jan 20, 2:00 PM</p>
                          <p className="text-xs text-gray-500">Community Credit Union</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">Rush</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Schedule New Inspection</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inspection-property">Property</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="123-main">123 Main St, Virginia Beach, VA</SelectItem>
                          <SelectItem value="456-oak">456 Oak Ave, Norfolk, VA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="inspection-date">Date</Label>
                        <Input type="date" id="inspection-date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inspection-time">Time</Label>
                        <Input type="time" id="inspection-time" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-info">Contact Information</Label>
                      <Textarea 
                        id="contact-info"
                        placeholder="Agent/owner contact details..."
                        rows={3}
                      />
                    </div>
                    <Button className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Inspection
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}