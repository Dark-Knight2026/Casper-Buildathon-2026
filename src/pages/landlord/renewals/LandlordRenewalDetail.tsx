/**
 * Landlord renewal detail — `GET /api/v1/renewals/{id}`. Shows the offer terms,
 * the tenant's counter (if any) and the renewal status. The landlord can't
 * `respond` (tenant-only); they negotiate via the thread and, once accepted,
 * prolong the lease on-chain (LA-12/LA-19). No mock, no Supabase.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  MessageSquare,
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
import { getRenewal } from '@/services/renewalService';
import { RENEWAL_STATUS_BADGE } from '@/lib/renewalDisplay';
import { formatLeaseDate, formatLeaseMoney } from '@/lib/leaseDisplay';

export default function LandlordRenewalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: renewal,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['renewal', id],
    queryFn: () => getRenewal(id as string),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !renewal) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate('/landlord/renewals')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Renewals
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Couldn’t load this renewal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = RENEWAL_STATUS_BADGE[renewal.status];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/landlord/renewals')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">Renewal Offer</h1>
            <Badge className={badge.className}>{badge.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            Lease {renewal.leaseId.slice(0, 8)}… · Tenant{' '}
            {renewal.tenantId.slice(0, 8)}…
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/landlord/renewals/${id}/negotiate`)}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Negotiation
        </Button>
      </div>

      {renewal.status === 'accepted' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            The tenant accepted. Prolong the lease on-chain to apply the
            renewal.
          </CardContent>
        </Card>
      )}
      {renewal.status === 'rejected' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            The tenant declined this offer.
          </CardContent>
        </Card>
      )}
      {renewal.status === 'countered' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-blue-700">
            <MessageSquare className="h-4 w-4" />
            The tenant sent a counter-offer — review it below or continue in the
            negotiation.
          </CardContent>
        </Card>
      )}

      {/* Offer terms */}
      <Card>
        <CardHeader>
          <CardTitle>Offer Terms</CardTitle>
          {renewal.rentIncreaseReason && (
            <CardDescription>{renewal.rentIncreaseReason}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Proposed Rent</p>
            <p className="text-2xl font-bold text-foreground flex items-center gap-1">
              <DollarSign className="h-5 w-5" />
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
          {renewal.responseDeadline && (
            <div>
              <p className="text-muted-foreground">Respond By</p>
              <p className="text-lg font-semibold text-foreground">
                {formatLeaseDate(renewal.responseDeadline)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant's counter (if any) */}
      {renewal.counterOffer && (
        <Card>
          <CardHeader>
            <CardTitle>Tenant’s Counter-Offer</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Proposed Rent</p>
              <p className="font-semibold">
                {formatLeaseMoney(renewal.counterOffer.proposedRent, null)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Term</p>
              <p className="font-semibold">
                {renewal.counterOffer.proposedTermMonths} months
              </p>
            </div>
            {renewal.counterOffer.notes && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-muted-foreground">Notes</p>
                <p>{renewal.counterOffer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
