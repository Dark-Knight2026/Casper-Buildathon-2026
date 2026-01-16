import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, User, Building } from 'lucide-react';
import { renewalService } from '@/services/renewalService';
import { RenewalOfferWithRelations, CounterOfferType } from '@/types/renewal';

interface RenewalNegotiationThreadProps {
  renewalId: string;
  userType: 'tenant' | 'landlord';
  onAcceptCounterOffer?: (counterOfferId: string) => void;
  onMakeCounterOffer?: () => void;
}

export default function RenewalNegotiationThread({
  renewalId,
  userType,
  onAcceptCounterOffer,
  onMakeCounterOffer,
}: RenewalNegotiationThreadProps) {
  const [offer, setOffer] = useState<RenewalOfferWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOffer = useCallback(async () => {
    try {
      setLoading(true);
      const data = await renewalService.getRenewalOfferById(renewalId);
      setOffer(data);
    } catch (err) {
      console.error('Error loading offer:', err);
    } finally {
      setLoading(false);
    }
  }, [renewalId]);

  useEffect(() => {
    loadOffer();
  }, [loadOffer]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading negotiation history...</p>
        </CardContent>
      </Card>
    );
  }

  if (!offer) {
    return null;
  }

  const counterOffers = offer.counter_offers || [];
  const canMakeCounterOffer = offer.negotiation_rounds < 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negotiation History</CardTitle>
        <CardDescription>
          Round {offer.negotiation_rounds} of 5 maximum
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Initial Offer */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Initial Offer from Landlord</span>
            <Badge variant="secondary">Original</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Rent</p>
              <p className="font-semibold">${offer.proposed_rent.toFixed(2)}/month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Term</p>
              <p className="font-semibold">{offer.proposed_term_months} months</p>
            </div>
          </div>
          {offer.special_terms && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Special Terms</p>
              <p className="text-sm">{offer.special_terms}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(offer.created_at).toLocaleString()}
          </p>
        </div>

        {/* Counter Offers */}
        {counterOffers.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              {counterOffers.map((counterOffer: CounterOfferType, index: number) => {
                const isTenantOffer = counterOffer.offered_by === 'tenant';
                const isMyOffer = (userType === 'tenant' && isTenantOffer) || (userType === 'landlord' && !isTenantOffer);
                const canAccept = !isMyOffer && counterOffer.status === 'pending' && onAcceptCounterOffer;

                return (
                  <div
                    key={counterOffer.id}
                    className={`border rounded-lg p-4 ${isMyOffer ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isTenantOffer ? (
                          <User className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Building className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">
                          Counter-Offer #{index + 1} from {isTenantOffer ? 'Tenant' : 'Landlord'}
                        </span>
                        {isMyOffer && <Badge variant="outline">You</Badge>}
                      </div>
                      <Badge
                        variant={
                          counterOffer.status === 'accepted'
                            ? 'default'
                            : counterOffer.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {counterOffer.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Proposed Rent</p>
                        <p className="font-semibold">${counterOffer.proposed_rent.toFixed(2)}/month</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Proposed Term</p>
                        <p className="font-semibold">{counterOffer.proposed_term_months} months</p>
                      </div>
                    </div>
                    {counterOffer.additional_terms && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Additional Terms</p>
                        <p className="text-sm">{counterOffer.additional_terms}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(counterOffer.created_at).toLocaleString()}
                    </p>
                    {canAccept && (
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => onAcceptCounterOffer(counterOffer.id)}>
                          Accept Counter-Offer
                        </Button>
                        {canMakeCounterOffer && onMakeCounterOffer && (
                          <Button size="sm" variant="outline" onClick={onMakeCounterOffer}>
                            Make New Counter-Offer
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Action Buttons */}
        {offer.status === 'negotiating' && counterOffers.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {canMakeCounterOffer
                  ? `You can make ${5 - offer.negotiation_rounds} more counter-offer(s)`
                  : 'Maximum negotiation rounds reached'}
              </p>
              {canMakeCounterOffer && onMakeCounterOffer && (
                <Button onClick={onMakeCounterOffer}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Make Counter-Offer
                </Button>
              )}
            </div>
          </>
        )}

        {!canMakeCounterOffer && offer.status === 'negotiating' && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Maximum negotiation rounds reached. Please accept one of the offers or decline.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}