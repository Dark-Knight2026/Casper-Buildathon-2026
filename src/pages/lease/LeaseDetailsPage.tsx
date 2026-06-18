/**
 * Lease Details — a single, role-agnostic detail view driven by the route
 * `:leaseId` and `GET /api/v1/leases/{id}`. Mounted for both
 * `/landlord/leases/:leaseId` and `/tenant/leases/:leaseId`.
 *
 * Renders only what the backend returns: terms, parties, clauses,
 * signatureProgress, the on-chain row (links out to cspr.live) and document
 * links. Party-gated — a `403` becomes a "not a party" state rather than an
 * error toast.
 */

import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, FileText, Lock, Pencil, Send, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { deleteLease, getLease, submitLease } from '@/services/leaseService';
import { ApiError } from '@/lib/api-client';
import { LEASE_STATUS_BADGE, LEASE_TYPE_LABEL } from '@/lib/leaseDisplay';
import {
  ClausesCard,
  DocumentCard,
  LeaseTermsCard,
  OnchainCard,
  PartiesCard,
  SignatureProgressCard,
} from '@/components/lease/detail/LeaseDetailCards';

/** Both submit and delete fail with `409` on a status conflict, `403` if not the landlord. */
function mapActionError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 409)
      return 'This action isn’t allowed in the lease’s current state. A draft needs a tenant before it can be submitted.';
    if (err.statusCode === 403)
      return 'Only the lease’s landlord can manage it.';
    return err.message || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export const LeaseDetailsPage = () => {
  const { leaseId } = useParams<{ leaseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const basePath = location.pathname.startsWith('/landlord')
    ? '/landlord/leases'
    : '/tenant/leases';

  const {
    data: lease,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lease', leaseId],
    queryFn: () => getLease(leaseId as string),
    enabled: Boolean(leaseId),
    retry: (count, err) =>
      !(err instanceof ApiError && [403, 404].includes(err.statusCode ?? 0)) &&
      count < 2,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitLease(leaseId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', leaseId] });
      toast({
        title: 'Lease submitted',
        description: 'The lease is now awaiting signatures.',
      });
    },
    onError: (err) =>
      toast({
        title: 'Couldn’t submit lease',
        description: mapActionError(err),
        variant: 'destructive',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLease(leaseId as string),
    onSuccess: () => {
      toast({ title: 'Draft deleted' });
      navigate('/landlord/leases');
    },
    onError: (err) =>
      toast({
        title: 'Couldn’t delete lease',
        description: mapActionError(err),
        variant: 'destructive',
      }),
  });

  const backButton = (
    <Button variant="ghost" className="mb-6" onClick={() => navigate(basePath)}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Leases
    </Button>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {backButton}
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    const status = error instanceof ApiError ? error.statusCode : undefined;
    const notAParty = status === 403;
    return (
      <div className="container mx-auto px-4 py-8">
        {backButton}
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {notAParty
                ? 'You don’t have access to this lease'
                : status === 404
                  ? 'Lease not found'
                  : 'Couldn’t load this lease'}
            </h3>
            <p className="text-muted-foreground">
              {notAParty
                ? 'Only the landlord and tenant on a lease can view its details.'
                : status === 404
                  ? 'This lease may have been deleted, or the link is wrong.'
                  : 'Something went wrong. Please try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lease) return null;

  const badge = LEASE_STATUS_BADGE[lease.status];
  // Draft-only landlord actions: edit / submit / delete. Only the lease's own
  // landlord sees them (the tenant view and other landlords don't).
  const isLandlordOwner =
    profile?.role === 'landlord' && profile.id === lease.landlordId;
  const showDraftActions = isLandlordOwner && lease.status === 'draft';

  return (
    <div className="container mx-auto px-4 py-8">
      {backButton}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">Lease Details</h1>
            <Badge className={badge.className}>{badge.label}</Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {LEASE_TYPE_LABEL[lease.type]} · Lease {lease.id.slice(0, 8)}…
          </p>
        </div>

        {showDraftActions && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/landlord/leases/${lease.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Draft
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {submitMutation.isPending ? 'Submitting…' : 'Submit for Signing'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LeaseTermsCard lease={lease} />
        <PartiesCard lease={lease} />
      </div>

      <SignatureProgressCard lease={lease} />
      <OnchainCard lease={lease} />
      <ClausesCard lease={lease} />
      <DocumentCard lease={lease} />

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this draft lease?"
        description="This permanently removes the draft. This can’t be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </div>
  );
};
