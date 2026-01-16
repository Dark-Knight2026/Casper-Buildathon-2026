/**
 * Enhanced Tenant Management Component
 * Advanced tenant tracking, communication, and document management
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Download,
  Upload,
  Star,
  TrendingUp,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyAddress: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'pending' | 'expired' | 'terminated';
  paymentHistory: PaymentRecord[];
  documents: TenantDocument[];
  communications: Communication[];
  maintenanceRequests: number;
  rating: number;
  notes: string;
}

interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'late' | 'pending' | 'failed';
  method: 'bank_transfer' | 'credit_card' | 'check' | 'cash';
  lateFee?: number;
  notes?: string;
}

interface TenantDocument {
  id: string;
  name: string;
  type: 'lease' | 'id' | 'income_proof' | 'reference' | 'other';
  uploadDate: Date;
  size: string;
  url: string;
}

interface Communication {
  id: string;
  date: Date;
  type: 'email' | 'sms' | 'call' | 'in_person';
  subject: string;
  message: string;
  sender: 'landlord' | 'tenant';
  status: 'sent' | 'read' | 'replied';
}

interface TenantManagementEnhancedProps {
  tenants: Tenant[];
  onUpdateTenant: (tenantId: string, updates: Partial<Tenant>) => void;
  onSendMessage: (tenantId: string, message: string, type: string) => void;
  onUploadDocument: (tenantId: string, document: File) => void;
  onRecordPayment: (tenantId: string, payment: Partial<PaymentRecord>) => void;
}

export default function TenantManagementEnhanced({
  tenants,
  onUpdateTenant,
  onSendMessage,
  onUploadDocument,
  onRecordPayment
}: TenantManagementEnhancedProps) {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<string>('email');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate tenant statistics
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    pending: tenants.filter(t => t.status === 'pending').length,
    expired: tenants.filter(t => t.status === 'expired').length,
    avgRating: tenants.reduce((sum, t) => sum + t.rating, 0) / tenants.length || 0
  };

  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowTenantDetails(true);
  };

  const handleSendMessage = () => {
    if (!selectedTenant || !newMessage.trim()) return;

    onSendMessage(selectedTenant.id, newMessage, messageType);
    toast({
      title: 'Message Sent',
      description: `${messageType.toUpperCase()} sent to ${selectedTenant.firstName} ${selectedTenant.lastName}`
    });
    setNewMessage('');
  };

  const handleRecordPayment = () => {
    if (!selectedTenant || !paymentAmount) return;

    const payment: Partial<PaymentRecord> = {
      date: new Date(),
      amount: parseFloat(paymentAmount),
      status: 'paid',
      method: paymentMethod as PaymentRecord['method'],
      notes: paymentNotes
    };

    onRecordPayment(selectedTenant.id, payment);
    toast({
      title: 'Payment Recorded',
      description: `$${paymentAmount} payment recorded for ${selectedTenant.firstName} ${selectedTenant.lastName}`
    });
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleUpdateStatus = (status: Tenant['status']) => {
    if (!selectedTenant) return;

    onUpdateTenant(selectedTenant.id, { status });
    toast({
      title: 'Status Updated',
      description: `Tenant status changed to ${status}`
    });
    setSelectedTenant({ ...selectedTenant, status });
  };

  const getStatusBadge = (status: Tenant['status']) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      expired: 'destructive',
      terminated: 'outline'
    };
    return <Badge variant={variants[status] as 'default' | 'secondary' | 'destructive' | 'outline'}>{status}</Badge>;
  };

  const getPaymentStatusBadge = (status: PaymentRecord['status']) => {
    const variants = {
      paid: 'default',
      late: 'destructive',
      pending: 'secondary',
      failed: 'destructive'
    };
    const colors = {
      paid: 'text-green-600',
      late: 'text-orange-600',
      pending: 'text-blue-600',
      failed: 'text-red-600'
    };
    return (
      <Badge variant={variants[status] as 'default' | 'secondary' | 'destructive'} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Rating</p>
                <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Directory</CardTitle>
          <CardDescription>Search and filter tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenant List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {tenant.firstName} {tenant.lastName}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < tenant.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {getStatusBadge(tenant.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{tenant.propertyAddress}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span className="truncate">{tenant.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{tenant.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">${tenant.monthlyRent.toLocaleString()}/month</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {tenant.leaseStartDate.toLocaleDateString()} - {tenant.leaseEndDate.toLocaleDateString()}
                </span>
              </div>
              <div className="pt-3 border-t">
                <Button
                  onClick={() => handleViewDetails(tenant)}
                  className="w-full"
                  variant="outline"
                >
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenant Details Dialog */}
      <Dialog open={showTenantDetails} onOpenChange={setShowTenantDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant?.firstName} {selectedTenant?.lastName}
            </DialogTitle>
            <DialogDescription>
              Comprehensive tenant information and management
            </DialogDescription>
          </DialogHeader>

          {selectedTenant && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="communication">Messages</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500">Email</Label>
                        <p className="font-medium">{selectedTenant.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Phone</Label>
                        <p className="font-medium">{selectedTenant.phone}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lease Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500">Property</Label>
                        <p className="font-medium">{selectedTenant.propertyAddress}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Status</Label>
                        <div className="mt-1">
                          <Select
                            value={selectedTenant.status}
                            onValueChange={(value) => handleUpdateStatus(value as Tenant['status'])}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Monthly Rent</Label>
                        <p className="font-medium text-lg">${selectedTenant.monthlyRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Security Deposit</Label>
                        <p className="font-medium">${selectedTenant.securityDeposit.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Lease Start</Label>
                        <p className="font-medium">{selectedTenant.leaseStartDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Lease End</Label>
                        <p className="font-medium">{selectedTenant.leaseEndDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tenant Rating & Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-500">Rating</Label>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < selectedTenant.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Notes</Label>
                      <Textarea
                        value={selectedTenant.notes}
                        onChange={(e) => onUpdateTenant(selectedTenant.id, { notes: e.target.value })}
                        placeholder="Add notes about this tenant..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Record New Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Input
                        placeholder="Payment notes..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleRecordPayment} className="w-full">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {selectedTenant.paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">${payment.amount.toLocaleString()}</p>
                                {getPaymentStatusBadge(payment.status)}
                              </div>
                              <p className="text-sm text-gray-500">{payment.date.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">{payment.method.replace('_', ' ')}</p>
                              {payment.notes && <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>}
                            </div>
                            {payment.lateFee && (
                              <Badge variant="destructive">+${payment.lateFee} late fee</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upload Document</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                      <Button variant="outline" className="mt-4">
                        Choose File
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {selectedTenant.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-blue-600" />
                              <div>
                                <p className="font-medium">{doc.name}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.uploadDate.toLocaleDateString()} • {doc.size}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Communication Tab */}
              <TabsContent value="communication" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Send Message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Message Type</Label>
                      <Select value={messageType} onValueChange={setMessageType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="call">Phone Call</SelectItem>
                          <SelectItem value="in_person">In Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleSendMessage} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Communication History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {selectedTenant.communications.map((comm) => (
                          <div key={comm.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{comm.subject}</span>
                              </div>
                              <Badge variant="outline">{comm.type}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{comm.message}</p>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{comm.date.toLocaleDateString()}</span>
                              <Badge variant={comm.status === 'read' ? 'default' : 'secondary'}>
                                {comm.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tenant Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <History className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium">Lease Started</p>
                            <p className="text-sm text-gray-500">{selectedTenant.leaseStartDate.toLocaleDateString()}</p>
                          </div>
                        </div>

                        {selectedTenant.paymentHistory.slice(0, 5).map((payment, index) => (
                          <div key={payment.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </div>
                              {index < 4 && <div className="w-0.5 h-full bg-gray-200 mt-2"></div>}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium">Payment Received</p>
                              <p className="text-sm text-gray-500">
                                ${payment.amount.toLocaleString()} • {payment.date.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}

                        {selectedTenant.communications.slice(0, 3).map((comm, index) => (
                          <div key={comm.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-purple-600" />
                              </div>
                              {index < 2 && <div className="w-0.5 h-full bg-gray-200 mt-2"></div>}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium">{comm.subject}</p>
                              <p className="text-sm text-gray-500">{comm.date.toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}