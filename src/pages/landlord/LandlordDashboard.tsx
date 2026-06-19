/**
 * Landlord Dashboard. The KPI cards (properties, tenants, active leases, monthly
 * revenue) and the expiring-leases alert are computed from real data
 * (`GET /listings/landlord` + `GET /leases?landlordId=me`). The portfolio table
 * and recent-activity feed have no backend yet (no payments/maintenance API) and
 * are clearly marked "Demo".
 */

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  Wrench,
  TrendingUp,
  AlertCircle,
  Check,
  Clock,
  AlertTriangle,
  Scale,
  Loader2,
  MoreVertical,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportService } from '@/services/exportService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { getLandlordListings } from '@/services/listingService';
import { listLeases } from '@/services/leaseService';
import {
  MOCK_LANDLORD_RECENT_ACTIVITIES,
  MOCK_LANDLORD_PORTFOLIO,
  type LandlordRecentActivity,
  type LandlordPortfolioRow,
} from '@/data/landlordMockData';

/** Small marker for sections that aren't backend-wired yet. */
function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="border-orange-500 text-orange-500 text-[10px] uppercase tracking-wide"
    >
      Demo
    </Badge>
  );
}

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
    <Link to={row.statusHref} className="inline-flex">
      <Badge className={`gap-1 ${className}`}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {row.statusLabel}
      </Badge>
    </Link>
  );
}

const ACTIVITY_STATUS_STYLES: Record<
  string,
  { className: string; icon: typeof Check }
> = {
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

function ActivityStatusPill({
  activity,
}: {
  activity: LandlordRecentActivity;
}) {
  const style = ACTIVITY_STATUS_STYLES[activity.status];
  const Icon = style?.icon;
  return (
    <Link
      to={ACTIVITY_TYPE_HREF[activity.type]}
      className="inline-flex shrink-0"
    >
      {style ? (
        <Badge className={`gap-1 capitalize ${style.className}`}>
          {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
          {activity.status}
        </Badge>
      ) : (
        <Badge variant="outline" className="capitalize">
          {activity.status}
        </Badge>
      )}
    </Link>
  );
}

export default function LandlordDashboard() {
  const listingsQuery = useQuery({
    queryKey: ['landlord-dashboard-listings'],
    queryFn: () => getLandlordListings({ pageSize: 100 }),
  });
  const leasesQuery = useQuery({
    queryKey: ['landlord-dashboard-leases'],
    queryFn: () => listLeases({ landlordId: 'me', pageSize: 100 }),
  });

  // Demo content (no payments/maintenance API yet).
  const portfolio = MOCK_LANDLORD_PORTFOLIO;
  const recentActivities = MOCK_LANDLORD_RECENT_ACTIVITIES;

  const handleExportPortfolio = () => {
    const rows = portfolio.map((r) => ({
      Property: r.property,
      Tenant: r.tenant,
      Rent: r.rent,
      Status: r.statusLabel,
    }));
    exportService.exportToCSV(rows, 'portfolio.csv');
  };

  if (listingsQuery.isLoading || leasesQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (listingsQuery.isError || leasesQuery.isError) {
    return (
      <ErrorBoundary>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Couldn’t load your dashboard. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </ErrorBoundary>
    );
  }

  // Real KPIs derived from the landlord's listings + leases.
  const listings = listingsQuery.data?.data ?? [];
  const leases = leasesQuery.data?.data ?? [];
  const activeLeases = leases.filter((l) => l.status === 'active');
  const propertyIds = new Set(listings.map((l) => l.propertyId));
  const occupiedIds = new Set(activeLeases.map((l) => l.propertyId));
  const tenantIds = new Set(activeLeases.flatMap((l) => l.tenantIds));
  const monthlyRevenue = activeLeases.reduce(
    (sum, l) => sum + l.monthlyRent,
    0
  );
  const expiringLeases = leases.filter(
    (l) => l.status === 'expiring-soon'
  ).length;

  const stats = {
    totalProperties: propertyIds.size,
    occupiedProperties: occupiedIds.size,
    totalTenants: tenantIds.size,
    activeLeases: activeLeases.length,
    monthlyRevenue,
    expiringLeases,
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your properties and tenants
            </p>
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

        {/* Expiring-leases alert (real) */}
        {stats.expiringLeases > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 md:max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-900">
                Expiring Leases
              </CardTitle>
              <AlertCircle
                className="h-4 w-4 text-yellow-600"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">
                {stats.expiringLeases}
              </div>
              <Button
                asChild
                variant="link"
                className="text-yellow-600 p-0 h-auto"
              >
                <Link to="/landlord/leases?filter=expiring">
                  Review Renewals →
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid (real) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Properties
              </CardTitle>
              <Building2
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
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
              <CardTitle className="text-sm font-medium">
                Active Tenants
              </CardTitle>
              <Users
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
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
              <CardTitle className="text-sm font-medium">
                Monthly Revenue
              </CardTitle>
              <DollarSign
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                from active leases
              </p>
              <Button asChild variant="link" className="p-0 h-auto mt-2">
                <Link to="/landlord/leases">View Leases →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Leases
              </CardTitle>
              <FileText
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
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

        {/* Portfolio table (Demo — no payments API) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Portfolio</CardTitle>
              <DemoBadge />
            </div>
            <CardDescription>
              Properties, tenants, and rent status at a glance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portfolio.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No properties yet"
                description="Add your first property to start tracking rent and tenants here."
                action={{
                  label: 'Add Property',
                  onClick: () =>
                    (window.location.href = '/landlord/properties/create'),
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
                    <TableHead className="w-10 text-right sr-only">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.property}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.tenant}
                      </TableCell>
                      <TableCell>${row.rent.toLocaleString()}</TableCell>
                      <TableCell>
                        <PortfolioStatusPill row={row} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <Link
                            to={row.statusHref}
                            aria-label={`Open ${row.property}`}
                          >
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

        {/* Recent Activity (Demo — no payments/maintenance API) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Recent Activity</CardTitle>
              <DemoBadge />
            </div>
            <CardDescription>
              Latest updates from your properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col gap-2 border-b pb-4 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1" aria-hidden="true">
                      {activity.type === 'payment' && (
                        <DollarSign className="h-4 w-4 text-green-600" />
                      )}
                      {activity.type === 'maintenance' && (
                        <Wrench className="h-4 w-4 text-orange-600" />
                      )}
                      {activity.type === 'lease' && (
                        <FileText className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
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
                <Link
                  to="/landlord/properties/create"
                  className="flex flex-col items-center gap-2"
                >
                  <Building2 className="h-6 w-6" aria-hidden="true" />
                  <span>Add Property</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4">
                <Link
                  to="/landlord/leases/create"
                  className="flex flex-col items-center gap-2"
                >
                  <FileText className="h-6 w-6" aria-hidden="true" />
                  <span>Create Lease</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4">
                <Link
                  to="/landlord/renewals/create"
                  className="flex flex-col items-center gap-2"
                >
                  <TrendingUp className="h-6 w-6" aria-hidden="true" />
                  <span>Create Renewal</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4">
                <Link
                  to="/landlord/applications"
                  className="flex flex-col items-center gap-2"
                >
                  <Users className="h-6 w-6" aria-hidden="true" />
                  <span>Applications</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
