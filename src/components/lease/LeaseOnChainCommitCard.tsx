/**
 * Landlord "Record on-chain" action for a fully-signed lease (`Lease` contract).
 * The landlord signs `create_lease_agreement` from their own wallet via
 * CSPR.click, then we hand the deploy hash to the backend (`POST /commit`),
 * whose indexer derives the on-chain ids from the event and activates the lease.
 *
 * Targets the contract deployed from `2025_anthony_leasefi` user-registry:
 * `tenant` is the tenant's on-chain UserRegistry user id (`U256`), prefilled
 * from `lease.tenantOnchainUserId` (the landlord can still adjust it, and falls
 * back to entering it manually while it's `null` — pending the indexer). No
 * property-manager split is set (the encoder defaults the rent distribution to
 * no manager). The currency + amounts come from the lease; the other manual
 * value is the equity property's on-chain id, only for a lease-to-own lease.
 *
 * Self-gating: renders nothing unless the caller is the lease's landlord, the
 * lease is `pending-signatures`, both parties have signed, it isn't already
 * recorded, and the contract is configured. Mounts the hidden SDK host only
 * after the landlord starts.
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useLeaseAgreementOnChain } from '@/hooks/lease/useLeaseAgreementOnChain';
import { isLeaseAgreementEnabled } from '@/lib/casper/leaseAgreement';
import { commitLease } from '@/services/leaseService';
import { LEASE_CURRENCY, scaleToSmallestUnit } from '@/lib/leaseCurrency';
import {
  LeaseOnChainForm,
  dateTimeLocalToUnixSeconds,
  daysToSeconds,
  initialLeaseOnChainForm,
  isLeaseOnChainFormValid,
  type LeaseOnChainFormState,
} from '@/components/lease/LeaseOnChainForm';
import { OnChainSdkHost } from '@/components/blockchain/OnChainSdkHost';
import { ICO_CONFIG } from '@/constants/ico';
import type { Lease } from '@/types/leaseContract';

const explorerDeployUrl = (txHash: string) =>
  `${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`;

// ── Interactive flow — MUST render inside OnChainSdkHost (needs clickRef) ─────

function CommitFlow({ lease }: { lease: Lease }) {
  const { account, clickRef, connect } = useICOWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state, create } = useLeaseAgreementOnChain(
    account?.publicKey,
    clickRef
  );
  const [form, setForm] = useState<LeaseOnChainFormState>(() =>
    initialLeaseOnChainForm(lease)
  );
  // Guards the one-shot `/commit` push against effect re-runs (and strict mode).
  const committedRef = useRef(false);

  const onFieldChange = <K extends keyof LeaseOnChainFormState>(
    key: K,
    value: string
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const { step, txHash, error } = state;
  const busy = step === 'signing' || step === 'pending';
  const hasWalletSession = Boolean(account?.publicKey && clickRef);
  const hasEquity = Boolean(lease.equityPropertyId);

  // On confirm: surface a cspr.live link and hand the deploy hash to the backend
  // once — its indexer derives the on-chain ids and activates the lease. On
  // failure, surface the reason.
  useEffect(() => {
    if (step === 'confirmed' && txHash && !committedRef.current) {
      committedRef.current = true;
      toast({
        title: 'Recorded on-chain',
        description: (
          <a
            href={explorerDeployUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View the deploy on cspr.live
          </a>
        ),
      });
      commitLease(lease.id, { commitTxHash: txHash })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ['lease', lease.id] })
        )
        .catch(() =>
          toast({
            title: 'Couldn’t notify the platform',
            description:
              'The deploy succeeded but the platform wasn’t updated. Reload the lease to retry.',
            variant: 'destructive',
          })
        );
    }
    if (step === 'failed' && error) {
      toast({
        title: 'Couldn’t record on-chain',
        description: error,
        variant: 'destructive',
      });
    }
  }, [step, txHash, error, toast, lease.id, queryClient]);

  // Equity only applies to a lease-to-own lease; when the lease carries an
  // equity property the on-chain id is required (the off-chain row holds only a
  // UUID, so the landlord supplies it). Rent + deposit are both in tUSDC; we
  // scale the human amounts to its smallest unit and the local date-times to
  // unix seconds here, just before signing.
  const submit = () =>
    create({
      tenantUserId: form.tenantUserId.trim(),
      equityPropertyId: form.equityPropertyId.trim() || null,
      monthlyRent: {
        currency: LEASE_CURRENCY.address,
        amount: scaleToSmallestUnit(
          form.monthlyRentAmount.trim(),
          LEASE_CURRENCY.decimals
        ),
      },
      securityDeposit: {
        currency: LEASE_CURRENCY.address,
        amount: scaleToSmallestUnit(
          form.securityDepositAmount.trim(),
          LEASE_CURRENCY.decimals
        ),
      },
      startUnixSeconds: String(dateTimeLocalToUnixSeconds(form.startDateTime)),
      endUnixSeconds: String(dateTimeLocalToUnixSeconds(form.endDateTime)),
      invoiceValidityDuration: daysToSeconds(form.invoiceValidityDays),
    });

  if (!hasWalletSession) {
    return (
      <Button variant="outline" onClick={connect}>
        Connect wallet to sign
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <LeaseOnChainForm
        form={form}
        hasEquity={hasEquity}
        equityPropertyId={lease.equityPropertyId}
        onFieldChange={onFieldChange}
      />

      {error && step !== 'failed' && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Persistent link — survives the transient toast, shown as soon as the
          deploy is submitted and through confirmation. */}
      {txHash && (
        <p className="text-sm text-muted-foreground">
          {step === 'confirmed'
            ? 'Recorded on-chain — finalizing on the platform. '
            : 'Deploy submitted, awaiting confirmation. '}
          <a
            href={explorerDeployUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            View the deploy on cspr.live
          </a>
        </p>
      )}

      <Button
        disabled={
          busy ||
          step === 'confirmed' ||
          !isLeaseOnChainFormValid(form, hasEquity)
        }
        onClick={submit}
      >
        {step === 'signing' && (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirm in your wallet…
          </>
        )}
        {step === 'pending' && (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        )}
        {!busy && 'Record lease on-chain'}
      </Button>
    </div>
  );
}

// ── Card shell — gating + lazy SDK mount ─────────────────────────────────────

export function LeaseOnChainCommitCard({ lease }: { lease: Lease }) {
  const { profile } = useAuth();
  const [started, setStarted] = useState(false);

  const isLandlord =
    profile?.role === 'landlord' && profile.id === lease.landlordId;
  const bothSigned =
    Boolean(lease.signatureProgress?.landlord?.signed) &&
    Boolean(lease.signatureProgress?.tenant?.signed);

  // Stay dark unless this is the landlord on a both-signed, awaiting-commit
  // lease and the contract is configured. Also hide once recorded — either the
  // indexer has set `onchainLeaseId`, or the deploy hash is already committed
  // and we're just waiting on the indexer to activate.
  if (
    !isLeaseAgreementEnabled ||
    !isLandlord ||
    lease.status !== 'pending-signatures' ||
    !bothSigned ||
    lease.onchainLeaseId ||
    lease.commitTxHash
  ) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Record on-chain
        </CardTitle>
        <CardDescription>
          Both parties have signed. Record the lease on Casper by signing the
          deploy from your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {started ? (
          <OnChainSdkHost>
            <CommitFlow lease={lease} />
          </OnChainSdkHost>
        ) : (
          <Button onClick={() => setStarted(true)}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Record lease on-chain
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
