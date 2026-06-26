import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { leaseRenewalService } from '@/services/leaseRenewalService';
import RenewalNegotiationThread from '@/components/lease-renewal/RenewalNegotiationThread';
import { ArrowLeft, FileText, Loader2, Mail, Phone } from 'lucide-react';

interface RenewalWithLease {
  id: string;
  lease_id: string;
  status: string;
  original_rent: number;
  proposed_rent: number;
  proposed_term_months: number;
  proposed_start_date: string;
  proposed_end_date: string;
  offer_sent_date: string | null;
  response_deadline: string | null;
  tenant_response: string | null;
  tenant_response_date: string | null;
  counter_offer_rent: number | null;
  counter_offer_terms: string | null;
  offer_document_url: string | null;
  new_lease_id: string | null;
  leases: {
    properties: {
      address: string;
      city: string;
      state: string;
    };
    tenants: {
      full_name: string;
      email: string;
      phone: string;
    };
  };
}

export default function LandlordRenewalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [renewal, setRenewal] = useState<RenewalWithLease | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRenewal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await leaseRenewalService.getRenewalById(id);
      setRenewal(data as unknown as RenewalWithLease);
    } catch (error) {
      console.error('Error loading renewal:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadRenewal();
    }
  }, [id, loadRenewal]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!renewal) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-semibold mb-2">Renewal not found</h3>
            <Button onClick={() => navigate('/landlord/renewals')}>
              Back to Renewals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rentChange = renewal.proposed_rent - renewal.original_rent;
  const rentChangePercent = ((rentChange / renewal.original_rent) * 100).toFixed(1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/landlord/renewals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Renewal Details</h1>
          <p className="text-muted-foreground">
            {renewal.leases.properties.address}, {renewal.leases.properties.city}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Renewal Offer</CardTitle>
                  <CardDescription>Proposed terms</CardDescription>
                </div>
                <Badge variant={renewal.status === 'accepted' ? 'default' : 'outline'}>
                  {renewal.status.replace('-', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Rent</p>
                  <p className="text-2xl font-bold">${renewal.original_rent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Proposed Rent</p>
                  <p className="text-2xl font-bold">${renewal.proposed_rent.toLocaleString()}</p>
                  {rentChange !== 0 && (
                    <p className={`text-sm ${rentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rentChange > 0 ? '+' : ''}{rentChangePercent}%
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lease Term</p>
                  <p className="text-sm">{renewal.proposed_term_months} months</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-sm">{new Date(renewal.proposed_start_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <p className="text-sm">{new Date(renewal.proposed_end_date).toLocaleDateString()}</p>
              </div>

              {renewal.offer_sent_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Offer Sent</p>
                  <p className="text-sm">{new Date(renewal.offer_sent_date).toLocaleDateString()}</p>
                </div>
              )}

              {renewal.response_deadline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response Deadline</p>
                  <p className="text-sm">{new Date(renewal.response_deadline).toLocaleDateString()}</p>
                </div>
              )}

              {renewal.offer_document_url && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={renewal.offer_document_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" />
                    View Offer Document
                  </a>
                </Button>
              )}

              {renewal.new_lease_id && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => navigate(`/landlord/leases/${renewal.new_lease_id}`)}
                >
                  View New Lease
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{renewal.leases.tenants.full_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${renewal.leases.tenants.email}`} className="text-sm text-blue-600 hover:underline">
                  {renewal.leases.tenants.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${renewal.leases.tenants.phone}`} className="text-sm text-blue-600 hover:underline">
                  {renewal.leases.tenants.phone}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {renewal.tenant_response && (
            <Card>
              <CardHeader>
                <CardTitle>Tenant Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response</p>
                  <Badge variant={renewal.tenant_response === 'accept' ? 'default' : renewal.tenant_response === 'decline' ? 'destructive' : 'secondary'}>
                    {renewal.tenant_response.toUpperCase()}
                  </Badge>
                </div>
                {renewal.tenant_response_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-sm">{new Date(renewal.tenant_response_date).toLocaleDateString()}</p>
                  </div>
                )}
                {renewal.counter_offer_rent && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Counter-Offer Rent</p>
                    <p className="text-sm font-bold">${renewal.counter_offer_rent.toLocaleString()}</p>
                  </div>
                )}
                {renewal.counter_offer_terms && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Counter-Offer Terms</p>
                    <p className="text-sm">{renewal.counter_offer_terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(renewal.status === 'negotiating' || renewal.status === 'offer-sent') && id && (
            <RenewalNegotiationThread renewalId={id} userType="landlord" />
          )}
        </div>
      </div>
    </div>
  );
}