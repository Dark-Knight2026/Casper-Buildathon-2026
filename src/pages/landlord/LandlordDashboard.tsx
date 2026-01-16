import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase/client';
import { Building2, Users, FileText, DollarSign, Wrench, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  totalTenants: number;
  activeLeases: number;
  monthlyRevenue: number;
  pendingMaintenance: number;
  overduePayments: number;
  expiringLeases: number;
}

interface RecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease';
  title: string;
  description: string;
  timestamp: string;
  status: string;
}

export default function LandlordDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    activeLeases: 0,
    monthlyRevenue: 0,
    pendingMaintenance: 0,
    overduePayments: 0,
    expiringLeases: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch properties
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', user.id);

      // Fetch leases
      const { data: leases } = await supabase
        .from('leases')
        .select('*, properties(*)')
        .eq('properties.landlord_id', user.id)
        .eq('status', 'active');

      // Fetch payments
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: payments } = await supabase
        .from('payments')
        .select('*, leases!inner(*, properties!inner(*))')
        .eq('leases.properties.landlord_id', user.id)
        .gte('payment_date', `${currentMonth}-01`);

      // Fetch maintenance requests
      const { data: maintenance } = await supabase
        .from('maintenance_requests')
        .select('*, properties!inner(*)')
        .eq('properties.landlord_id', user.id)
        .eq('status', 'pending');

      if (!isMounted) return;

      // Calculate stats
      const totalProperties = properties?.length || 0;
      const occupiedProperties = leases?.length || 0;
      const activeLeases = leases?.length || 0;
      const monthlyRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const pendingMaintenance = maintenance?.length || 0;

      // Overdue payments
      const today = new Date().toISOString().split('T')[0];
      const { data: overduePayments } = await supabase
        .from('payments')
        .select('*, leases!inner(*, properties!inner(*))')
        .eq('leases.properties.landlord_id', user.id)
        .eq('status', 'pending')
        .lt('due_date', today);

      // Expiring leases (next 60 days)
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
      const { data: expiringLeases } = await supabase
        .from('leases')
        .select('*, properties!inner(*)')
        .eq('properties.landlord_id', user.id)
        .eq('status', 'active')
        .lte('end_date', sixtyDaysFromNow.toISOString().split('T')[0]);

      if (!isMounted) return;

      setStats({
        totalProperties,
        occupiedProperties,
        totalTenants: activeLeases,
        activeLeases,
        monthlyRevenue,
        pendingMaintenance,
        overduePayments: overduePayments?.length || 0,
        expiringLeases: expiringLeases?.length || 0,
      });

      // Fetch recent activities
      const activities: RecentActivity[] = [];

      // Recent payments
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('*, leases!inner(*, tenants(*), properties(*))')
        .eq('leases.properties.landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      recentPayments?.forEach(payment => {
        activities.push({
          id: payment.id,
          type: 'payment',
          title: `Payment ${payment.status}`,
          description: `$${payment.amount} from ${payment.leases?.tenants?.full_name || 'Tenant'}`,
          timestamp: payment.created_at,
          status: payment.status,
        });
      });

      // Recent maintenance
      const { data: recentMaintenance } = await supabase
        .from('maintenance_requests')
        .select('*, properties(*)')
        .eq('properties.landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      recentMaintenance?.forEach(request => {
        activities.push({
          id: request.id,
          type: 'maintenance',
          title: `Maintenance: ${request.category}`,
          description: request.description.substring(0, 50) + '...',
          timestamp: request.created_at,
          status: request.status,
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (isMounted) {
        setRecentActivities(activities.slice(0, 10));
        toast({
          variant: 'success',
          title: 'Dashboard loaded',
          description: 'Your dashboard data has been updated',
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (isMounted) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error loading dashboard',
          description: errorMessage,
        });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={fetchDashboardData} aria-label="Retry loading dashboard">
              Try Again
            </Button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
            <p className="text-muted-foreground">Overview of your properties and tenants</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/landlord/properties/new">Add Property</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/landlord/leases/new">Create Lease</Link>
            </Button>
          </div>
        </div>

        {/* Alert Cards */}
        {(stats.overduePayments > 0 || stats.expiringLeases > 0 || stats.pendingMaintenance > 0) && (
          <div className="grid gap-4 md:grid-cols-3">
            {stats.overduePayments > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-900">Overdue Payments</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-900">{stats.overduePayments}</div>
                  <Button asChild variant="link" className="text-red-600 p-0 h-auto">
                    <Link to="/landlord/payments?filter=overdue">View Details →</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {stats.expiringLeases > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-900">Expiring Leases</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-900">{stats.expiringLeases}</div>
                  <Button asChild variant="link" className="text-yellow-600 p-0 h-auto">
                    <Link to="/landlord/leases?filter=expiring">Review Renewals →</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {stats.pendingMaintenance > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-900">Pending Maintenance</CardTitle>
                  <Wrench className="h-4 w-4 text-orange-600" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">{stats.pendingMaintenance}</div>
                  <Button asChild variant="link" className="text-orange-600 p-0 h-auto">
                    <Link to="/landlord/maintenance?filter=pending">Assign Tasks →</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground">
                {stats.occupiedProperties} occupied
              </p>
              <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/landlord/properties">View All →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenants}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeLeases} active leases
              </p>
              <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/landlord/tenants">Manage Tenants →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Current month
              </p>
              <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/landlord/payments">View Payments →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLeases}</div>
              <p className="text-xs text-muted-foreground">
                {stats.expiringLeases} expiring soon
              </p>
              <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/landlord/leases">View Leases →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your properties</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Recent Activity"
                description="Activity from your properties will appear here. Get started by adding properties and creating leases."
                action={{
                  label: 'Add Property',
                  onClick: () => window.location.href = '/landlord/properties/new'
                }}
              />
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start justify-between border-b pb-4 last:border-0"
                    role="article"
                    aria-label={`${activity.title}: ${activity.description}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1" aria-hidden="true">
                        {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-green-600" />}
                        {activity.type === 'maintenance' && <Wrench className="h-4 w-4 text-orange-600" />}
                        {activity.type === 'lease' && <FileText className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      activity.status === 'completed' || activity.status === 'paid' ? 'default' :
                      activity.status === 'pending' ? 'secondary' :
                      activity.status === 'overdue' ? 'destructive' : 'outline'
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-auto py-4">
                <Link to="/landlord/properties/new" className="flex flex-col items-center gap-2">
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                  <span>Add Property</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4">
                <Link to="/landlord/tenants/new" className="flex flex-col items-center gap-2">
                  <Users className="h-6 w-6" aria-hidden="true" />
                  <span>Add Tenant</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4">
                <Link to="/landlord/leases/new" className="flex flex-col items-center gap-2">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                  <span>Create Lease</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4">
                <Link to="/landlord/payments/reports" className="flex flex-col items-center gap-2">
                  <TrendingUp className="h-6 w-6" aria-hidden="true" />
                  <span>View Reports</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}