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
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Link2,
  Lock,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  Users,
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { deleteLease, getLease, submitLease } from '@/services/leaseService';
import { ApiError } from '@/lib/api-client';
import { ICO_CONFIG } from '@/constants/ico';
import {
  LEASE_STATUS_BADGE,
  LEASE_TYPE_LABEL,
  formatLeaseMoney,
} from '@/lib/leaseDisplay';

const explorerDeployUrl = (txHash: string) =>
  `${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

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
  const sp = lease.signatureProgress;
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
        {/* Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Lease Terms</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Start Date
              </p>
              <p className="font-medium">{formatDate(lease.startDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> End Date
              </p>
              <p className="font-medium">{formatDate(lease.endDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Monthly Rent
              </p>
              <p className="font-semibold text-green-600">
                {formatLeaseMoney(lease.monthlyRent, lease.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Security Deposit
              </p>
              <p className="font-medium">
                {formatLeaseMoney(lease.securityDeposit, lease.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Parties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Landlord</p>
              <p className="font-mono break-all">{lease.landlordId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                Tenant{lease.tenantIds.length > 1 ? 's' : ''}
              </p>
              {lease.tenantIds.length === 0 ? (
                <p className="text-muted-foreground italic">
                  No tenant assigned yet
                </p>
              ) : (
                lease.tenantIds.map((id) => (
                  <p key={id} className="font-mono break-all">
                    {id}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signature progress */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Signature Progress</CardTitle>
          <CardDescription>
            Both parties sign the lease-consent message before the lease can be
            committed on-chain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(['landlord', 'tenant'] as const).map((role) => {
            const entry = sp[role];
            return (
              <div
                key={role}
                className="flex items-center justify-between py-1 border-b last:border-b-0"
              >
                <span className="text-sm capitalize">{role}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.signed
                    ? `Signed${entry.timestamp ? ` · ${formatDateTime(entry.timestamp)}` : ''}`
                    : 'Awaiting signature'}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* On-chain */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> On-chain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {lease.onchainLeaseId ? (
            <>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p className="text-muted-foreground">Lease Agreement ID</p>
                  <p className="font-mono">{lease.onchainLeaseId}</p>
                </div>
                {lease.nftTokenId && (
                  <div>
                    <p className="text-muted-foreground">NFT Token ID</p>
                    <p className="font-mono">{lease.nftTokenId}</p>
                  </div>
                )}
              </div>
              {lease.commitTxHash && (
                <a
                  href={explorerDeployUrl(lease.commitTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Link2 className="h-4 w-4" />
                  View commit deploy on cspr.live
                </a>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Not yet committed on-chain. The landlord commits the lease once
              both parties have signed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Clauses */}
      {lease.clauses.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Clauses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lease.clauses.map((clause, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium">{clause.title}</p>
                  {clause.category && (
                    <Badge
                      variant="secondary"
                      className="text-xs shrink-0 capitalize"
                    >
                      {clause.category.replace(/-/g, ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {clause.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="font-medium">Generated lease document</span>
            </div>
            {lease.documentLinks.generatedPDF ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={lease.documentLinks.generatedPDF}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Not generated yet
              </span>
            )}
          </div>
          {(lease.documentHash || lease.ipfsCid) && (
            <>
              <Separator />
              <div className="space-y-1">
                {lease.documentHash && (
                  <p className="text-xs text-muted-foreground break-all">
                    Hash:{' '}
                    <span className="font-mono">{lease.documentHash}</span>
                  </p>
                )}
                {lease.ipfsCid && (
                  <p className="text-xs text-muted-foreground break-all">
                    IPFS CID: <span className="font-mono">{lease.ipfsCid}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
