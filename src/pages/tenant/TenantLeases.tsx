/**
 * Tenant Leases — the tenant's own leases from `GET /api/v1/leases?tenantId=me`,
 * with a `status` filter and pagination. No mock, no Supabase. The lease row
 * carries no joined property, so cards are property-id-centric and link out.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, Calendar, DollarSign, Home } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { listLeases } from '@/services/leaseService';
import {
  LEASE_STATUS_BADGE,
  LEASE_TYPE_LABEL,
  formatLeaseMoney,
} from '@/lib/leaseDisplay';
import type { LeaseStatus } from '@/types/leaseContract';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: LeaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Leases' },
  { value: 'pending-signatures', label: 'Pending Signatures' },
  { value: 'active', label: 'Active' },
  { value: 'expiring-soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'renewed', label: 'Renewed' },
];

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

export function TenantLeases() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const query = useMemo(
    () => ({
      tenantId: 'me' as const,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    [statusFilter, page]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-leases', query],
    queryFn: () => listLeases(query),
  });

  const leases = data?.data ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Leases</h1>
          <p className="text-muted-foreground">
            View and manage your rental agreements
          </p>
        </div>

        <FilterBar
          filters={[
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(value as LeaseStatus | 'all'),
              placeholder: 'Filter by status',
              options: STATUS_OPTIONS,
            },
          ]}
          count={leases.length}
          countLabel="lease"
        />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={FileText}
            title="Couldn’t load leases"
            description="Something went wrong fetching your leases. Please try again."
          />
        ) : leases.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              statusFilter === 'all'
                ? 'No Leases Found'
                : `No ${statusFilter} leases`
            }
            description={
              statusFilter === 'all'
                ? "You don't have any leases yet. Contact your landlord to get started."
                : `No ${statusFilter} leases found.`
            }
            action={
              statusFilter !== 'all'
                ? { label: 'View All', onClick: () => setStatusFilter('all') }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {leases.map((lease) => {
              const badge = LEASE_STATUS_BADGE[lease.status];
              return (
                <Card
                  key={lease.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <CardTitle className="text-xl">
                            {LEASE_TYPE_LABEL[lease.type]} lease
                          </CardTitle>
                          <Badge className={badge.className}>
                            {badge.label}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Home className="h-3 w-3" />
                          Property {lease.propertyId.slice(0, 8)}…
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/tenant/leases/${lease.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Lease Period
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(lease.startDate)} –{' '}
                            {formatDate(lease.endDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Monthly Rent
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {formatLeaseMoney(
                              lease.monthlyRent,
                              lease.currency
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Home className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Security Deposit
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {formatLeaseMoney(
                              lease.securityDeposit,
                              lease.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
