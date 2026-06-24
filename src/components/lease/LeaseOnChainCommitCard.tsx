/**
 * Landlord "Record on-chain" action for a fully-signed lease (`Lease` contract).
 * The landlord signs `create_lease_agreement` from their own wallet via
 * CSPR.click; once the deploy confirms we read the assigned ids from its CES
 * events (`extractLeaseCommitIds`) and report them with the hash to the backend
 * (`POST /commit`), which validates the lease id, reconciles it against the
 * chain, records the bindings, and activates the lease. The backend requires
 * both ids, so if the read comes back empty we surface a retry (the deploy is
 * already on-chain, so re-reading succeeds) rather than sending an invalid commit.
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

import { useCallback, useRef, useState } from 'react';
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
import {
  extractLeaseCommitIds,
  type LeaseCommitIds,
} from '@/lib/casper/leaseAgreementEvents';
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
  const [form, setForm] = useState<LeaseOnChainFormState>(() =>
    initialLeaseOnChainForm(lease)
  );
  // Recording can fail after the deploy already succeeded on-chain — either the
  // id read or the `/commit` push — and must be retryable WITHOUT re-signing (a
  // second deploy = duplicate lease/NFT).
  const [pushFailed, setPushFailed] = useState(false);
  // True while a re-record (read CES + push) is in flight, to drive the button.
  const [recording, setRecording] = useState(false);
  // On-chain ids read from the confirmed deploy's CES events, cached so a retry
  // after a failed push doesn't re-read the deploy.
  const commitIdsRef = useRef<LeaseCommitIds>({
    onchainLeaseId: null,
    nftTokenId: null,
  });
  // `invoice_validity_duration` (seconds, as a number — the backend wants a
  // u64) actually used for the deploy. The backend requires it on `/commit`;
  // it must equal the value sent to `create_lease_agreement`. Captured at sign
  // time (and refreshed from the form before a recovery retry); the CES events
  // don't carry it, so the form is the only source. Initialised from the form's
  // starting value so a retry-after-reload still sends something sensible.
  const invoiceValidityDurationRef = useRef(
    Number(daysToSeconds(form.invoiceValidityDays))
  );

  // Send the parsed ids + hash to the backend, which validates the lease id,
  // reconciles it against the chain, and activates the lease. The duplicate
  // guard lives on the backend, keyed on the deploy/commit hash. Returns the
  // promise so callers can await the push (e.g. to drive a busy indicator).
  const pushCommit = useCallback(
    (hash: string, onchainLeaseId: string, nftTokenId: string) => {
      setPushFailed(false);
      return commitLease(lease.id, {
        commitTxHash: hash,
        onchainLeaseId,
        nftTokenId,
        invoiceValidityDuration: invoiceValidityDurationRef.current,
      })
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ['lease', lease.id] })
        )
        .catch(() => setPushFailed(true));
    },
    [lease.id, queryClient]
  );

  // Read the lease + NFT ids from the confirmed deploy (cached across retries),
  // then push. The backend requires both ids, so if the read comes back empty we
  // surface the failure for retry rather than sending an invalid commit — the
  // deploy is already on-chain, so re-reading should succeed.
  const recordCommit = useCallback(
    async (hash: string) => {
      setPushFailed(false);
      setRecording(true);
      try {
        let ids = commitIdsRef.current;
        if (!ids.onchainLeaseId || !ids.nftTokenId) {
          ids = await extractLeaseCommitIds(hash);
          commitIdsRef.current = ids;
        }
        if (!ids.onchainLeaseId || !ids.nftTokenId) {
          setPushFailed(true);
          return;
        }
        await pushCommit(hash, ids.onchainLeaseId, ids.nftTokenId);
      } finally {
        setRecording(false);
      }
    },
    [pushCommit]
  );

  // onSuccess/onError fire exactly once per attempt, so no manual once-guards:
  // success links + auto-pushes the hash; a re-signed retry gets its own onError.
  const { state, create } = useLeaseAgreementOnChain(
    account?.publicKey,
    clickRef,
    {
      onSuccess: (txHash) => {
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
        void recordCommit(txHash);
      },
      onError: (message) =>
        toast({
          title: 'Couldn’t record on-chain',
          description: message,
          variant: 'destructive',
        }),
    }
  );

  const onFieldChange = <K extends keyof LeaseOnChainFormState>(
    key: K,
    value: string
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const { step, txHash } = state;
  const busy = step === 'signing' || step === 'pending';
  const hasWalletSession = Boolean(account?.publicKey && clickRef);
  const hasEquity = Boolean(lease.equityPropertyId);
  // The deploy hash already recorded on the lease (set before the indexer
  // finalizes). Present => we're recovering a stalled "finalizing" lease.
  const committedHash = lease.commitTxHash;

  // Equity only applies to a lease-to-own lease; when the lease carries an
  // equity property the on-chain id is required (the off-chain row holds only a
  // UUID, so the landlord supplies it). Rent + deposit are both in tUSDC; we
  // scale the human amounts to its smallest unit and the local date-times to
  // unix seconds here, just before signing.
  const submit = () => {
    // The same value goes to the deploy (as the contract-encoded string) and,
    // as a number, to `/commit` — so the two agree on what was recorded.
    const invoiceValidityDuration = daysToSeconds(form.invoiceValidityDays);
    invoiceValidityDurationRef.current = Number(invoiceValidityDuration);
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
      invoiceValidityDuration,
    });
  };

  if (!hasWalletSession) {
    return (
      <Button variant="outline" onClick={connect}>
        Connect wallet to sign
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recovery: the lease already carries a recorded deploy that never
          finalized. The SAFE action re-reads that same deploy and re-pushes
          `/commit` (no signature, no duplicate). The signing form stays
          available below so the landlord can also record a fresh deploy — with
          a clear warning that doing so mints a second lease + NFT. We hide this
          banner right after an in-session sign (`step === 'confirmed'`), where
          the dedicated status/retry UI below takes over. */}
      {committedHash && step !== 'confirmed' && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">
            This lease already has a recorded deploy, but the platform hasn’t
            finalized it yet.{' '}
            <a
              href={explorerDeployUrl(committedHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View the deploy on cspr.live
            </a>
          </p>
          {pushFailed && (
            <p className="text-sm text-destructive">
              Couldn’t finalize from the existing deploy. Retry, or record a new
              deploy below if the recorded one genuinely failed.
            </p>
          )}
          <Button
            variant="outline"
            disabled={recording}
            onClick={() => {
              // No fresh sign here, so take the duration from the visible form
              // (sent as a number — the backend wants a u64).
              invoiceValidityDurationRef.current = Number(
                daysToSeconds(form.invoiceValidityDays)
              );
              void recordCommit(committedHash);
            }}
          >
            {recording ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording…
              </>
            ) : (
              'Retry recording (no new deploy)'
            )}
          </Button>
          <p className="text-xs text-destructive">
            Or record a fresh deploy below — note this mints a second lease +
            NFT on-chain, so only do it if the recorded deploy failed.
          </p>
        </div>
      )}

      <LeaseOnChainForm
        form={form}
        hasEquity={hasEquity}
        equityPropertyId={lease.equityPropertyId}
        onFieldChange={onFieldChange}
      />

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

      {/* The deploy is on-chain but the backend wasn't notified. Retry the push
          with the SAME hash — never re-sign (that would deploy a duplicate). */}
      {step === 'confirmed' && pushFailed && txHash && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">
            The deploy succeeded on-chain, but the platform wasn’t notified.
            Retry — this re-reads the same deploy, it does not sign again.
          </p>
          <Button variant="outline" onClick={() => void recordCommit(txHash)}>
            Retry recording
          </Button>
        </div>
      )}

      {/* Once the deploy is confirmed the only valid action is the push (handled
          automatically / via retry above) — disable signing to prevent a
          duplicate on-chain lease. */}
      {step !== 'confirmed' && (
        <Button
          disabled={busy || !isLeaseOnChainFormValid(form, hasEquity)}
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
      )}
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
  // lease and the contract is configured. Hide only once the indexer has set
  // `onchainLeaseId` (truly recorded). We deliberately KEEP showing the card
  // when a `commitTxHash` exists but no `onchainLeaseId` — that "finalizing"
  // state can stall (indexer down / commit never reconciled), and the landlord
  // needs a way to finish it (re-record) or, as a last resort, re-sign.
  if (
    !isLeaseAgreementEnabled ||
    !isLandlord ||
    lease.status !== 'pending-signatures' ||
    !bothSigned ||
    lease.onchainLeaseId
  ) {
    return null;
  }

  // A recorded-but-unfinalized lease is being recovered, not freshly recorded.
  const isFinalizing = Boolean(lease.commitTxHash);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {isFinalizing ? 'Finalize on-chain' : 'Record on-chain'}
        </CardTitle>
        <CardDescription>
          {isFinalizing
            ? 'The lease has a recorded deploy that hasn’t finalized on the platform yet. Finish recording it below.'
            : 'Both parties have signed. Record the lease on Casper by signing the deploy from your wallet.'}
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
            {isFinalizing
              ? 'Finalize on-chain recording'
              : 'Record lease on-chain'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
