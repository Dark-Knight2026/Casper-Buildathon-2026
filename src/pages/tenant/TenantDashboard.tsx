/**
 * Tenant Dashboard. The active-lease hero, quick-stats, current-lease card and
 * renewal banners are wired to real data (`GET /api/v1/leases?tenantId=me` plus
 * the property). Payments, lease-activity, recommendations and the tenant score
 * have no backend yet and are clearly marked "Demo".
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  Home,
  FileText,
  DollarSign,
  Wrench,
  Calendar,
  Download,
  CreditCard,
  Bell,
  MapPin,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Payment } from '@/services/paymentService';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LeaseExtensionBanner } from '@/components/tenant/LeaseExtensionBanner';
import { LeaseDecisionBanner } from '@/components/tenant/LeaseDecisionBanner';
import { TenantScoreCard } from '@/components/tenant/TenantScoreCard';
import { useTenantScore } from '@/hooks/useTenantScore';
import { daysUntil } from '@/lib/date-utils';
import { listLeases } from '@/services/leaseService';
import { fetchAllPages } from '@/lib/pagination';
import { getProperty } from '@/services/propertyAssetService';
import {
  LEASE_TYPE_LABEL,
  LEASE_STATUS_BADGE,
  formatLeaseMoney,
} from '@/lib/leaseDisplay';

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

// Demo fixtures — no backend for payments / lease-activity yet.
const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'p1',
    amount: 1500,
    paymentDate: new Date('2025-12-01'),
    paymentMethod: 'bank_transfer',
    paymentStatus: 'completed',
    leaseId: 'mock-lease-1',
  } as Payment,
  {
    id: 'p2',
    amount: 1500,
    paymentDate: new Date('2025-11-01'),
    paymentMethod: 'bank_transfer',
    paymentStatus: 'completed',
    leaseId: 'mock-lease-1',
  } as Payment,
];

type ActivityItem = {
  id: string;
  label: string;
  date: Date;
  amount?: number;
  note?: string;
};

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'a1',
    label: 'Rent paid',
    date: new Date('2025-12-01'),
    amount: 1500,
    note: 'finalized',
  },
  { id: 'a2', label: 'Lease signed', date: new Date('2025-10-01') },
  {
    id: 'a3',
    label: 'Deposit funded',
    date: new Date('2025-09-30'),
    amount: 3000,
    note: 'refundable',
  },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amount
  );

const formatDate = (date: Date | string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

const getPaymentStatusBadge = (status: string) => {
  const statusStyles: Record<
    string,
    { className: string; icon: typeof Check }
  > = {
    completed: { className: 'bg-green-100 text-green-800', icon: Check },
    pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
    processing: { className: 'bg-blue-100 text-blue-800', icon: Loader2 },
    failed: { className: 'bg-red-100 text-red-800', icon: AlertTriangle },
    refunded: { className: 'bg-gray-100 text-gray-800', icon: RotateCcw },
    cancelled: { className: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
  };
  const { className, icon: Icon } =
    statusStyles[status] || statusStyles.pending;
  return (
    <Badge className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {status.toUpperCase()}
    </Badge>
  );
};

export function TenantDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { score: tenantScore } = useTenantScore();
  const greetingName = profile?.firstName?.trim();

  // Real active lease (+ its property for the address).
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-dashboard-lease'],
    queryFn: async () => {
      const leases = await fetchAllPages((page, pageSize) =>
        listLeases({ tenantId: 'me', page, pageSize })
      );
      const active =
        leases.find(
          (l) => l.status === 'active' || l.status === 'expiring-soon'
        ) ?? null;
      const property = active
        ? await getProperty(active.propertyId).catch(() => null)
        : null;
      return { lease: active, property };
    },
  });

  const lease = data?.lease ?? null;
  const property = data?.property ?? null;
  const propertyAddress = property
    ? `${property.addressLine1}, ${property.city}, ${property.stateOrProvince}`
    : lease
      ? `Property ${lease.propertyId.slice(0, 8)}…`
      : '';
  const daysUntilExpiration = lease ? daysUntil(new Date(lease.endDate)) : 0;
  const showExpirationWarning = lease != null && daysUntilExpiration <= 60;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            {greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
          </h1>
          <p className="text-gray-600">
            Here's an overview of your rental information
          </p>
        </div>

        {showExpirationWarning && (
          <Alert className="mb-6">
            <Bell className="h-4 w-4" />
            <AlertDescription>
              Your lease expires in {daysUntilExpiration} days. Consider
              reaching out to your landlord about renewal options.
            </AlertDescription>
          </Alert>
        )}

        {lease && (
          <div className="mb-6 space-y-3">
            <LeaseExtensionBanner
              leaseId={lease.id}
              endDate={new Date(lease.endDate)}
              propertyAddress={propertyAddress}
            />
            <LeaseDecisionBanner
              leaseId={lease.id}
              endDate={new Date(lease.endDate)}
              propertyAddress={propertyAddress}
            />
          </div>
        )}

        {/* Tenant score (Demo — no backend) */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              Tenant score
            </span>
            <DemoBadge />
          </div>
          <TenantScoreCard score={tenantScore} variant="compact" />
        </div>

        {/* Active-lease hero */}
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-lg mb-8" />
        ) : lease ? (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Active lease
                  </p>
                  <p className="flex items-center gap-2 text-base font-semibold">
                    <MapPin
                      className="h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    />
                    {propertyAddress}
                  </p>
                </div>
                <Badge className="gap-1 bg-green-100 text-green-800">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {LEASE_STATUS_BADGE[lease.status].label}
                </Badge>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-600">
                  {daysUntilExpiration > 0
                    ? `Lease ends in ${daysUntilExpiration} days`
                    : 'Lease term has ended'}
                </p>
                <p className="mt-1 text-4xl font-bold tracking-tight">
                  {formatLeaseMoney(lease.monthlyRent, lease.currency)}
                  <span className="text-base font-normal text-gray-500">
                    {' '}
                    / month
                  </span>
                </p>
              </div>

              <Button
                className="mt-6"
                onClick={() => navigate('/tenant/payments')}
                aria-label="Pay rent"
              >
                Pay rent
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6">
              <EmptyState
                icon={Home}
                title="No active lease"
                description="You don't have an active lease yet. Browse available properties to find your next home."
                action={{
                  label: 'Browse properties',
                  onClick: () => navigate('/tenant/property-search'),
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {lease && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Rent
                </CardTitle>
                <DollarSign
                  className="h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatLeaseMoney(lease.monthlyRent, lease.currency)}
                </div>
                <p className="text-xs text-gray-500 mt-1">per month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lease Expires
                </CardTitle>
                <Calendar
                  className="h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDate(lease.endDate)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {daysUntilExpiration} days remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Security Deposit
                </CardTitle>
                <CreditCard
                  className="h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatLeaseMoney(lease.securityDeposit, lease.currency)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Refundable at lease end
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lease Status
                </CardTitle>
                <FileText
                  className="h-4 w-4 text-gray-400"
                  aria-hidden="true"
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {LEASE_STATUS_BADGE[lease.status].label}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {LEASE_TYPE_LABEL[lease.type]} lease
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Lease & Quick Actions */}
        {lease && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Current Lease</CardTitle>
                <CardDescription>
                  Your active rental agreement details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Property Address</p>
                    <p className="text-sm text-gray-600">{propertyAddress}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/tenant/leases/${lease.id}`)}
                    aria-label="View lease details"
                  >
                    View Details
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Lease Start</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(lease.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Lease End</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(lease.endDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/tenant/maintenance')}
                >
                  <Wrench className="mr-2 h-4 w-4" aria-hidden="true" />
                  Request Maintenance
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/tenant/leases/${lease.id}`)}
                >
                  <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                  View Lease Documents
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/tenant/profile')}
                >
                  <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity (Demo — no backend) */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Recent Activity</CardTitle>
              <DemoBadge />
            </div>
            <CardDescription>
              Lease milestones and on-chain events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {MOCK_ACTIVITY.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Check
                    className="h-4 w-4 shrink-0 text-green-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(item.date)}
                      {item.note ? ` • ${item.note}` : ''}
                    </p>
                  </div>
                  {item.amount !== undefined && (
                    <p className="text-sm text-gray-700">
                      {formatCurrency(item.amount)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments (Demo — no backend) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Recent Payments</CardTitle>
                  <DemoBadge />
                </div>
                <CardDescription>Your payment history</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tenant/payments')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MOCK_PAYMENTS.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.paymentDate)} •{' '}
                        {payment.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-14 sm:pl-0">
                    {getPaymentStatusBadge(payment.paymentStatus)}
                    {payment.paymentStatus === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/tenant/payments/${payment.id}`)
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
