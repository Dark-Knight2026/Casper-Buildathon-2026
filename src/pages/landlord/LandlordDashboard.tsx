import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Users, FileText, DollarSign, Wrench, TrendingUp, AlertCircle, Check, Clock, AlertTriangle, Scale, Loader2, MoreVertical, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportService } from '@/services/exportService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SecurityRecoveryCard } from '@/components/auth/SecurityRecoveryCard';
import {
  MOCK_LANDLORD_DASHBOARD_STATS,
  MOCK_LANDLORD_RECENT_ACTIVITIES,
  MOCK_LANDLORD_PORTFOLIO,
  MOCK_LANDLORD_LOAD_MS,
  type LandlordDashboardStats,
  type LandlordRecentActivity,
  type LandlordPortfolioRow,
} from '@/data/landlordMockData';

// Status pill styling — color AND icon (WCAG color-independence). The pill is a
// link affordance per design §2.4. "late" stays red (genuine escalation); the
// amber-not-red rule applies to the Outstanding metric, not to late rows.
const PORTFOLIO_STATUS_STYLES: Record<
  LandlordPortfolioRow['status'],
  { className: string; icon: typeof Check }
> = {
  paid: { className: 'bg-green-100 text-green-800', icon: Check },
  due: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  late: { className: 'bg-red-100 text-red-800', icon: AlertTriangle },
  dispute: { className: 'bg-blue-100 text-blue-800', icon: Scale },
  confirming: { className: 'bg-orange-100 text-orange-800', icon: Loader2 },
};

function PortfolioStatusPill({ row }: { row: LandlordPortfolioRow }) {
  const { className, icon: Icon } = PORTFOLIO_STATUS_STYLES[row.status];
  return (
    <Link to={row.statusHref} className="inline-flex" aria-label={`${row.property}: ${row.statusLabel}`}>
      <Badge className={`gap-1 ${className}`}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {row.statusLabel}
      </Badge>
    </Link>
  );
}

// Recent-activity status pills: icon + color, and a link to the relevant view
// (design §2.4). "overdue" stays red as a specific escalated item, mirroring the
// portfolio "late" row.
const ACTIVITY_STATUS_STYLES: Record<string, { className: string; icon: typeof Check }> = {
  paid: { className: 'bg-green-100 text-green-800', icon: Check },
  completed: { className: 'bg-green-100 text-green-800', icon: Check },
  pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
  partial: { className: 'bg-amber-100 text-amber-800', icon: Clock },
  overdue: { className: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

const ACTIVITY_TYPE_HREF: Record<LandlordRecentActivity['type'], string> = {
  payment: '/landlord/payments',
  maintenance: '/landlord/maintenance',
  lease: '/landlord/leases',
};

function ActivityStatusPill({ activity }: { activity: LandlordRecentActivity }) {
  const style = ACTIVITY_STATUS_STYLES[activity.status];
  const Icon = style?.icon;
  return (
    <Link
      to={ACTIVITY_TYPE_HREF[activity.type]}
      className="inline-flex shrink-0"
      aria-label={`${activity.title} — ${activity.status}`}
    >
      {style ? (
        <Badge className={`gap-1 capitalize ${style.className}`}>
          {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
          {activity.status}
        </Badge>
      ) : (
        <Badge variant="outline" className="capitalize">{activity.status}</Badge>
      )}
    </Link>
  );
}

export default function LandlordDashboard() {
  const [stats, setStats] = useState<LandlordDashboardStats>({
    totalProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    activeLeases: 0,
    monthlyRevenue: 0,
    pendingMaintenance: 0,
    overduePayments: 0,
    expiringLeases: 0,
  });
  const [recentActivities, setRecentActivities] = useState<LandlordRecentActivity[]>([]);
  const [portfolio, setPortfolio] = useState<LandlordPortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO(BE): replace MOCK_* with GET /api/v1/landlord/dashboard — BE-blocked
  // (LeaseFi MVP spec §3.7). The loading/error states are kept intact so the
  // real fetch drops straight in. Mock data shipped here is intentional
  // demo/preview content (same accepted pattern as the tenant pages), not a
  // deferred bug.
  const loadDashboardData = useCallback(() => {
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      setStats(MOCK_LANDLORD_DASHBOARD_STATS);
      setRecentActivities(MOCK_LANDLORD_RECENT_ACTIVITIES);
      setPortfolio(MOCK_LANDLORD_PORTFOLIO);
      setLoading(false);
    }, MOCK_LANDLORD_LOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cleanup = loadDashboardData();
    return cleanup;
  }, [loadDashboardData]);

  // Export the portfolio table to CSV (design §2 header affordance). Mapped to
  // plain records so the CSV has readable headers, and because an `interface`
  // (unlike a `type`) has no implicit index signature and isn't assignable to
  // the exporter's `Record<string, unknown>` parameter.
  const handleExportPortfolio = () => {
    const rows = portfolio.map((r) => ({
      Property: r.property,
      Tenant: r.tenant,
      Rent: r.rent,
      Status: r.statusLabel,
    }));
    exportService.exportToCSV(rows, 'portfolio.csv');
  };

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
            <Button onClick={loadDashboardData} aria-label="Retry loading dashboard">
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
        {/* Mobile: title block on top, actions stacked below in a column.
            ≥sm: original single row (title left, actions right). */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
            <p className="text-muted-foreground">Overview of your properties and tenants</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleExportPortfolio}
              disabled={portfolio.length === 0}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/landlord/leases/create">Create Lease</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/landlord/properties/create">Add Property</Link>
            </Button>
          </div>
        </div>

        <SecurityRecoveryCard />

        {/* Alert Cards */}
        {(stats.overduePayments > 0 || stats.expiringLeases > 0 || stats.pendingMaintenance > 0) && (
          <div className="grid gap-4 md:grid-cols-3">
            {/* Outstanding/overdue is a warning-state metric → amber, not red.
                Red is reserved for true escalation (e.g. a "late" row in the
                portfolio table). Design §2.3. */}
            {stats.overduePayments > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900">Overdue Payments</CardTitle>
                  <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-900">{stats.overduePayments}</div>
                  <Button asChild variant="link" className="text-amber-700 p-0 h-auto">
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

        {/* Portfolio table — the central PM surface (design §2: "Table is the
            surface. Don't bury data in cards"). Status pills carry icon + color
            and link to the relevant detail view. */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>Properties, tenants, and rent status at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolio.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No properties yet"
                description="Add your first property to start tracking rent and tenants here."
                action={{
                  label: 'Add Property',
                  onClick: () => window.location.href = '/landlord/properties/create',
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10 text-right sr-only">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.property}</TableCell>
                      <TableCell className="text-muted-foreground">{row.tenant}</TableCell>
                      <TableCell>${row.rent.toLocaleString()}</TableCell>
                      <TableCell><PortfolioStatusPill row={row} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <Link to={row.statusHref} aria-label={`Open ${row.property}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
                  onClick: () => window.location.href = '/landlord/properties/create'
                }}
              />
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-2 border-b pb-4 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-0"
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
                    <div className="pl-7 sm:pl-0">
                      <ActivityStatusPill activity={activity} />
                    </div>
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
                <Link to="/landlord/properties/create" className="flex flex-col items-center gap-2">
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
                <Link to="/landlord/leases/create" className="flex flex-col items-center gap-2">
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
