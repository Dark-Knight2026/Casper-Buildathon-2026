/**
 * Automated Lease Renewal Workflow
 * Smart lease renewal with automated reminders and negotiations
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  Bell,
  BarChart3,
  Users,
  Home,
  Percent,
  Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LeaseRenewal {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantName: string;
  currentRent: number;
  proposedRent: number;
  currentStartDate: Date;
  currentEndDate: Date;
  proposedStartDate: Date;
  proposedEndDate: Date;
  status: 'draft' | 'pending' | 'negotiating' | 'accepted' | 'declined' | 'expired';
  daysUntilExpiration: number;
  marketRent: number;
  rentIncrease: number;
  rentIncreasePercent: number;
  autoReminderEnabled: boolean;
  remindersSent: number;
  lastReminderDate?: Date;
  nextReminderDate?: Date;
  tenantResponse?: string;
  negotiationHistory: NegotiationMessage[];
  documents: RenewalDocument[];
  roi: number;
  renewalRecommendation: 'strongly_recommended' | 'recommended' | 'neutral' | 'not_recommended';
}

interface NegotiationMessage {
  id: string;
  date: Date;
  sender: 'landlord' | 'tenant';
  message: string;
  proposedRent?: number;
  status: 'sent' | 'read' | 'responded';
}

interface RenewalDocument {
  id: string;
  name: string;
  type: 'renewal_agreement' | 'addendum' | 'notice' | 'other';
  status: 'draft' | 'sent' | 'signed';
  sentDate?: Date;
  signedDate?: Date;
}

interface LeaseRenewalWorkflowProps {
  renewals: LeaseRenewal[];
  onCreateRenewal: (propertyId: string, data: Partial<LeaseRenewal>) => void;
  onUpdateRenewal: (renewalId: string, updates: Partial<LeaseRenewal>) => void;
  onSendRenewalOffer: (renewalId: string) => void;
  onSendReminder: (renewalId: string) => void;
  onNegotiate: (renewalId: string, message: string, proposedRent?: number) => void;
}

export default function LeaseRenewalWorkflow({
  renewals,
  onCreateRenewal,
  onUpdateRenewal,
  onSendRenewalOffer,
  onSendReminder,
  onNegotiate
}: LeaseRenewalWorkflowProps) {
  const { toast } = useToast();
  const [selectedRenewal, setSelectedRenewal] = useState<LeaseRenewal | null>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [counterOfferRent, setCounterOfferRent] = useState('');

  // New renewal form state
  const [newRenewalData, setNewRenewalData] = useState({
    propertyId: '',
    proposedRent: '',
    proposedStartDate: '',
    proposedEndDate: '',
    autoReminderEnabled: true,
    customMessage: ''
  });

  // Filter renewals
  const filteredRenewals = renewals.filter(renewal => 
    statusFilter === 'all' || renewal.status === statusFilter
  );

  // Calculate statistics
  const stats = {
    total: renewals.length,
    pending: renewals.filter(r => r.status === 'pending').length,
    negotiating: renewals.filter(r => r.status === 'negotiating').length,
    accepted: renewals.filter(r => r.status === 'accepted').length,
    declined: renewals.filter(r => r.status === 'declined').length,
    avgRentIncrease: renewals.reduce((sum, r) => sum + r.rentIncreasePercent, 0) / renewals.length || 0,
    acceptanceRate: renewals.length > 0 
      ? (renewals.filter(r => r.status === 'accepted').length / renewals.length) * 100 
      : 0
  };

  const handleViewRenewal = (renewal: LeaseRenewal) => {
    setSelectedRenewal(renewal);
    setShowRenewalDialog(true);
  };

  const handleSendOffer = (renewalId: string) => {
    onSendRenewalOffer(renewalId);
    toast({
      title: 'Renewal Offer Sent',
      description: 'The lease renewal offer has been sent to the tenant'
    });
  };

  const handleSendReminder = (renewalId: string) => {
    onSendReminder(renewalId);
    toast({
      title: 'Reminder Sent',
      description: 'A reminder has been sent to the tenant'
    });
  };

  const handleNegotiate = () => {
    if (!selectedRenewal || !negotiationMessage.trim()) return;

    const proposedRent = counterOfferRent ? parseFloat(counterOfferRent) : undefined;
    onNegotiate(selectedRenewal.id, negotiationMessage, proposedRent);
    
    toast({
      title: 'Message Sent',
      description: proposedRent 
        ? `Counter-offer of $${proposedRent.toLocaleString()} sent`
        : 'Negotiation message sent'
    });
    
    setNegotiationMessage('');
    setCounterOfferRent('');
  };

  const handleCreateRenewal = () => {
    if (!newRenewalData.propertyId || !newRenewalData.proposedRent) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    onCreateRenewal(newRenewalData.propertyId, {
      proposedRent: parseFloat(newRenewalData.proposedRent),
      proposedStartDate: new Date(newRenewalData.proposedStartDate),
      proposedEndDate: new Date(newRenewalData.proposedEndDate),
      autoReminderEnabled: newRenewalData.autoReminderEnabled,
      status: 'draft'
    });

    toast({
      title: 'Renewal Created',
      description: 'Lease renewal has been created successfully'
    });

    setShowCreateDialog(false);
    setNewRenewalData({
      propertyId: '',
      proposedRent: '',
      proposedStartDate: '',
      proposedEndDate: '',
      autoReminderEnabled: true,
      customMessage: ''
    });
  };

  const getStatusBadge = (status: LeaseRenewal['status']) => {
    const config = {
      draft: { variant: 'outline' as const, color: 'text-gray-600' },
      pending: { variant: 'secondary' as const, color: 'text-blue-600' },
      negotiating: { variant: 'secondary' as const, color: 'text-orange-600' },
      accepted: { variant: 'default' as const, color: 'text-green-600' },
      declined: { variant: 'destructive' as const, color: 'text-red-600' },
      expired: { variant: 'destructive' as const, color: 'text-red-600' }
    };
    const { variant, color } = config[status];
    return <Badge variant={variant} className={color}>{status}</Badge>;
  };

  const getRecommendationBadge = (recommendation: LeaseRenewal['renewalRecommendation']) => {
    const config = {
      strongly_recommended: { text: 'Strongly Recommended', color: 'bg-green-100 text-green-800' },
      recommended: { text: 'Recommended', color: 'bg-blue-100 text-blue-800' },
      neutral: { text: 'Neutral', color: 'bg-gray-100 text-gray-800' },
      not_recommended: { text: 'Not Recommended', color: 'bg-red-100 text-red-800' }
    };
    const { text, color } = config[recommendation];
    return <Badge className={color}>{text}</Badge>;
  };

  const calculateRentIncrease = (current: number, proposed: number) => {
    const increase = proposed - current;
    const percent = (increase / current) * 100;
    return { increase, percent };
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Renewals</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
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
                <p className="text-sm text-gray-500">Acceptance Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.acceptanceRate.toFixed(0)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Rent Increase</p>
                <p className="text-2xl font-bold">{stats.avgRentIncrease.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lease Renewals</CardTitle>
              <CardDescription>Manage and track lease renewal offers</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Create Renewal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Renewals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRenewals.map((renewal) => (
          <Card key={renewal.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{renewal.propertyAddress}</CardTitle>
                    <p className="text-sm text-gray-500">{renewal.tenantName}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(renewal.status)}
                {getRecommendationBadge(renewal.renewalRecommendation)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Current Rent:</span>
                  <span className="font-medium">${renewal.currentRent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Proposed Rent:</span>
                  <span className="font-medium text-blue-600">${renewal.proposedRent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Increase:</span>
                  <span className={`font-medium ${renewal.rentIncrease > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {renewal.rentIncrease > 0 ? '+' : ''}${renewal.rentIncrease.toLocaleString()} ({renewal.rentIncreasePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Days Until Expiration:</span>
                  <Badge variant={renewal.daysUntilExpiration <= 30 ? 'destructive' : 'secondary'}>
                    {renewal.daysUntilExpiration} days
                  </Badge>
                </div>
                {renewal.autoReminderEnabled && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Bell className="h-3 w-3" />
                    <span>Auto-reminders enabled ({renewal.remindersSent} sent)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => handleViewRenewal(renewal)}
                  className="w-full"
                  variant="outline"
                >
                  View Details
                </Button>
                {renewal.status === 'draft' && (
                  <Button
                    onClick={() => handleSendOffer(renewal.id)}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Offer
                  </Button>
                )}
                {renewal.status === 'pending' && (
                  <Button
                    onClick={() => handleSendReminder(renewal.id)}
                    className="w-full"
                    variant="outline"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Renewal Details Dialog */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lease Renewal Details</DialogTitle>
            <DialogDescription>
              {selectedRenewal?.propertyAddress} - {selectedRenewal?.tenantName}
            </DialogDescription>
          </DialogHeader>

          {selectedRenewal && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Renewal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-500">Status</Label>
                        <div className="mt-1">{getStatusBadge(selectedRenewal.status)}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Recommendation</Label>
                        <div className="mt-1">{getRecommendationBadge(selectedRenewal.renewalRecommendation)}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Current Rent</Label>
                        <p className="text-lg font-medium">${selectedRenewal.currentRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Proposed Rent</Label>
                        <p className="text-lg font-medium text-blue-600">${selectedRenewal.proposedRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Market Rent</Label>
                        <p className="text-lg font-medium">${selectedRenewal.marketRent.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Rent Increase</Label>
                        <p className="text-lg font-medium text-green-600">
                          +${selectedRenewal.rentIncrease.toLocaleString()} ({selectedRenewal.rentIncreasePercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-sm text-gray-500 mb-2 block">Lease Term</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400">Current</p>
                          <p className="font-medium">
                            {selectedRenewal.currentStartDate.toLocaleDateString()} - {selectedRenewal.currentEndDate.toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Proposed</p>
                          <p className="font-medium text-blue-600">
                            {selectedRenewal.proposedStartDate.toLocaleDateString()} - {selectedRenewal.proposedEndDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Auto-Reminders</Label>
                        <Switch
                          checked={selectedRenewal.autoReminderEnabled}
                          onCheckedChange={(checked) => 
                            onUpdateRenewal(selectedRenewal.id, { autoReminderEnabled: checked })
                          }
                        />
                      </div>
                      {selectedRenewal.autoReminderEnabled && (
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>Reminders sent: {selectedRenewal.remindersSent}</p>
                          {selectedRenewal.lastReminderDate && (
                            <p>Last reminder: {selectedRenewal.lastReminderDate.toLocaleDateString()}</p>
                          )}
                          {selectedRenewal.nextReminderDate && (
                            <p>Next reminder: {selectedRenewal.nextReminderDate.toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Negotiation Tab */}
              <TabsContent value="negotiation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Send Message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Message</Label>
                      <Textarea
                        placeholder="Type your message to the tenant..."
                        value={negotiationMessage}
                        onChange={(e) => setNegotiationMessage(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Counter-Offer Rent (Optional)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={counterOfferRent}
                        onChange={(e) => setCounterOfferRent(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleNegotiate} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Negotiation History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {selectedRenewal.negotiationHistory.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg ${
                              msg.sender === 'landlord' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={msg.sender === 'landlord' ? 'default' : 'secondary'}>
                                {msg.sender}
                              </Badge>
                              <span className="text-xs text-gray-500">{msg.date.toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                            {msg.proposedRent && (
                              <p className="text-sm font-medium text-blue-600 mt-2">
                                Proposed: ${msg.proposedRent.toLocaleString()}
                              </p>
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
                    <CardTitle className="text-base">Renewal Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedRenewal.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{doc.type.replace('_', ' ')}</Badge>
                                <Badge variant={doc.status === 'signed' ? 'default' : 'secondary'}>
                                  {doc.status}
                                </Badge>
                              </div>
                              {doc.sentDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Sent: {doc.sentDate.toLocaleDateString()}
                                </p>
                              )}
                              {doc.signedDate && (
                                <p className="text-xs text-green-600 mt-1">
                                  Signed: {doc.signedDate.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Financial Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">ROI</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{selectedRenewal.roi.toFixed(2)}%</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Annual Increase</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          ${(selectedRenewal.rentIncrease * 12).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-500 mb-2 block">Market Comparison</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Your Proposed Rent:</span>
                          <span className="font-medium">${selectedRenewal.proposedRent.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Market Average:</span>
                          <span className="font-medium">${selectedRenewal.marketRent.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Difference:</span>
                          <span className={`font-medium ${
                            selectedRenewal.proposedRent < selectedRenewal.marketRent 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {selectedRenewal.proposedRent < selectedRenewal.marketRent ? 'Below' : 'Above'} by $
                            {Math.abs(selectedRenewal.proposedRent - selectedRenewal.marketRent).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={(selectedRenewal.proposedRent / selectedRenewal.marketRent) * 100} 
                        className="mt-3"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-sm text-gray-500 mb-2 block">Renewal Recommendation</Label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {getRecommendationBadge(selectedRenewal.renewalRecommendation)}
                        <p className="text-sm text-gray-600 mt-2">
                          {selectedRenewal.renewalRecommendation === 'strongly_recommended' && 
                            'This property has excellent ROI and the tenant has a good payment history. Strongly recommend renewal.'}
                          {selectedRenewal.renewalRecommendation === 'recommended' && 
                            'This property performs well and renewal is recommended based on current market conditions.'}
                          {selectedRenewal.renewalRecommendation === 'neutral' && 
                            'Renewal is neutral. Consider market conditions and tenant history before deciding.'}
                          {selectedRenewal.renewalRecommendation === 'not_recommended' && 
                            'Based on ROI and market analysis, consider alternative options or significant rent adjustment.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Renewal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Lease Renewal</DialogTitle>
            <DialogDescription>
              Create a new lease renewal offer for a property
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Property</Label>
              <Select
                value={newRenewalData.propertyId}
                onValueChange={(value) => setNewRenewalData({ ...newRenewalData, propertyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prop1">123 Main St, Los Angeles, CA</SelectItem>
                  <SelectItem value="prop2">456 Oak Ave, San Francisco, CA</SelectItem>
                  <SelectItem value="prop3">789 Pine Rd, San Diego, CA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proposed Monthly Rent</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newRenewalData.proposedRent}
                  onChange={(e) => setNewRenewalData({ ...newRenewalData, proposedRent: e.target.value })}
                />
              </div>
              <div>
                <Label>Lease Start Date</Label>
                <Input
                  type="date"
                  value={newRenewalData.proposedStartDate}
                  onChange={(e) => setNewRenewalData({ ...newRenewalData, proposedStartDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Lease End Date</Label>
              <Input
                type="date"
                value={newRenewalData.proposedEndDate}
                onChange={(e) => setNewRenewalData({ ...newRenewalData, proposedEndDate: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Enable Auto-Reminders</Label>
              <Switch
                checked={newRenewalData.autoReminderEnabled}
                onCheckedChange={(checked) => 
                  setNewRenewalData({ ...newRenewalData, autoReminderEnabled: checked })
                }
              />
            </div>

            <div>
              <Label>Custom Message (Optional)</Label>
              <Textarea
                placeholder="Add a personalized message for the tenant..."
                value={newRenewalData.customMessage}
                onChange={(e) => setNewRenewalData({ ...newRenewalData, customMessage: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateRenewal} className="flex-1">
                Create Renewal
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}