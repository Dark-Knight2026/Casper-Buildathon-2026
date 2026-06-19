/**
 * Presentational cards for the lease detail view. Each takes the `Lease` and
 * renders one section; `LeaseDetailsPage` composes them (keeping the
 * header/actions/loading/error shell). Split out so the page stays readable.
 */

import {
  Calendar,
  DollarSign,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { getLeaseDocument } from '@/services/leaseService';
import { ICO_CONFIG } from '@/constants/ico';
import {
  formatLeaseDateLong,
  formatLeaseDateTime,
  formatLeaseMoney,
} from '@/lib/leaseDisplay';
import type { Lease } from '@/types/leaseContract';

const explorerDeployUrl = (txHash: string) =>
  `${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`;

export function LeaseTermsCard({ lease }: { lease: Lease }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lease Terms</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Start Date
          </p>
          <p className="font-medium">{formatLeaseDateLong(lease.startDate)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> End Date
          </p>
          <p className="font-medium">{formatLeaseDateLong(lease.endDate)}</p>
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
  );
}

export function PartiesCard({ lease }: { lease: Lease }) {
  return (
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
  );
}

export function SignatureProgressCard({ lease }: { lease: Lease }) {
  const sp = lease.signatureProgress;
  return (
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
          // A draft's progress is an empty `{}` until submitted, so an entry
          // can be missing — treat that as not-yet-signed.
          const entry = sp?.[role];
          return (
            <div
              key={role}
              className="flex items-center justify-between py-1 border-b last:border-b-0"
            >
              <span className="text-sm capitalize">{role}</span>
              <span className="text-xs text-muted-foreground">
                {entry?.signed
                  ? `Signed${entry.timestamp ? ` · ${formatLeaseDateTime(entry.timestamp)}` : ''}`
                  : 'Awaiting signature'}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function OnchainCard({ lease }: { lease: Lease }) {
  return (
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
            Not yet committed on-chain. The landlord commits the lease once both
            parties have signed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ClausesCard({ lease }: { lease: Lease }) {
  if (lease.clauses.length === 0) return null;
  return (
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
            <p className="text-sm text-muted-foreground">{clause.content}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DocumentCard({ lease }: { lease: Lease }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // GET /document is a GET with side effects (re-renders + re-stores), so it
  // runs only on this explicit action — never on render. It returns the full
  // lease with refreshed links/hash/cid, which we push into the cache.
  const generate = useMutation({
    mutationFn: () => getLeaseDocument(lease.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lease', lease.id], updated);
      toast({
        title: 'Document generated',
        description:
          'This environment renders plain text, not a PDF (hackathon).',
      });
    },
    onError: () =>
      toast({
        title: 'Couldn’t generate the document',
        description: 'Please try again.',
        variant: 'destructive',
      }),
  });

  const hasDoc = Boolean(lease.documentLinks.generatedPDF);

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Document</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {hasDoc ? 'Refresh' : 'Generate'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="font-medium">Generated lease document</span>
          </div>
          {hasDoc ? (
            <Button variant="outline" size="sm" asChild>
              <a
                href={lease.documentLinks.generatedPDF as string}
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
                  Hash: <span className="font-mono">{lease.documentHash}</span>
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
        <p className="text-xs text-muted-foreground">
          Hackathon build: the document is plain text, and the hash/CID are
          stubs until a real renderer + storage are wired.
        </p>
      </CardContent>
    </Card>
  );
}
