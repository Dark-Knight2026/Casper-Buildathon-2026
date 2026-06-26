import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SellerOffers() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { offers } = useSellerDashboard();

  const getOfferStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAcceptOffer = () => {
    toast({
      title: "Offer Accepted",
      description: "You have accepted the offer. The buyer has been notified.",
    });
  };

  const handleCounterOffer = () => {
    toast({
      title: "Counter Offer Initiated",
      description: "Counter offer draft created.",
    });
  };

  const handleDeclineOffer = () => {
    toast({
      title: "Offer Declined",
      description: "You have declined the offer.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Offers</CardTitle>
        </CardHeader>
        <CardContent>
          {offers.length > 0 ? (
            <div className="space-y-4">
              {offers.map((offer) => (
                <Card key={offer.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{offer.property}</h3>
                        <p className="text-gray-600">Buyer: {offer.buyer}</p>
                      </div>
                      <Badge className={getOfferStatusColor(offer.status)}>
                        {offer.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Offer Amount</p>
                        <p className="text-xl font-bold text-green-600">${offer.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Submitted Date</p>
                        <p className="font-medium">{offer.date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Contingencies</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {offer.contingencies.map((contingency, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {contingency}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {offer.status === 'pending' && (
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700" 
                          onClick={handleAcceptOffer}
                          aria-label="Accept offer"
                        >
                          Accept Offer
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCounterOffer}
                          aria-label="Make counter offer"
                        >
                          Counter Offer
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 border-red-600" 
                          onClick={handleDeclineOffer}
                          aria-label="Decline offer"
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No offers received"
              description="Offers from potential buyers will appear here once submitted"
              action={{
                label: "View Listings",
                onClick: () => navigate('/seller-dashboard/listings')
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}