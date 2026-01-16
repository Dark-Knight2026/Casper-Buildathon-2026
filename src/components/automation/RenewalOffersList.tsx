/**
 * Renewal Offers List Component
 * Display and manage automated renewal offers
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { automationService } from '@/services/automationService';
import type { RenewalOffer } from '@/types/automation';

export function RenewalOffersList() {
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const loadOffers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await automationService.getRenewalOffers({ status: activeTab });
      setOffers(data);
    } catch (error) {
      console.error('Error loading renewal offers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleSendOffer = async (offerId: string) => {
    try {
      await automationService.sendRenewalOffer(offerId);
      alert('Renewal offer sent successfully!');
      loadOffers();
    } catch (error) {
      console.error('Error sending renewal offer:', error);
      alert('Failed to send renewal offer');
    }
  };

  const getStatusIcon = (status: RenewalOffer['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
        return <XCircle className="h-4 w-4" />;
      case 'negotiating':
        return <AlertCircle className="h-4 w-4" />;
      case 'expired':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: RenewalOffer['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'negotiating':
        return 'outline';
      case 'expired':
        return 'destructive';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renewal Offers</CardTitle>
        <CardDescription>Manage automated lease renewal offers</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="negotiating">Negotiating</TabsTrigger>
            <TabsTrigger value="declined">Declined</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No {activeTab} renewal offers</p>
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <Card key={offer.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Lease #{offer.leaseId}</h3>
                          <p className="text-sm text-gray-600">Property #{offer.propertyId}</p>
                        </div>
                        <Badge variant={getStatusColor(offer.status)} className="flex items-center gap-1">
                          {getStatusIcon(offer.status)}
                          {offer.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Current Rent</p>
                          <p className="font-semibold">${offer.currentRent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Proposed Rent</p>
                          <p className="font-semibold">${offer.proposedRent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Current End Date</p>
                          <p className="font-semibold">{new Date(offer.currentEndDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Proposed End Date</p>
                          <p className="font-semibold">{new Date(offer.proposedEndDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span>Sent: {new Date(offer.sentAt).toLocaleDateString()}</span>
                        <span>Expires: {new Date(offer.expiresAt).toLocaleDateString()}</span>
                      </div>

                      {offer.status === 'pending' && (
                        <Button size="sm" onClick={() => handleSendOffer(offer.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          Resend Offer
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}