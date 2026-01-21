import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Building,
  CreditCard,
  Banknote,
  Receipt,
  Download,
  Upload,
  Phone,
  Mail
} from 'lucide-react';

interface EscrowFile {
  id: string;
  propertyAddress: string;
  buyer: string;
  seller: string;
  purchasePrice: number;
  earnestMoney: number;
  lender: string;
  agent: string;
  openDate: string;
  targetCloseDate: string;
  status: 'opened' | 'pending_docs' | 'ready_to_close' | 'closed' | 'cancelled';
  completionPercentage: number;
}

interface EscrowDeposit {
  id: string;
  fileId: string;
  type: 'earnest_money' | 'down_payment' | 'closing_costs' | 'other';
  amount: number;
  depositor: string;
  depositDate: string;
  method: 'wire' | 'check' | 'cashiers_check' | 'ach';
  status: 'pending' | 'cleared' | 'returned';
  reference: string;
}

interface Contingency {
  id: string;
  fileId: string;
  type: string;
  description: string;
  deadline: string;
  status: 'pending' | 'satisfied' | 'waived' | 'expired';
  responsibleParty: string;
}

export default function EscrowOfficerDashboard() {
  const [activeTab, setActiveTab] = useState('files');
  
  const [escrowFiles] = useState<EscrowFile[]>([
    {
      id: '1',
      propertyAddress: '123 Main St, Virginia Beach, VA',
      buyer: 'John Smith',
      seller: 'Mary Johnson',
      purchasePrice: 450000,
      earnestMoney: 5000,
      lender: 'First National Bank',
      agent: 'Sarah Wilson',
      openDate: '2024-01-05',
      targetCloseDate: '2024-01-25',
      status: 'pending_docs',
      completionPercentage: 65
    },
    {
      id: '2',
      propertyAddress: '456 Oak Ave, Norfolk, VA',
      buyer: 'Jane Doe',
      seller: 'Robert Brown',
      purchasePrice: 325000,
      earnestMoney: 3000,
      lender: 'Community Credit Union',
      agent: 'Mike Davis',
      openDate: '2024-01-08',
      targetCloseDate: '2024-01-22',
      status: 'ready_to_close',
      completionPercentage: 95
    }
  ]);

  const [escrowDeposits] = useState<EscrowDeposit[]>([
    {
      id: '1',
      fileId: '1',
      type: 'earnest_money',
      amount: 5000,
      depositor: 'John Smith',
      depositDate: '2024-01-06',
      method: 'check',
      status: 'cleared',
      reference: 'CHK-001234'
    },
    {
      id: '2',
      fileId: '2',
      type: 'down_payment',
      amount: 65000,
      depositor: 'Jane Doe',
      depositDate: '2024-01-15',
      method: 'wire',
      status: 'cleared',
      reference: 'WIRE-567890'
    }
  ]);

  const [contingencies] = useState<Contingency[]>([
    {
      id: '1',
      fileId: '1',
      type: 'Inspection',
      description: 'Home inspection contingency',
      deadline: '2024-01-18',
      status: 'satisfied',
      responsibleParty: 'Buyer'
    },
    {
      id: '2',
      fileId: '1',
      type: 'Financing',
      description: 'Loan approval contingency',
      deadline: '2024-01-22',
      status: 'pending',
      responsibleParty: 'Buyer'
    },
    {
      id: '3',
      fileId: '2',
      type: 'Appraisal',
      description: 'Property appraisal contingency',
      deadline: '2024-01-20',
      status: 'satisfied',
      responsibleParty: 'Lender'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
      case 'satisfied':
      case 'cleared': return 'bg-green-100 text-green-800';
      case 'ready_to_close': return 'bg-blue-100 text-blue-800';
      case 'pending_docs':
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'opened': return 'bg-gray-100 text-gray-800';
      case 'cancelled':
      case 'expired':
      case 'returned': return 'bg-red-100 text-red-800';
      case 'waived': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepositTypeIcon = (type: string) => {
    switch (type) {
      case 'earnest_money': return <DollarSign className="h-4 w-4" />;
      case 'down_payment': return <Banknote className="h-4 w-4" />;
      case 'closing_costs': return <Receipt className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escrow Officer Dashboard</h1>
          <p className="text-gray-600">Manage escrow files, deposits, and contingency tracking</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            New Escrow File
          </Button>
          <Button variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Record Deposit
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
                <p className="text-sm font-medium text-gray-600">Active Files</p>
                <p className="text-2xl font-bold text-gray-900">
                  {escrowFiles.filter(f => !['closed', 'cancelled'].includes(f.status)).length}
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
                <p className="text-sm font-medium text-gray-600">Funds in Escrow</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${escrowDeposits.filter(d => d.status === 'cleared').reduce((sum, deposit) => sum + deposit.amount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Contingencies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contingencies.filter(c => c.status === 'pending').length}
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
                  {escrowFiles.filter(f => f.status === 'ready_to_close').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="files">Escrow Files</TabsTrigger>
          <TabsTrigger value="deposits">Deposits & Funds</TabsTrigger>
          <TabsTrigger value="contingencies">Contingencies</TabsTrigger>
          <TabsTrigger value="closing">Closing Coordination</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Escrow Files</CardTitle>
              <CardDescription>Monitor progress and manage your escrow transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {escrowFiles.map((file) => (
                  <Card key={file.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{file.propertyAddress}</h3>
                            <Badge className={getStatusColor(file.status)}>
                              {file.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-2" />
                              Purchase: ${file.purchasePrice.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-2" />
                              Earnest: ${file.earnestMoney.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Close: {new Date(file.targetCloseDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="font-medium">Buyer:</span> {file.buyer}<br />
                              <span className="font-medium">Seller:</span> {file.seller}
                            </div>
                            <div>
                              <span className="font-medium">Lender:</span> {file.lender}<br />
                              <span className="font-medium">Agent:</span> {file.agent}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>File Completion</span>
                              <span>{file.completionPercentage}%</span>
                            </div>
                            <Progress value={file.completionPercentage} className="h-2" />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View File
                          </Button>
                          <Button size="sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Update Status
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

        <TabsContent value="deposits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escrow Deposits & Fund Management</CardTitle>
              <CardDescription>Track all deposits and fund movements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Record New Deposit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-file">Escrow File</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select escrow file" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">123 Main St - Smith/Johnson</SelectItem>
                          <SelectItem value="2">456 Oak Ave - Doe/Brown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="deposit-type">Deposit Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="earnest_money">Earnest Money</SelectItem>
                            <SelectItem value="down_payment">Down Payment</SelectItem>
                            <SelectItem value="closing_costs">Closing Costs</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deposit-amount">Amount</Label>
                        <Input id="deposit-amount" placeholder="$5,000" />
                      </div>
                    </div>
                    <Button className="w-full">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Deposit
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Deposits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {escrowDeposits.map((deposit) => (
                        <div key={deposit.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getDepositTypeIcon(deposit.type)}
                              <span className="font-medium capitalize">
                                {deposit.type.replace('_', ' ')}
                              </span>
                              <Badge className={getStatusColor(deposit.status)}>
                                {deposit.status}
                              </Badge>
                            </div>
                            <span className="font-bold text-green-600">
                              ${deposit.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Depositor: {deposit.depositor}</div>
                            <div>Method: {deposit.method.replace('_', ' ')}</div>
                            <div>Date: {new Date(deposit.depositDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contingencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contingency Tracking</CardTitle>
              <CardDescription>Monitor and manage all contract contingencies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contingencies.map((contingency) => {
                  const isExpiringSoon = new Date(contingency.deadline) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                  return (
                    <Card key={contingency.id} className={`border-l-4 ${isExpiringSoon && contingency.status === 'pending' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{contingency.type} Contingency</h3>
                              <Badge className={getStatusColor(contingency.status)}>
                                {contingency.status}
                              </Badge>
                              {isExpiringSoon && contingency.status === 'pending' && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-600 mb-2">{contingency.description}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Deadline: {new Date(contingency.deadline).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                Responsible: {contingency.responsibleParty}
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                File: {escrowFiles.find(f => f.id === contingency.fileId)?.propertyAddress.split(',')[0]}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {contingency.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Satisfied
                                </Button>
                                <Button size="sm" variant="outline">
                                  Waive
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline">
                              <Phone className="h-4 w-4 mr-1" />
                              Contact
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Closing Coordination</CardTitle>
              <CardDescription>Coordinate closing activities and document preparation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Closing Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      'Title insurance policy received',
                      'Loan documents signed',
                      'Final walkthrough completed',
                      'All contingencies satisfied',
                      'Funds deposited and cleared',
                      'Closing disclosure reviewed'
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Schedule Closing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="closing-file">Escrow File</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select file" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">123 Main St - Smith/Johnson</SelectItem>
                          <SelectItem value="2">456 Oak Ave - Doe/Brown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="closing-date">Date</Label>
                        <Input type="date" id="closing-date" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="closing-time">Time</Label>
                        <Input type="time" id="closing-time" />
                      </div>
                    </div>
                    <Button className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Closing
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