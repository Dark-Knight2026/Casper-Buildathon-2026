import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { FileText, Calendar, DollarSign, User, Home, Search, Plus, AlertCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

interface Lease {
  id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  lease_terms: string;
  created_at: string;
  tenants: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  properties: {
    id: string;
    address: string;
    city: string;
    state: string;
    property_type: string;
  };
}

export default function LandlordLeases() {
  const [searchParams] = useSearchParams();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [filteredLeases, setFilteredLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all');

  const fetchLeases = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          tenants (
            id,
            full_name,
            email,
            phone
          ),
          properties!inner (
            landlord_id,
            id,
            address,
            city,
            state,
            property_type
          )
        `)
        .eq('properties.landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeases(data || []);
      setFilteredLeases(data || []);
    } catch (error) {
      console.error('Error fetching leases:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  useEffect(() => {
    let filtered = leases;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (lease) =>
          lease.tenants.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lease.properties.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lease.properties.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'expiring') {
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
        filtered = filtered.filter(
          (lease) =>
            lease.status === 'active' &&
            new Date(lease.end_date) <= sixtyDaysFromNow &&
            new Date(lease.end_date) >= new Date()
        );
      } else {
        filtered = filtered.filter((lease) => lease.status === statusFilter);
      }
    }

    setFilteredLeases(filtered);
  }, [searchTerm, statusFilter, leases]);

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getLeaseStatusBadge = (lease: Lease) => {
    const daysUntilExpiry = getDaysUntilExpiry(lease.end_date);
    
    if (lease.status === 'expired') {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (lease.status === 'terminated') {
      return <Badge variant="secondary">Terminated</Badge>;
    }
    if (lease.status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      return <Badge variant="destructive">Expiring Soon ({daysUntilExpiry} days)</Badge>;
    }
    if (daysUntilExpiry <= 60 && daysUntilExpiry > 30) {
      return <Badge className="bg-orange-500">Expiring ({daysUntilExpiry} days)</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading leases...</div>
      </div>
    );
  }

  const expiringLeases = leases.filter((lease) => {
    const days = getDaysUntilExpiry(lease.end_date);
    return lease.status === 'active' && days <= 60 && days > 0;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leases</h1>
          <p className="text-muted-foreground">Manage lease agreements and renewals</p>
        </div>
        <Button asChild>
          <Link to="/landlord/leases/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Lease
          </Link>
        </Button>
      </div>

      {/* Expiring Leases Alert */}
      {expiringLeases.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Leases Expiring Soon</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              {expiringLeases.length} lease{expiringLeases.length > 1 ? 's' : ''} expiring in the next 60 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringLeases.slice(0, 3).map((lease) => (
                <div key={lease.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{lease.tenants.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lease.properties.address} - Expires {new Date(lease.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/landlord/leases/${lease.id}`}>Review</Link>
                  </Button>
                </div>
              ))}
              {expiringLeases.length > 3 && (
                <Button
                  asChild
                  variant="link"
                  className="text-orange-600 p-0 h-auto"
                  onClick={() => setStatusFilter('expiring')}
                >
                  <span>View all {expiringLeases.length} expiring leases →</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {leases.filter((l) => l.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {expiringLeases.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${leases
                .filter((l) => l.status === 'active')
                .reduce((sum, l) => sum + l.monthly_rent, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Leases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tenant or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leases List */}
      {filteredLeases.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leases found</h3>
            <p className="text-muted-foreground mb-4">
              {leases.length === 0
                ? "Get started by creating your first lease"
                : "Try adjusting your filters"}
            </p>
            {leases.length === 0 && (
              <Button asChild>
                <Link to="/landlord/leases/new">Create Lease</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeases.map((lease) => (
            <Card key={lease.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {lease.tenants.full_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Home className="h-3 w-3" />
                      {lease.properties.address}, {lease.properties.city}, {lease.properties.state}
                    </CardDescription>
                  </div>
                  {getLeaseStatusBadge(lease)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lease.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(lease.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="font-semibold text-green-600 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {lease.monthly_rent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Security Deposit</p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {lease.security_deposit.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/landlord/leases/${lease.id}`}>View Details</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/landlord/tenants/${lease.tenants.id}`}>View Tenant</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/landlord/properties/${lease.properties.id}`}>View Property</Link>
                  </Button>
                  {lease.status === 'active' && getDaysUntilExpiry(lease.end_date) <= 60 && (
                    <Button size="sm">Renew Lease</Button>
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