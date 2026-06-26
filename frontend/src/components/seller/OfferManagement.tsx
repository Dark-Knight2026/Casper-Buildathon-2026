import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Offer } from '@/types/seller';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  X, 
  MessageSquare,
  FileText,
  AlertTriangle,
  Eye,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function OfferManagement() {
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);

  // Mock offers data
  const offers: Offer[] = [
    {
      id: 'offer-1',
      propertyId: 'prop-1',
      buyerId: 'buyer-1',
      buyerName: 'John Smith',
      buyerAgentId: 'agent-2',
      buyerAgentName: 'Michael Chen',
      offerAmount: 850000,
      offerType: 'purchase',
      earnestMoney: 17000,
      financing: 'conventional',
      preApprovalAmount: 900000,
      contingencies: ['Inspection', 'Financing', 'Appraisal'],
      proposedClosingDate: new Date('2024-12-15'),
      inspectionPeriod: 10,
      status: 'pending',
      message: 'We love the property and are ready to move quickly. Can be flexible on closing date.',
      createdAt: new Date('2024-09-01'),
      expiresAt: new Date('2024-09-05')
    },
    {
      id: 'offer-2',
      propertyId: 'prop-1',
      buyerId: 'buyer-2',
      buyerName: 'Lisa Johnson',
      offerAmount: 825000,
      offerType: 'purchase',
      earnestMoney: 16500,
      financing: 'cash',
      contingencies: ['Inspection'],
      proposedClosingDate: new Date('2024-11-30'),
      inspectionPeriod: 7,
      status: 'pending',
      message: 'Cash offer, no financing contingency. Quick close possible.',
      createdAt: new Date('2024-08-30'),
      expiresAt: new Date('2024-09-03')
    },
    {
      id: 'offer-3',
      propertyId: 'prop-1',
      buyerId: 'buyer-3',
      buyerName: 'Robert Davis',
      buyerAgentId: 'agent-1',
      buyerAgentName: 'Emily Rodriguez',
      offerAmount: 875000,
      offerType: 'purchase',
      earnestMoney: 17500,
      financing: 'fha',
      preApprovalAmount: 880000,
      contingencies: ['Inspection', 'Financing', 'Appraisal', 'Sale of current home'],
      proposedClosingDate: new Date('2025-01-15'),
      inspectionPeriod: 14,
      status: 'countered',
      message: 'Highest offer but needs to sell current home first.',
      createdAt: new Date('2024-08-28'),
      expiresAt: new Date('2024-09-10')
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'countered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFinancingColor = (financing: string) => {
    switch (financing) {
      case 'cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'conventional': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fha': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'va': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysUntilExpiry = (expiresAt: Date) => {
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleAcceptOffer = (offerId: string) => {
    console.log('Accepting offer:', offerId);
    // In a real app, this would update the offer status
  };

  const handleRejectOffer = (offerId: string) => {
    console.log('Rejecting offer:', offerId);
    // In a real app, this would update the offer status
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offer & Deal Management</h2>
          <p className="text-gray-600">Review, negotiate, and manage property offers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {offers.filter(o => o.status === 'pending').length} Pending
          </Badge>
          <Badge variant="outline" className="text-sm">
            {offers.filter(o => o.status === 'countered').length} Countered
          </Badge>
        </div>
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {offers.map((offer) => {
          const daysUntilExpiry = getDaysUntilExpiry(offer.expiresAt);
          const isExpiringSoon = daysUntilExpiry <= 2;
          
          return (
            <Card key={offer.id} className={`hover:shadow-lg transition-shadow ${isExpiringSoon ? 'border-orange-200 bg-orange-50' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-3">
                      <span>{offer.buyerName}</span>
                      {offer.buyerAgentName && (
                        <Badge variant="outline" className="text-xs">
                          Agent: {offer.buyerAgentName}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge className={`${getStatusColor(offer.status)} border text-xs`}>
                        {offer.status}
                      </Badge>
                      <Badge className={`${getFinancingColor(offer.financing)} border text-xs`}>
                        {offer.financing}
                      </Badge>
                      {isExpiringSoon && (
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Expires in {daysUntilExpiry} days
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${offer.offerAmount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {((offer.offerAmount / 875000) * 100).toFixed(1)}% of asking
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Earnest Money</p>
                      <p className="font-medium">${offer.earnestMoney.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Closing Date</p>
                      <p className="font-medium">{offer.proposedClosingDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Inspection Period</p>
                      <p className="font-medium">{offer.inspectionPeriod} days</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Pre-approval</p>
                      <p className="font-medium">
                        {offer.preApprovalAmount ? `$${offer.preApprovalAmount.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Contingencies:</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.contingencies.map((contingency, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {contingency}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {offer.message && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{offer.message}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Submitted {offer.createdAt.toLocaleDateString()} • Expires {offer.expiresAt.toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      
                      {offer.status === 'pending' && (
                        <>
                          <Dialog open={isCounterOfferOpen} onOpenChange={setIsCounterOfferOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedOffer(offer.id)}>
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Counter
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Counter Offer - {offer.buyerName}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Counter Price</Label>
                                    <Input type="number" defaultValue={offer.offerAmount} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Closing Date</Label>
                                    <Input type="date" defaultValue={offer.proposedClosingDate.toISOString().split('T')[0]} />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Counter Terms</Label>
                                  <Textarea placeholder="Specify any changes to terms or conditions..." rows={3} />
                                </div>

                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setIsCounterOfferOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                    Send Counter Offer
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptOffer(offer.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            onClick={() => handleRejectOffer(offer.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Offer Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Offer Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Buyer</th>
                  <th className="text-left p-2">Offer Amount</th>
                  <th className="text-left p-2">Financing</th>
                  <th className="text-left p-2">Closing Date</th>
                  <th className="text-left p-2">Contingencies</th>
                  <th className="text-left p-2">Net to Seller</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{offer.buyerName}</td>
                    <td className="p-2">${offer.offerAmount.toLocaleString()}</td>
                    <td className="p-2">
                      <Badge className={`${getFinancingColor(offer.financing)} border text-xs`}>
                        {offer.financing}
                      </Badge>
                    </td>
                    <td className="p-2">{offer.proposedClosingDate.toLocaleDateString()}</td>
                    <td className="p-2">{offer.contingencies.length}</td>
                    <td className="p-2 font-medium text-green-600">
                      ${(offer.offerAmount * 0.94).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Buyer Financing Status */}
      <Card>
        <CardHeader>
          <CardTitle>Buyer Financing Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offers.filter(o => o.financing !== 'cash').map((offer) => (
              <div key={offer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{offer.buyerName}</p>
                    <p className="text-sm text-gray-600">
                      {offer.financing} • Pre-approved: ${offer.preApprovalAmount?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    View Docs
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}