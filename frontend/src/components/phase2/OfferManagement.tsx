import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  Calendar,
  Paperclip
} from 'lucide-react';

interface Offer {
  id: string;
  propertyAddress: string;
  offerAmount: number;
  earnestMoney: number;
  closingDate: string;
  status: 'draft' | 'submitted' | 'under_review' | 'countered' | 'accepted' | 'rejected';
  submittedAt?: string;
  expiresAt: string;
  contingencies: string[];
  documents: Document[];
  messages: Message[];
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  type: 'message' | 'counter_offer' | 'system';
}

export default function OfferManagement() {
  const [activeTab, setActiveTab] = useState('create');
  const [offers, setOffers] = useState<Offer[]>([
    {
      id: '1',
      propertyAddress: '123 Luxury Lane, Beverly Hills, CA 90210',
      offerAmount: 2750000,
      earnestMoney: 55000,
      closingDate: '2024-10-15',
      status: 'under_review',
      submittedAt: '2024-09-01T10:00:00Z',
      expiresAt: '2024-09-05T23:59:59Z',
      contingencies: ['inspection', 'financing', 'appraisal'],
      documents: [
        { id: '1', name: 'Pre-approval Letter.pdf', type: 'pdf', size: 245000, uploadedAt: '2024-09-01T09:30:00Z', status: 'approved' },
        { id: '2', name: 'Proof of Funds.pdf', type: 'pdf', size: 180000, uploadedAt: '2024-09-01T09:35:00Z', status: 'approved' }
      ],
      messages: [
        { id: '1', sender: 'Agent Sarah Mitchell', message: 'Thank you for your offer. The seller is reviewing and will respond within 24 hours.', timestamp: '2024-09-01T11:00:00Z', type: 'message' },
        { id: '2', sender: 'System', message: 'Offer submitted successfully', timestamp: '2024-09-01T10:00:00Z', type: 'system' }
      ]
    }
  ]);

  const [newOffer, setNewOffer] = useState({
    propertyAddress: '123 Luxury Lane, Beverly Hills, CA 90210',
    listPrice: 2850000,
    offerAmount: 2750000,
    earnestMoney: 55000,
    downPayment: 570000,
    loanAmount: 2180000,
    closingDate: '2024-10-15',
    inspectionPeriod: 10,
    financingContingency: 30,
    appraisalContingency: true,
    personalProperty: '',
    additionalTerms: ''
  });

  const handleSubmitOffer = () => {
    const offer: Offer = {
      id: Date.now().toString(),
      propertyAddress: newOffer.propertyAddress,
      offerAmount: newOffer.offerAmount,
      earnestMoney: newOffer.earnestMoney,
      closingDate: newOffer.closingDate,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      contingencies: [],
      documents: [],
      messages: []
    };

    setOffers([...offers, offer]);
    setActiveTab('track');
  };

  const getStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'countered': return 'bg-orange-100 text-orange-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Offer['status']) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'under_review': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'countered': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Offer Management</h1>
        <p className="text-gray-600">Create, submit, and track your property offers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Create Offer</TabsTrigger>
          <TabsTrigger value="track">Track Offers</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Offer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Property Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="property-address">Property Address</Label>
                    <Input
                      id="property-address"
                      value={newOffer.propertyAddress}
                      onChange={(e) => setNewOffer({...newOffer, propertyAddress: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="list-price">List Price</Label>
                    <Input
                      id="list-price"
                      type="number"
                      value={newOffer.listPrice}
                      onChange={(e) => setNewOffer({...newOffer, listPrice: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Offer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="offer-amount">Offer Amount</Label>
                    <Input
                      id="offer-amount"
                      type="number"
                      value={newOffer.offerAmount}
                      onChange={(e) => setNewOffer({...newOffer, offerAmount: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="earnest-money">Earnest Money</Label>
                    <Input
                      id="earnest-money"
                      type="number"
                      value={newOffer.earnestMoney}
                      onChange={(e) => setNewOffer({...newOffer, earnestMoney: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="closing-date">Closing Date</Label>
                    <Input
                      id="closing-date"
                      type="date"
                      value={newOffer.closingDate}
                      onChange={(e) => setNewOffer({...newOffer, closingDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Financing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Financing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="down-payment">Down Payment</Label>
                    <Input
                      id="down-payment"
                      type="number"
                      value={newOffer.downPayment}
                      onChange={(e) => setNewOffer({...newOffer, downPayment: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="loan-amount">Loan Amount</Label>
                    <Input
                      id="loan-amount"
                      type="number"
                      value={newOffer.loanAmount}
                      onChange={(e) => setNewOffer({...newOffer, loanAmount: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Contingencies */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contingencies</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="inspection-period">Inspection Period (days)</Label>
                    <Input
                      id="inspection-period"
                      type="number"
                      value={newOffer.inspectionPeriod}
                      onChange={(e) => setNewOffer({...newOffer, inspectionPeriod: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="financing-contingency">Financing Contingency (days)</Label>
                    <Input
                      id="financing-contingency"
                      type="number"
                      value={newOffer.financingContingency}
                      onChange={(e) => setNewOffer({...newOffer, financingContingency: Number(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      id="appraisal-contingency"
                      checked={newOffer.appraisalContingency}
                      onChange={(e) => setNewOffer({...newOffer, appraisalContingency: e.target.checked})}
                    />
                    <Label htmlFor="appraisal-contingency">Appraisal Contingency</Label>
                  </div>
                </div>
              </div>

              {/* Additional Terms */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Additional Terms</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="personal-property">Personal Property Included</Label>
                    <Textarea
                      id="personal-property"
                      value={newOffer.personalProperty}
                      onChange={(e) => setNewOffer({...newOffer, personalProperty: e.target.value})}
                      placeholder="List any personal property to be included in the sale..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="additional-terms">Additional Terms & Conditions</Label>
                    <Textarea
                      id="additional-terms"
                      value={newOffer.additionalTerms}
                      onChange={(e) => setNewOffer({...newOffer, additionalTerms: e.target.value})}
                      placeholder="Any additional terms or special conditions..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button variant="outline" className="flex-1">
                  Save as Draft
                </Button>
                <Button onClick={handleSubmitOffer} className="flex-1">
                  Submit Offer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="track" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Offers List */}
            <div className="lg:col-span-2 space-y-4">
              {offers.map((offer) => (
                <Card key={offer.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{offer.propertyAddress}</h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(offer.status)}
                          <Badge className={getStatusColor(offer.status)}>
                            {offer.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          ${offer.offerAmount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          EMD: ${offer.earnestMoney.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Closing Date</p>
                        <p className="font-medium">{new Date(offer.closingDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expires</p>
                        <p className="font-medium">{new Date(offer.expiresAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Documents</p>
                        <p className="font-medium">{offer.documents.length} files</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Messages</p>
                        <p className="font-medium">{offer.messages.length} messages</p>
                      </div>
                    </div>

                    {offer.status === 'under_review' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Review Progress</span>
                          <span>65%</span>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Messages
                      </Button>
                      <Button variant="outline" size="sm">
                        <Paperclip className="h-4 w-4 mr-1" />
                        Documents
                      </Button>
                      {offer.status === 'countered' && (
                        <Button size="sm">
                          Respond to Counter
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Offer Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Offers</span>
                      <span className="font-semibold">{offers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Under Review</span>
                      <span className="font-semibold">{offers.filter(o => o.status === 'under_review').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accepted</span>
                      <span className="font-semibold text-green-600">{offers.filter(o => o.status === 'accepted').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Response</span>
                      <span className="font-semibold">2.3 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Inspection
                  </Button>
                  <Button className="w-full" variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Get Pre-approved
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Required Documents</h3>
                <p className="text-gray-600 mb-4">Drag and drop files or click to browse</p>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Standard Offer</h3>
                <p className="text-gray-600 text-sm mb-4">Basic offer template with standard contingencies</p>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Cash Offer</h3>
                <p className="text-gray-600 text-sm mb-4">Template for all-cash purchases</p>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Investment Property</h3>
                <p className="text-gray-600 text-sm mb-4">Template optimized for investment purchases</p>
                <Button className="w-full">Use Template</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}