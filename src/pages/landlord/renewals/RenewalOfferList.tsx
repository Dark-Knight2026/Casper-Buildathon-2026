import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Eye, AlertCircle, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { renewalService, RenewalOffer } from '@/services/renewalService';
import { supabase } from '@/lib/supabase/client';
import { LucideIcon } from 'lucide-react';

interface StatusConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: LucideIcon;
}

export default function RenewalOfferList() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<RenewalOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<RenewalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    negotiating: 0,
    expired: 0,
  });

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!landlord) throw new Error('Landlord profile not found');

      const data = await renewalService.getRenewalOffersByLandlord(landlord.id);
      setOffers(data);

      // Calculate stats
      const newStats = {
        total: data.length,
        pending: data.filter(o => o.status === 'pending').length,
        accepted: data.filter(o => o.status === 'accepted').length,
        declined: data.filter(o => o.status === 'declined').length,
        negotiating: data.filter(o => o.status === 'negotiating').length,
        expired: data.filter(o => o.status === 'expired').length,
      };
      setStats(newStats);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterOffers = useCallback(() => {
    let filtered = [...offers];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.lease?.property?.address?.toLowerCase().includes(query) ||
        o.lease?.tenant?.first_name?.toLowerCase().includes(query) ||
        o.lease?.tenant?.last_name?.toLowerCase().includes(query)
      );
    }

    setFilteredOffers(filtered);
  }, [offers, searchQuery, statusFilter]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    filterOffers();
  }, [filterOffers]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, StatusConfig> = {
      pending: { variant: 'secondary', icon: Clock },
      accepted: { variant: 'default', icon: CheckCircle2 },
      declined: { variant: 'destructive', icon: XCircle },
      negotiating: { variant: 'outline', icon: TrendingUp },
      expired: { variant: 'secondary', icon: AlertCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRentChangeIndicator = (offer: RenewalOffer) => {
    const change = offer.proposed_rent - offer.original_rent;
    if (change > 0) {
      return (
        <span className="text-red-600 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          +${change.toFixed(2)}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="text-green-600 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          ${change.toFixed(2)}
        </span>
      );
    }
    return <span className="text-muted-foreground">No change</span>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Renewals</h1>
          <p className="text-muted-foreground">Manage renewal offers and negotiations</p>
        </div>
        <Button onClick={() => navigate('/landlord/renewals/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negotiating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.negotiating}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Renewal Offers</CardTitle>
          <CardDescription>View and manage all renewal offers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by property or tenant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Current Rent</TableHead>
                  <TableHead>Proposed Rent</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No renewal offers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="font-medium">
                        {offer.lease?.property?.address || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {offer.lease?.tenant?.first_name} {offer.lease?.tenant?.last_name}
                      </TableCell>
                      <TableCell>${offer.original_rent.toFixed(2)}</TableCell>
                      <TableCell>${offer.proposed_rent.toFixed(2)}</TableCell>
                      <TableCell>{getRentChangeIndicator(offer)}</TableCell>
                      <TableCell>{offer.proposed_term_months} months</TableCell>
                      <TableCell>{getStatusBadge(offer.status)}</TableCell>
                      <TableCell>
                        {new Date(offer.offer_expiration_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/landlord/renewals/${offer.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}