import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase/client';
import { Users, Mail, Phone, Home, Search, Plus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  leases?: Array<{
    id: string;
    status: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    properties: {
      address: string;
      city: string;
      state: string;
    };
  }>;
  payment_history?: Array<{
    status: string;
    amount: number;
  }>;
}

export default function LandlordTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTenants = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all leases with tenant and property info
      const { data: leases, error } = await supabase
        .from('leases')
        .select(`
          id,
          status,
          start_date,
          end_date,
          monthly_rent,
          tenant_id,
          tenants (
            id,
            full_name,
            email,
            phone,
            created_at
          ),
          properties!inner (
            landlord_id,
            address,
            city,
            state
          )
        `)
        .eq('properties.landlord_id', user.id);

      if (error) throw error;

      // Group leases by tenant
      const tenantMap = new Map<string, Tenant>();
      
      leases?.forEach((lease) => {
        const tenant = lease.tenants;
        if (!tenant) return;

        if (!tenantMap.has(tenant.id)) {
          tenantMap.set(tenant.id, {
            id: tenant.id,
            full_name: tenant.full_name,
            email: tenant.email,
            phone: tenant.phone,
            created_at: tenant.created_at,
            leases: [],
            payment_history: [],
          });
        }

        const tenantData = tenantMap.get(tenant.id)!;
        tenantData.leases!.push({
          id: lease.id,
          status: lease.status,
          start_date: lease.start_date,
          end_date: lease.end_date,
          monthly_rent: lease.monthly_rent,
          properties: lease.properties,
        });
      });

      // Fetch payment history for each tenant
      const tenantsArray = Array.from(tenantMap.values());
      await Promise.all(
        tenantsArray.map(async (tenant) => {
          const leaseIds = tenant.leases?.map((l) => l.id) || [];
          const { data: payments } = await supabase
            .from('payments')
            .select('status, amount')
            .in('lease_id', leaseIds);

          tenant.payment_history = payments || [];
        })
      );

      setTenants(tenantsArray);
      setFilteredTenants(tenantsArray);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    let filtered = tenants;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (tenant) =>
          tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.phone.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((tenant) =>
        tenant.leases?.some((lease) => lease.status === statusFilter)
      );
    }

    setFilteredTenants(filtered);
  }, [searchTerm, statusFilter, tenants]);

  const getActiveLease = (tenant: Tenant) => {
    return tenant.leases?.find((lease) => lease.status === 'active');
  };

  const getTotalPaid = (tenant: Tenant) => {
    return tenant.payment_history?.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0) || 0;
  };

  const getOutstandingBalance = (tenant: Tenant) => {
    return tenant.payment_history?.reduce((sum, p) => sum + (p.status === 'pending' || p.status === 'overdue' ? p.amount : 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">Manage your tenant relationships</p>
        </div>
        <Button asChild>
          <Link to="/landlord/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tenants.filter((t) => t.leases?.some((l) => l.status === 'active')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${tenants.reduce((sum, t) => sum + getOutstandingBalance(t), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by lease status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Lease</SelectItem>
                <SelectItem value="pending">Pending Lease</SelectItem>
                <SelectItem value="expired">Expired Lease</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tenants found</h3>
            <p className="text-muted-foreground mb-4">
              {tenants.length === 0
                ? "Get started by adding your first tenant"
                : "Try adjusting your filters"}
            </p>
            {tenants.length === 0 && (
              <Button asChild>
                <Link to="/landlord/tenants/new">Add Tenant</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTenants.map((tenant) => {
            const activeLease = getActiveLease(tenant);
            const totalPaid = getTotalPaid(tenant);
            const outstanding = getOutstandingBalance(tenant);

            return (
              <Card key={tenant.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{tenant.full_name}</CardTitle>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {tenant.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {tenant.phone}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant={activeLease ? 'default' : 'secondary'}>
                      {activeLease ? 'Active' : 'No Active Lease'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeLease && (
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {activeLease.properties.address}, {activeLease.properties.city}, {activeLease.properties.state}
                      </span>
                    </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="text-lg font-semibold">
                        ${activeLease?.monthly_rent.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-semibold text-green-600">
                        ${totalPaid.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-semibold text-orange-600">
                        ${outstanding.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lease End</p>
                      <p className="text-lg font-semibold">
                        {activeLease ? new Date(activeLease.end_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/landlord/tenants/${tenant.id}`}>View Details</Link>
                    </Button>
                    {activeLease && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/landlord/leases/${activeLease.id}`}>View Lease</Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Mail className="mr-2 h-3 w-3" />
                      Contact
                    </Button>
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