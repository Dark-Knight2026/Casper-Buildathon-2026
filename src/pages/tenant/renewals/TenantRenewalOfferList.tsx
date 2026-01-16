import { RenewalOffer } from '@/services/renewalService';
import { RenewalOfferWithRelations } from '@/types/renewal';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, AlertCircle, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { renewalService } from '@/services/renewalService';
import { supabase } from '@/lib/supabase/client';

export default function TenantRenewalOfferList() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!tenant) throw new Error('Tenant profile not found');

      const data = await renewalService.getRenewalOffersByTenant(tenant.id);
      setOffers(data);
    } catch (err) {
      const error = err as Error; setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }>; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      accepted: { variant: 'default', icon: CheckCircle2, label: 'Accepted' },
      declined: { variant: 'destructive', icon: XCircle, label: 'Declined' },
      negotiating: { variant: 'outline', icon: TrendingUp, label: 'Negotiating' },
      expired: { variant: 'secondary', icon: AlertCircle, label: 'Expired' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isExpiringSoon = (expirationDate: string) => {
    const daysUntilExpiration = Math.ceil(
      (new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading renewal offers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lease Renewal Offers</h1>
        <p className="text-muted-foreground">View and respond to renewal offers from your landlord</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No renewal offers at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {offers.map((offer) => (
            <Card key={offer.id} className={isExpiringSoon(offer.offer_expiration_date) && offer.status === 'pending' ? 'border-yellow-500' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{offer.lease?.property?.address}</CardTitle>
                    <CardDescription>
                      {offer.lease?.property?.city}, {offer.lease?.property?.state}
                    </CardDescription>
                  </div>
                  {getStatusBadge(offer.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isExpiringSoon(offer.offer_expiration_date) && offer.status === 'pending' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This offer expires in {Math.ceil((new Date(offer.offer_expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days. Please respond soon!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Rent</p>
                    <p className="text-lg font-semibold">${offer.original_rent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">New Rent</p>
                    <p className="text-lg font-semibold">${offer.proposed_rent.toFixed(2)}</p>
                    {offer.proposed_rent !== offer.original_rent && (
                      <p className="text-xs">
                        {offer.proposed_rent > offer.original_rent ? (
                          <span className="text-red-600">
                            +${(offer.proposed_rent - offer.original_rent).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-green-600">
                            -${(offer.original_rent - offer.proposed_rent).toFixed(2)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Term</p>
                    <p className="text-lg font-semibold">{offer.proposed_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="text-lg font-semibold">
                      {new Date(offer.offer_expiration_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {offer.special_terms && (
                  <div>
                    <p className="text-sm text-muted-foreground">Special Terms</p>
                    <p className="text-sm">{offer.special_terms}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => navigate(`/tenant/renewals/${offer.id}`)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {offer.status === 'negotiating' && (
                    <Button variant="outline" onClick={() => navigate(`/tenant/renewals/${offer.id}/negotiate`)}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Continue Negotiation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}