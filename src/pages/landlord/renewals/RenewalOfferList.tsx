/**
 * Landlord Renewals — the landlord's renewal offers from
 * `GET /api/v1/renewals?landlordId=me`, with a `status` filter and pagination.
 * No mock, no Supabase. The renewal row carries no joined lease/tenant, so cards
 * are id-centric and link out for detail.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Calendar,
  DollarSign,
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
import { listRenewals } from '@/services/renewalService';
import { RENEWAL_STATUS_BADGE } from '@/lib/renewalDisplay';
import { formatLeaseDate, formatLeaseMoney } from '@/lib/leaseDisplay';
import type { RenewalStatus } from '@/types/renewalContract';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: RenewalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'sent', label: 'Sent' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'countered', label: 'Countered' },
  { value: 'expired', label: 'Expired' },
];

export default function RenewalOfferList() {
  const [statusFilter, setStatusFilter] = useState<RenewalStatus | 'all'>(
    'all'
  );
  const [page, setPage] = useState(1);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as RenewalStatus | 'all');
    setPage(1);
  };

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
    queryKey: ['landlord-renewals', query],
    queryFn: () => listRenewals(query),
  });

  const renewals = data?.data ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Renewals</h1>
          <p className="text-muted-foreground">
            Offers you’ve sent to renew active leases
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/landlord/renewals/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Offer
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
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

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Couldn’t load renewals
            </h3>
            <p className="text-muted-foreground">Please try again.</p>
          </CardContent>
        </Card>
      ) : renewals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No renewals found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'all'
                ? 'Create an offer to renew an active lease'
                : 'Try a different status filter'}
            </p>
            {statusFilter === 'all' && (
              <Button asChild>
                <Link to="/landlord/renewals/create">Create Offer</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {renewals.map((renewal) => {
            const badge = RENEWAL_STATUS_BADGE[renewal.status];
            return (
              <Card key={renewal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Renewal · Lease {renewal.leaseId.slice(0, 8)}…
                      </CardTitle>
                      <CardDescription>
                        Tenant {renewal.tenantId.slice(0, 8)}…
                      </CardDescription>
                    </div>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Proposed Rent
                      </p>
                      <p className="font-semibold text-green-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatLeaseMoney(renewal.proposedRent, null)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Term</p>
                      <p className="font-medium">
                        {renewal.proposedTermMonths} months
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Starts</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatLeaseDate(renewal.proposedStartDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/landlord/renewals/${renewal.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
