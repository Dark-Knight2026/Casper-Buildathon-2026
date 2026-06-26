import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { leaseRenewalService, LeaseRenewal } from '@/services/leaseRenewalService';
import RenewalOfferCard from '@/components/lease-renewal/RenewalOfferCard';
import CreateRenewalOfferDialog from '@/components/lease-renewal/CreateRenewalOfferDialog';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Loader2, RefreshCw, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Lease {
  id: string;
  monthly_rent: number;
  end_date: string;
}

interface RenewalAnalytics {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  negotiating: number;
  renewalRate: string;
  avgRentIncrease: string;
}

export default function LandlordRenewals() {
  const navigate = useNavigate();
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [analytics, setAnalytics] = useState<RenewalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      const [renewalsData, analyticsData] = await Promise.all([
        leaseRenewalService.getLandlordRenewals(user.id),
        leaseRenewalService.getRenewalAnalytics(user.id),
      ]);

      setRenewals(renewalsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetails = (renewalId: string) => {
    navigate(`/landlord/renewals/${renewalId}`);
  };

  const handleCreateOffer = (lease: Lease) => {
    setSelectedLease(lease);
    setCreateDialogOpen(true);
  };

  const pendingRenewals = renewals.filter(r => r.status === 'offer-sent' || r.status === 'pending');
  const negotiatingRenewals = renewals.filter(r => r.status === 'negotiating');
  const acceptedRenewals = renewals.filter(r => r.status === 'accepted' || r.status === 'completed');
  const declinedRenewals = renewals.filter(r => r.status === 'declined');

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
          <p className="text-muted-foreground">Manage lease renewal offers and track performance</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Renewals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renewal Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.renewalRate}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.accepted} accepted
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rent Increase</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.avgRentIncrease}</div>
              <p className="text-xs text-muted-foreground">
                Per renewal
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.pending}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting response
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRenewals.length})
          </TabsTrigger>
          <TabsTrigger value="negotiating">
            Negotiating ({negotiatingRenewals.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Accepted ({acceptedRenewals.length})
          </TabsTrigger>
          <TabsTrigger value="declined">
            Declined ({declinedRenewals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRenewals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Renewals</h3>
                <p className="text-muted-foreground">
                  All renewal offers have been responded to.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingRenewals.map((renewal) => (
                <RenewalOfferCard
                  key={renewal.id}
                  renewal={renewal}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="negotiating" className="space-y-4">
          {negotiatingRenewals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <h3 className="text-lg font-semibold mb-2">No Active Negotiations</h3>
                <p className="text-muted-foreground">
                  There are no renewals currently under negotiation.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {negotiatingRenewals.map((renewal) => (
                <RenewalOfferCard
                  key={renewal.id}
                  renewal={renewal}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {acceptedRenewals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Accepted Renewals</h3>
                <p className="text-muted-foreground">
                  No renewals have been accepted yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {acceptedRenewals.map((renewal) => (
                <RenewalOfferCard
                  key={renewal.id}
                  renewal={renewal}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="declined" className="space-y-4">
          {declinedRenewals.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Declined Renewals</h3>
                <p className="text-muted-foreground">
                  No renewals have been declined.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {declinedRenewals.map((renewal) => (
                <RenewalOfferCard
                  key={renewal.id}
                  renewal={renewal}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateRenewalOfferDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        lease={selectedLease}
        onSuccess={loadData}
      />
    </div>
  );
}