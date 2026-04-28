import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, AlertCircle, Clock, CheckCircle2, XCircle, TrendingUp, RefreshCw } from 'lucide-react';
import type { RenewalOfferWithRelations } from '@/types/renewal';

// TODO: remove when GET /api/v1/renewals?tenantId=me is ready
const MOCK_OFFERS: RenewalOfferWithRelations[] = [
  {
    id: 'ro-001',
    lease_id: 'mock-lease-1',
    landlord_id: 'mock-landlord-1',
    tenant_id: 'mock-tenant-1',
    status: 'pending',
    original_rent: 1500,
    proposed_rent: 1575,
    final_rent: null,
    original_term_months: 12,
    proposed_term_months: 12,
    final_term_months: null,
    special_terms: 'No smoking policy continues. Pet deposit remains at current level.',
    offer_expiration_date: '2026-04-13',
    response_date: null,
    new_lease_start_date: '2026-01-01',
    new_lease_end_date: '2027-01-01',
    negotiation_rounds: 0,
    created_at: '2026-04-01',
    updated_at: '2026-04-01',
    lease: {
      id: 'mock-lease-1',
      monthly_rent: 1500,
      lease_term_months: 12,
      start_date: '2025-01-01',
      end_date: '2026-01-01',
      landlord_id: 'mock-landlord-1',
      tenant_id: 'mock-tenant-1',
      property_id: 'mock-prop-1',
      property: { id: 'mock-prop-1', address: '123 Demo Street', city: 'New York', state: 'NY', zip_code: '10001', property_type: 'Apartment' },
      landlord: { id: 'mock-landlord-1', first_name: 'John', last_name: 'Smith', email: 'landlord@demo.com', phone: '+1 (555) 100-2000' },
    },
  },
  {
    id: 'ro-002',
    lease_id: 'mock-lease-1',
    landlord_id: 'mock-landlord-1',
    tenant_id: 'mock-tenant-1',
    status: 'negotiating',
    original_rent: 1500,
    proposed_rent: 1600,
    final_rent: null,
    original_term_months: 12,
    proposed_term_months: 6,
    final_term_months: null,
    special_terms: null,
    offer_expiration_date: '2026-05-01',
    response_date: null,
    new_lease_start_date: '2026-01-01',
    new_lease_end_date: '2026-07-01',
    negotiation_rounds: 1,
    created_at: '2026-03-15',
    updated_at: '2026-03-20',
    lease: {
      id: 'mock-lease-1',
      monthly_rent: 1500,
      lease_term_months: 12,
      start_date: '2025-01-01',
      end_date: '2026-01-01',
      landlord_id: 'mock-landlord-1',
      tenant_id: 'mock-tenant-1',
      property_id: 'mock-prop-1',
      property: { id: 'mock-prop-1', address: '123 Demo Street', city: 'New York', state: 'NY', zip_code: '10001', property_type: 'Apartment' },
      landlord: { id: 'mock-landlord-1', first_name: 'John', last_name: 'Smith', email: 'landlord@demo.com', phone: '+1 (555) 100-2000' },
    },
  },
];

const STATUS_BADGE: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
  pending:     { icon: Clock,        label: 'Pending',     className: 'bg-yellow-100 text-yellow-800' },
  accepted:    { icon: CheckCircle2, label: 'Accepted',    className: 'bg-green-100 text-green-800'  },
  declined:    { icon: XCircle,      label: 'Declined',    className: 'bg-red-100 text-red-800'      },
  negotiating: { icon: TrendingUp,   label: 'Negotiating', className: 'bg-blue-100 text-blue-800'   },
  expired:     { icon: AlertCircle,  label: 'Expired',     className: 'bg-secondary text-secondary-foreground' },
};

const isExpiringSoon = (date: string) => {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return days <= 7 && days > 0;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));

export default function TenantRenewalOfferList() {
  const navigate = useNavigate();

  // TODO: replace with GET /api/v1/renewals?tenantId=me when backend is ready
  const offers = MOCK_OFFERS;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Lease Renewal Offers</h1>
        <p className="text-muted-foreground">View and respond to renewal offers from your landlord</p>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No renewal offers</p>
            <p className="text-xs text-muted-foreground">Your landlord hasn't sent any renewal offers yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {offers.map(offer => {
            const cfg = STATUS_BADGE[offer.status] ?? STATUS_BADGE.pending;
            const Icon = cfg.icon;
            const expiringSoon = isExpiringSoon(offer.offer_expiration_date) && offer.status === 'pending';

            return (
              <Card key={offer.id} className={expiringSoon ? 'border-yellow-500' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{offer.lease?.property?.address}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {offer.lease?.property?.city}, {offer.lease?.property?.state}
                      </p>
                    </div>
                    <Badge className={`${cfg.className} flex items-center gap-1 shrink-0`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {expiringSoon && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Offer expires in {Math.ceil((new Date(offer.offer_expiration_date).getTime() - Date.now()) / 86400000)} days — please respond soon!
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Rent</p>
                      <p className="text-lg font-semibold text-foreground">${offer.original_rent.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">New Rent</p>
                      <p className="text-lg font-semibold text-foreground">${offer.proposed_rent.toFixed(2)}</p>
                      {offer.proposed_rent !== offer.original_rent && (
                        <p className={`text-xs ${offer.proposed_rent > offer.original_rent ? 'text-red-600' : 'text-green-600'}`}>
                          {offer.proposed_rent > offer.original_rent ? '+' : '-'}
                          ${Math.abs(offer.proposed_rent - offer.original_rent).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Term</p>
                      <p className="text-lg font-semibold text-foreground">{offer.proposed_term_months} months</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="text-lg font-semibold text-foreground">{formatDate(offer.offer_expiration_date)}</p>
                    </div>
                  </div>

                  {offer.special_terms && (
                    <div>
                      <p className="text-sm text-muted-foreground">Special Terms</p>
                      <p className="text-sm text-foreground">{offer.special_terms}</p>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-2">
                    <Button onClick={() => navigate(`/tenant/renewals/${offer.id}`, { state: { offer } })}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    {offer.status === 'negotiating' && (
                      <Button variant="outline" onClick={() => navigate(`/tenant/renewals/${offer.id}/negotiate`, { state: { offer } })}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Continue Negotiation
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
