/**
 * Landlord Leases — the landlord's own leases from `GET /api/v1/leases?landlordId=me`,
 * with a `status` filter and pagination. No mock, no Supabase: the list reflects
 * exactly what the backend returns (the lease row carries no joined tenant /
 * property, so cards are property-id-centric and link out for detail).
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  DollarSign,
  Home,
  Plus,
  AlertCircle,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listLeases } from '@/services/leaseService';
import {
  LEASE_STATUS_BADGE,
  LEASE_TYPE_LABEL,
  formatLeaseMoney,
} from '@/lib/leaseDisplay';
import type { LeaseStatus } from '@/types/leaseContract';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: LeaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
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

export default function LandlordLeases() {
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  // Reset to the first page whenever the filter changes shape.
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const query = useMemo(
    () => ({
      landlordId: 'me' as const,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    [statusFilter, page]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['landlord-leases', query],
    queryFn: () => listLeases(query),
  });

  const leases = data?.data ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Leases</h1>
          <p className="text-muted-foreground">
            Manage lease agreements and renewals
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/landlord/leases/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Lease
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as LeaseStatus | 'all')
            }
          >
            <SelectTrigger className="md:w-64">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Couldn’t load leases</h3>
            <p className="text-muted-foreground">
              Something went wrong fetching your leases. Please try again.
            </p>
          </CardContent>
        </Card>
      ) : leases.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leases found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'all'
                ? 'Get started by creating your first lease'
                : 'Try a different status filter'}
            </p>
            {statusFilter === 'all' && (
              <Button asChild>
                <Link to="/landlord/leases/create">Create Lease</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {leases.map((lease) => {
            const badge = LEASE_STATUS_BADGE[lease.status];
            return (
              <Card key={lease.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {LEASE_TYPE_LABEL[lease.type]} lease
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Home className="h-3 w-3" />
                        <Link
                          to={`/landlord/properties/${lease.propertyId}`}
                          className="hover:underline"
                        >
                          Property {lease.propertyId.slice(0, 8)}…
                        </Link>
                      </CardDescription>
                    </div>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Start Date
                      </p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lease.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lease.endDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monthly Rent
                      </p>
                      <p className="font-semibold text-green-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatLeaseMoney(lease.monthlyRent, lease.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Security Deposit
                      </p>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatLeaseMoney(
                          lease.securityDeposit,
                          lease.currency
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/landlord/leases/${lease.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/landlord/properties/${lease.propertyId}`}>
                        View Property
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-4">
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
  );
}
