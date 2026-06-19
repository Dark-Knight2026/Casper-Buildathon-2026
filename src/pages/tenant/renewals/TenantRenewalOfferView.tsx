/**
 * Tenant renewal offer detail + respond — wired to `GET /api/v1/renewals/{id}`
 * and `POST /api/v1/renewals/{id}/respond`. The tenant can accept, reject, or
 * counter while the offer is `sent` / `under-review` (the backend `409`s
 * otherwise; `counter` requires a counter-offer). No mock, no Supabase.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  CheckCircle2,
  XCircle,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getRenewal, respondRenewal } from '@/services/renewalService';
import { ApiError } from '@/lib/api-client';
import { RENEWAL_STATUS_BADGE } from '@/lib/renewalDisplay';
import { formatLeaseDate, formatLeaseMoney } from '@/lib/leaseDisplay';
import type { RespondRenewalBody } from '@/types/renewalContract';

function mapRespondError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 403) return 'You’re not the tenant on this renewal.';
    if (err.statusCode === 409)
      return 'This offer isn’t awaiting a response anymore.';
    if (err.statusCode === 400)
      return err.message || 'Please complete the counter-offer.';
  }
  return 'Couldn’t submit your response. Please try again.';
}

export default function TenantRenewalOfferView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [counterOpen, setCounterOpen] = useState(false);
  const [counter, setCounter] = useState({
    proposedRent: '',
    proposedTermMonths: '',
    notes: '',
  });

  const {
    data: renewal,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['renewal', id],
    queryFn: () => getRenewal(id as string),
    enabled: Boolean(id),
  });

  const respond = useMutation({
    mutationFn: (body: RespondRenewalBody) =>
      respondRenewal(id as string, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['renewal', id], updated);
      setCounterOpen(false);
      toast({ title: 'Response submitted' });
    },
    onError: (err) =>
      toast({
        title: 'Couldn’t respond',
        description: mapRespondError(err),
        variant: 'destructive',
      }),
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
        <Button variant="ghost" onClick={() => navigate('/tenant/renewals')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Renewals
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Couldn’t load this renewal offer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = RENEWAL_STATUS_BADGE[renewal.status];
  const canRespond =
    renewal.status === 'sent' || renewal.status === 'under-review';

  const openCounter = () => {
    setCounter({
      proposedRent: String(renewal.proposedRent),
      proposedTermMonths: String(renewal.proposedTermMonths),
      notes: '',
    });
    setCounterOpen(true);
  };

  const submitCounter = () => {
    respond.mutate({
      decision: 'counter',
      counterOffer: {
        proposedRent: Number(counter.proposedRent),
        proposedTermMonths: Number(counter.proposedTermMonths),
        notes: counter.notes || null,
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tenant/renewals')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground">
              Lease Renewal Offer
            </h1>
            <Badge className={badge.className}>{badge.label}</Badge>
          </div>
          <p className="text-muted-foreground">
            Lease {renewal.leaseId.slice(0, 8)}…
          </p>
        </div>
      </div>

      {renewal.status === 'accepted' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            You accepted this offer. The landlord will prepare the renewed
            lease.
          </CardContent>
        </Card>
      )}
      {renewal.status === 'rejected' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-red-700">
            <XCircle className="h-4 w-4" />
            You declined this offer.
          </CardContent>
        </Card>
      )}
      {renewal.status === 'countered' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4 flex items-center gap-2 text-sm text-blue-700">
            <MessageSquare className="h-4 w-4" />
            You sent a counter-offer.{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate(`/tenant/renewals/${id}/negotiate`)}
            >
              View negotiation
            </Button>
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

      {/* Your counter (if any) */}
      {renewal.counterOffer && (
        <Card>
          <CardHeader>
            <CardTitle>Your Counter-Offer</CardTitle>
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

      {/* Respond */}
      {canRespond && (
        <Card>
          <CardHeader>
            <CardTitle>Respond to Offer</CardTitle>
            <CardDescription>
              Accept, decline, or send a counter-offer.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button
              className="flex-1"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ decision: 'accept' })}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={respond.isPending}
              onClick={openCounter}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Counter
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={respond.isPending}
              onClick={() => respond.mutate({ decision: 'reject' })}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Counter dialog */}
      <Dialog open={counterOpen} onOpenChange={setCounterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make a Counter-Offer</DialogTitle>
            <DialogDescription>
              Propose different terms to your landlord.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="counterRent">Proposed Rent</Label>
              <Input
                id="counterRent"
                type="number"
                min="0"
                step="0.01"
                value={counter.proposedRent}
                onChange={(e) =>
                  setCounter((c) => ({ ...c, proposedRent: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="counterTerm">Term (months)</Label>
              <Input
                id="counterTerm"
                type="number"
                min="1"
                step="1"
                value={counter.proposedTermMonths}
                onChange={(e) =>
                  setCounter((c) => ({
                    ...c,
                    proposedTermMonths: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="counterNotes">Notes (optional)</Label>
              <Textarea
                id="counterNotes"
                value={counter.notes}
                onChange={(e) =>
                  setCounter((c) => ({ ...c, notes: e.target.value }))
                }
                placeholder="Any requests or conditions…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCounterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitCounter}
              disabled={
                respond.isPending ||
                Number(counter.proposedRent) <= 0 ||
                Number(counter.proposedTermMonths) <= 0
              }
            >
              {respond.isPending ? 'Sending…' : 'Send Counter-Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
