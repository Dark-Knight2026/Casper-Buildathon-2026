import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { leaseRenewalService, LeaseRenewal } from '@/services/leaseRenewalService';
import RenewalOfferCard from '@/components/lease-renewal/RenewalOfferCard';
import RenewalResponseDialog from '@/components/lease-renewal/RenewalResponseDialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';

export default function TenantRenewals() {
  const navigate = useNavigate();
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRenewal, setSelectedRenewal] = useState<LeaseRenewal | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);

  const loadRenewals = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const data = await leaseRenewalService.getTenantRenewals(user.id);
      setRenewals(data);
    } catch (error) {
      console.error('Error loading renewals:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadRenewals();
  }, [loadRenewals]);

  const handleViewDetails = (renewalId: string) => {
    navigate(`/tenant/renewals/${renewalId}`);
  };

  const handleRespond = (renewalId: string) => {
    const renewal = renewals.find(r => r.id === renewalId);
    if (renewal) {
      setSelectedRenewal(renewal);
      setResponseDialogOpen(true);
    }
  };

  const handleResponseSuccess = () => {
    loadRenewals();
  };

  const pendingRenewals = renewals.filter(r => r.status === 'offer-sent' || r.status === 'negotiating');
  const completedRenewals = renewals.filter(r => r.status === 'accepted' || r.status === 'completed' || r.status === 'declined');

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading renewals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Renewals</h1>
          <p className="text-muted-foreground">Manage your lease renewal offers</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadRenewals}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {renewals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-semibold mb-2">No Renewal Offers</h3>
            <p className="text-muted-foreground">
              You don't have any lease renewal offers at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pendingRenewals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Pending Renewals</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRenewals.map((renewal) => (
                  <RenewalOfferCard
                    key={renewal.id}
                    renewal={renewal}
                    onViewDetails={handleViewDetails}
                    onRespond={handleRespond}
                  />
                ))}
              </div>
            </div>
          )}

          {completedRenewals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Past Renewals</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {completedRenewals.map((renewal) => (
                  <RenewalOfferCard
                    key={renewal.id}
                    renewal={renewal}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <RenewalResponseDialog
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
        renewal={selectedRenewal}
        onSuccess={handleResponseSuccess}
      />
    </div>
  );
}