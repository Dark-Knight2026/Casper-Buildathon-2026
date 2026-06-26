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
  ScrollText,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  Building,
  Users,
  Phone,
  Mail,
  Download,
  Upload,
  Calendar,
  MapPin,
  Shield
} from 'lucide-react';

interface TitleOrder {
  id: string;
  propertyAddress: string;
  orderDate: string;
  targetCloseDate: string;
  buyer: string;
  seller: string;
  lender: string;
  agent: string;
  orderType: string;
  status: 'ordered' | 'searching' | 'exam_complete' | 'policy_ready' | 'closed';
  fee: number;
  rushOrder: boolean;
}

interface TitleIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution: string;
  status: 'open' | 'pending' | 'resolved';
  discoveredDate: string;
}

interface Lien {
  id: string;
  type: string;
  holder: string;
  amount: number;
  recordedDate: string;
  status: 'active' | 'satisfied' | 'pending_payoff';
  payoffAmount?: number;
}

export default function TitleOfficerDashboard() {
  const [activeTab, setActiveTab] = useState('orders');
  
  const [titleOrders] = useState<TitleOrder[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      orderDate: '2024-01-10',
      targetCloseDate: '2024-01-25',
      buyer: 'John Smith',
      seller: 'Mary Johnson',
      lender: 'First National Bank',
      agent: 'Sarah Wilson',
      orderType: 'Purchase',
      status: 'searching',
      fee: 850,
      rushOrder: false
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      orderDate: '2024-01-12',
      targetCloseDate: '2024-01-20',
      buyer: 'Jane Doe',
      seller: 'Robert Brown',
      lender: 'Community Credit Union',
      agent: 'Mike Davis',
      orderType: 'Refinance',
      status: 'exam_complete',
      fee: 650,
      rushOrder: true
    }
  ]);

  const [titleIssues] = useState<TitleIssue[]>([
    {
      id: '1',
      type: 'Judgment Lien',
      severity: 'high',
      description: 'Outstanding judgment lien from 2019 - $15,000',
      resolution: 'Contact judgment creditor for payoff amount',
      status: 'pending',
      discoveredDate: '2024-01-14'
    },
    {
      id: '2',
      type: 'Easement Issue',
      severity: 'medium',
      description: 'Utility easement not properly recorded',
      resolution: 'Obtain proper easement documentation from utility company',
      status: 'open',
      discoveredDate: '2024-01-13'
    }
  ]);

  const [liens] = useState<Lien[]>([
    {
      id: '1',
      type: 'Mortgage',
      holder: 'ABC Mortgage Company',
      amount: 285000,
      recordedDate: '2020-03-15',
      status: 'active',
      payoffAmount: 267500
    },
    {
      id: '2',
      type: 'Tax Lien',
      holder: 'Virginia Beach Tax Assessor',
      amount: 3500,
      recordedDate: '2023-08-20',
      status: 'pending_payoff',
      payoffAmount: 3750
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
      case 'resolved':
      case 'satisfied': return 'bg-green-100 text-green-800';
      case 'policy_ready':
      case 'exam_complete': return 'bg-blue-100 text-blue-800';
      case 'searching':
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'ordered':
      case 'open': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Title Officer Dashboard</h1>
          <p className="text-gray-600">Manage title searches, lien clearance, and policy issuance</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Search className="h-4 w-4 mr-2" />
            New Title Search
          </Button>
          <Button variant="outline">
            <ScrollText className="h-4 w-4 mr-2" />
            Issue Policy
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
                  {titleOrders.filter(o => !['closed'].includes(o.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Issues</p>
                <p className="text-2xl font-bold text-gray-900">
                  {titleIssues.filter(i => i.status !== 'resolved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Liens to Clear</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${liens.filter(l => l.status === 'active').reduce((sum, lien) => sum + (lien.payoffAmount || lien.amount), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ready to Close</p>
                <p className="text-2xl font-bold text-gray-900">
                  {titleOrders.filter(o => o.status === 'policy_ready').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Title Orders</TabsTrigger>
          <TabsTrigger value="search">Title Search</TabsTrigger>
          <TabsTrigger value="issues">Issues & Liens</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Title Orders</CardTitle>
              <CardDescription>Manage your current title examination orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {titleOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{order.propertyAddress}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {order.status.replace('_', ' ')}
                            </Badge>
                            {order.rushOrder && (
                              <Badge variant="destructive">Rush Order</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Close: {new Date(order.targetCloseDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              {order.orderType}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              Fee: ${order.fee}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Buyer:</span> {order.buyer}<br />
                              <span className="font-medium">Seller:</span> {order.seller}
                            </div>
                            <div>
                              <span className="font-medium">Lender:</span> {order.lender}<br />
                              <span className="font-medium">Agent:</span> {order.agent}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Search className="h-4 w-4 mr-1" />
                            Search Records
                          </Button>
                          <Button size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            View Details
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

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Title Search Tools</CardTitle>
              <CardDescription>Conduct comprehensive title searches and examinations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Property Search</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="property-address">Property Address</Label>
                      <Input id="property-address" placeholder="Enter property address" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parcel-id">Parcel ID</Label>
                        <Input id="parcel-id" placeholder="Parcel number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="book-page">Book/Page</Label>
                        <Input id="book-page" placeholder="Book/Page reference" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="search-years">Search Period (Years)</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select search period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 Years (Standard)</SelectItem>
                          <SelectItem value="40">40 Years (Extended)</SelectItem>
                          <SelectItem value="50">50 Years (Full)</SelectItem>
                          <SelectItem value="current">Current Owner Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Start Title Search
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Search Results Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Ownership Chain</span>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">Clear chain of title for 30 years</p>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Outstanding Liens</span>
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <p className="text-sm text-gray-600">2 liens found - requires clearance</p>
                      </div>
                      
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Easements</span>
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">Utility easements recorded</p>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Taxes</span>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">Current on property taxes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Title Issues</CardTitle>
                <CardDescription>Track and resolve title defects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {titleIssues.map((issue) => (
                    <div key={issue.id} className={`p-4 border rounded-lg ${getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{issue.type}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {issue.severity} priority
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(issue.status)}>
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{issue.description}</p>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Resolution:</span> {issue.resolution}
                      </p>
                      <p className="text-xs text-gray-500">
                        Discovered: {new Date(issue.discoveredDate).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline">Update Status</Button>
                        <Button size="sm" variant="outline">Add Note</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Liens & Encumbrances</CardTitle>
                <CardDescription>Manage lien clearance and payoffs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liens.map((lien) => (
                    <div key={lien.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{lien.type}</h4>
                          <p className="text-sm text-gray-600">{lien.holder}</p>
                        </div>
                        <Badge className={getStatusColor(lien.status)}>
                          {lien.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="font-medium">Original Amount:</span><br />
                          ${lien.amount.toLocaleString()}
                        </div>
                        {lien.payoffAmount && (
                          <div>
                            <span className="font-medium">Payoff Amount:</span><br />
                            ${lien.payoffAmount.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Recorded: {new Date(lien.recordedDate).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Request Payoff</Button>
                        <Button size="sm" variant="outline">Contact Holder</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Title Insurance Policies</CardTitle>
              <CardDescription>Generate and manage title insurance policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Issue New Policy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="policy-property">Property</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="policy-type">Policy Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select policy type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owners">Owner's Policy</SelectItem>
                          <SelectItem value="lenders">Lender's Policy</SelectItem>
                          <SelectItem value="both">Both Policies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="coverage-amount">Coverage Amount</Label>
                        <Input id="coverage-amount" placeholder="$450,000" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="premium">Premium</Label>
                        <Input id="premium" placeholder="$1,350" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="effective-date">Effective Date</Label>
                      <Input type="date" id="effective-date" />
                    </div>
                    <Button className="w-full">
                      <ScrollText className="h-4 w-4 mr-2" />
                      Generate Policy
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Policies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Owner's Policy - 789 Pine St</p>
                          <p className="text-sm text-gray-600">$385,000 coverage</p>
                          <p className="text-xs text-gray-500">Issued Jan 12, 2024</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Lender's Policy - 321 Elm Dr</p>
                          <p className="text-sm text-gray-600">$275,000 coverage</p>
                          <p className="text-xs text-gray-500">Issued Jan 10, 2024</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Policy Exceptions & Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium mb-2">Standard Exceptions</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Rights or claims of parties in possession not shown by public records</li>
                        <li>• Easements or claims of easements not shown by public records</li>
                        <li>• Discrepancies, conflicts in boundary lines, shortage in area, encroachments</li>
                        <li>• Any lien or right to a lien for services, labor, or material not shown by public records</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium mb-2">Special Requirements</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Satisfactory survey showing no encroachments</li>
                        <li>• Payoff of existing mortgage lien</li>
                        <li>• Payment of current year property taxes</li>
                        <li>• Execution of deed by all parties</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}