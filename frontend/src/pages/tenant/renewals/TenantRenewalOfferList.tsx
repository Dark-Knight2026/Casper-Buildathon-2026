/**
 * Tenant Renewals — the tenant's renewal offers from
 * `GET /api/v1/renewals?tenantId=me`, with a `status` filter and pagination.
 * No mock, no Supabase. The renewal row carries no joined lease/property, so
 * cards are id-centric and link out for detail.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Eye, Calendar, DollarSign } from 'lucide-react';
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
  { value: 'all', label: 'All Offers' },
  { value: 'sent', label: 'Sent' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'countered', label: 'Countered' },
  { value: 'expired', label: 'Expired' },
];

export default function TenantRenewalOfferList() {
  const navigate = useNavigate();
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
      tenantId: 'me' as const,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    [statusFilter, page]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-renewals', query],
    queryFn: () => listRenewals(query),
  });

  const renewals = data?.data ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Lease Renewal Offers
        </h1>
        <p className="text-muted-foreground">
          View and respond to renewal offers from your landlord
        </p>
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
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              Couldn’t load renewal offers
            </p>
            <p className="text-xs text-muted-foreground">Please try again.</p>
          </CardContent>
        </Card>
      ) : renewals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No renewal offers
            </p>
            <p className="text-xs text-muted-foreground">
              {statusFilter === 'all'
                ? "Your landlord hasn't sent any renewal offers yet"
                : 'Try a different status filter'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {renewals.map((renewal) => {
            const badge = RENEWAL_STATUS_BADGE[renewal.status];
            return (
              <Card key={renewal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        Renewal · Lease {renewal.leaseId.slice(0, 8)}…
                      </CardTitle>
                      <CardDescription>
                        {renewal.rentIncreaseReason || 'Renewal offer'}
                      </CardDescription>
                    </div>
                    <Badge className={`${badge.className} shrink-0`}>
                      {badge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Proposed Rent</p>
                      <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatLeaseMoney(renewal.proposedRent, null)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Term</p>
                      <p className="text-lg font-semibold text-foreground">
                        {renewal.proposedTermMonths} months
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Starts</p>
                      <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatLeaseDate(renewal.proposedStartDate)}
                      </p>
                    </div>
                  </div>

                  {renewal.responseDeadline && (
                    <p className="text-xs text-muted-foreground">
                      Respond by {formatLeaseDate(renewal.responseDeadline)}
                    </p>
                  )}

                  <div className="flex flex-col md:flex-row gap-2">
                    <Button
                      onClick={() => navigate(`/tenant/renewals/${renewal.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
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
