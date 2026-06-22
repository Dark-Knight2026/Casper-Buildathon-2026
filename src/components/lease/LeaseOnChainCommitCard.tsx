/**
 * Landlord "Record on-chain" action for a fully-signed lease (`Lease` contract,
 * LA-12 phase 1). The landlord signs `create_lease_agreement` from their own
 * wallet via CSPR.click; we surface success/failure with a toast.
 *
 * Targets the contract deployed from `2025_anthony_leasefi` user-registry:
 * `tenant` is the tenant's on-chain UserRegistry user id (`U256`), not a wallet
 * address, so the landlord enters it manually (the frontend cannot derive it).
 * No property-manager split is set (the encoder defaults the rent distribution
 * to no manager). The currency + amounts come from the lease; the other manual
 * value is the equity property's on-chain id, only for a lease-to-own lease.
 *
 * The `/commit` push (which would activate the lease) is intentionally NOT wired
 * — it requires `onchainLeaseId`/`nftTokenId` the frontend cannot read.
 *
 * Self-gating: renders nothing unless the caller is the lease's landlord, the
 * lease is `pending-signatures`, both parties have signed, and the contract is
 * configured. Mounts the hidden SDK host only after the landlord starts.
 */

import { useEffect, useState } from 'react';
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
import { currencyOption, scaleToSmallestUnit } from '@/lib/leaseCurrency';
import {
  LeaseOnChainForm,
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
  const { state, create } = useLeaseAgreementOnChain(
    account?.publicKey,
    clickRef
  );
  const [form, setForm] = useState<LeaseOnChainFormState>(() =>
    initialLeaseOnChainForm(lease)
  );
  const currency = currencyOption(form.currencySymbol);

  const onFieldChange = <K extends keyof LeaseOnChainFormState>(
    key: K,
    value: string
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // Switching currency re-scales the prefilled amounts to the new decimals
  // (from the lease's human values), so the smallest-unit figures stay correct.
  const onCurrencyChange = (symbol: string) =>
    setForm((prev) => {
      const { decimals } = currencyOption(symbol);
      return {
        ...prev,
        currencySymbol: symbol,
        monthlyRentAmount: scaleToSmallestUnit(
          lease.monthlyRent ?? 0,
          decimals
        ),
        securityDepositAmount: scaleToSmallestUnit(
          lease.securityDeposit ?? 0,
          decimals
        ),
      };
    });

  const { step, txHash, error } = state;
  const busy = step === 'signing' || step === 'pending';
  const hasWalletSession = Boolean(account?.publicKey && clickRef);
  const hasEquity = Boolean(lease.equityPropertyId);

  // Surface the outcome once: a cspr.live link on success, the reason on failure.
  useEffect(() => {
    if (step === 'confirmed' && txHash) {
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
    }
    if (step === 'failed' && error) {
      toast({
        title: 'Couldn’t record on-chain',
        description: error,
        variant: 'destructive',
      });
    }
  }, [step, txHash, error, toast]);

  // Equity only applies to a lease-to-own lease; when the lease carries an
  // equity property the on-chain id is required (the off-chain row holds only a
  // UUID, so the landlord supplies it). Currency is the same for rent + deposit;
  // amounts are already scaled to its smallest unit.
  const submit = () =>
    create({
      tenantUserId: form.tenantUserId.trim(),
      equityPropertyId: form.equityPropertyId.trim() || null,
      monthlyRent: {
        currency: currency.address,
        amount: form.monthlyRentAmount.trim(),
      },
      securityDeposit: {
        currency: currency.address,
        amount: form.securityDepositAmount.trim(),
      },
      startUnixSeconds: form.startUnixSeconds.trim(),
      endUnixSeconds: form.endUnixSeconds.trim(),
      invoiceValidityDuration: form.invoiceValidityDuration.trim(),
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
        onCurrencyChange={onCurrencyChange}
      />

      {error && step !== 'failed' && (
        <p className="text-sm text-destructive">{error}</p>
      )}

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
  // lease and the contract is configured.
  if (
    !isLeaseAgreementEnabled ||
    !isLandlord ||
    lease.status !== 'pending-signatures' ||
    !bothSigned ||
    lease.onchainLeaseId
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
