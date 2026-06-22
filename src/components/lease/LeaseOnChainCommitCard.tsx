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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useLeaseAgreementOnChain } from '@/hooks/lease/useLeaseAgreementOnChain';
import { isLeaseAgreementEnabled } from '@/lib/casper/leaseAgreement';
import {
  LEASE_CURRENCY_OPTIONS,
  currencyOption,
  defaultCurrencySymbol,
  scaleToSmallestUnit,
} from '@/lib/leaseCurrency';
import { OnChainSdkHost } from '@/components/blockchain/OnChainSdkHost';
import { ICO_CONFIG } from '@/constants/ico';
import type { Lease } from '@/types/leaseContract';

const ONE_MONTH_IN_SECONDS = 30 * 24 * 60 * 60;

const explorerDeployUrl = (txHash: string) =>
  `${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`;

/** UTC midnight of a `YYYY-MM-DD` (or ISO) date, as unix seconds. */
function toUnixSeconds(date: string): number {
  return Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000);
}

const isDigits = (value: string) => /^\d+$/.test(value.trim());

interface FormState {
  /** Tenant's on-chain UserRegistry user id (`U256`, decimal digits). */
  tenantUserId: string;
  equityPropertyId: string;
  currencySymbol: string;
  monthlyRentAmount: string;
  securityDepositAmount: string;
  startUnixSeconds: string;
  endUnixSeconds: string;
  invoiceValidityDuration: string;
}

/**
 * Prefill from the lease: currency from `lease.currency`, amounts scaled to its
 * smallest unit, term aligned to whole 30-day months. The tenant's on-chain user
 * id can't be derived, so it starts blank for the landlord to enter.
 */
function initialForm(lease: Lease): FormState {
  const start = toUnixSeconds(lease.startDate);
  const months = Math.max(
    1,
    Math.round((toUnixSeconds(lease.endDate) - start) / ONE_MONTH_IN_SECONDS)
  );
  const symbol = defaultCurrencySymbol(lease.currency);
  const { decimals } = currencyOption(symbol);
  return {
    tenantUserId: '',
    equityPropertyId: '',
    currencySymbol: symbol,
    monthlyRentAmount: scaleToSmallestUnit(lease.monthlyRent ?? 0, decimals),
    securityDepositAmount: scaleToSmallestUnit(
      lease.securityDeposit ?? 0,
      decimals
    ),
    startUnixSeconds: String(start),
    // Aligned to a whole 30-day multiple — the contract reverts otherwise.
    endUnixSeconds: String(start + months * ONE_MONTH_IN_SECONDS),
    invoiceValidityDuration: String(ONE_MONTH_IN_SECONDS),
  };
}

// ── Interactive flow — MUST render inside OnChainSdkHost (needs clickRef) ─────

function CommitFlow({ lease }: { lease: Lease }) {
  const { account, clickRef, connect } = useICOWallet();
  const { toast } = useToast();
  const { state, create } = useLeaseAgreementOnChain(
    account?.publicKey,
    clickRef
  );
  const [form, setForm] = useState<FormState>(() => initialForm(lease));
  const currency = currencyOption(form.currencySymbol);

  const set = <K extends keyof FormState>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Switching currency re-scales the prefilled amounts to the new decimals
  // (from the lease's human values), so the smallest-unit figures stay correct.
  const setCurrency = (symbol: string) =>
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

  // Equity only applies to a lease-to-own lease. When the lease carries an
  // equity property the on-chain id is required (the off-chain row holds only a
  // UUID, so the landlord supplies the on-chain id); otherwise it stays None.
  const hasEquity = Boolean(lease.equityPropertyId);

  const valid =
    isDigits(form.tenantUserId) &&
    isDigits(form.monthlyRentAmount) &&
    isDigits(form.securityDepositAmount) &&
    isDigits(form.startUnixSeconds) &&
    isDigits(form.endUnixSeconds) &&
    isDigits(form.invoiceValidityDuration) &&
    (hasEquity ? isDigits(form.equityPropertyId) : true);

  const submit = () =>
    create({
      tenantUserId: form.tenantUserId.trim(),
      equityPropertyId: form.equityPropertyId.trim() || null,
      // Currency is derived from the lease (same for rent + deposit); amounts are
      // already scaled to its smallest unit.
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

  const field = (key: keyof FormState, label: string, placeholder?: string) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={key} className="text-xs">
        {label}
      </Label>
      <Input
        id={key}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
        className="font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the on-chain values for this lease, then sign once. Amounts are
        in the currency's smallest unit and prefilled from the lease — adjust if
        a token's decimals differ.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="tenantUserId" className="text-xs">
            Tenant on-chain user id *
          </Label>
          <Input
            id="tenantUserId"
            value={form.tenantUserId}
            placeholder="e.g. 42"
            onChange={(e) => set('tenantUserId', e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            {form.tenantUserId
              ? isDigits(form.tenantUserId)
                ? 'The tenant’s UserRegistry user id.'
                : 'Must be a whole number (the tenant’s on-chain user id).'
              : 'The tenant’s UserRegistry user id (a whole number).'}
          </p>
        </div>

        {hasEquity && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="equityPropertyId" className="text-xs">
              Equity property on-chain id (lease-to-own) *
            </Label>
            <Input
              id="equityPropertyId"
              value={form.equityPropertyId}
              onChange={(e) => set('equityPropertyId', e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Lease-to-own for property{' '}
              <span className="font-mono">{lease.equityPropertyId}</span> —
              enter its on-chain id.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="currencySymbol" className="text-xs">
            Currency
          </Label>
          <Select value={form.currencySymbol} onValueChange={setCurrency}>
            <SelectTrigger id="currencySymbol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEASE_CURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option.symbol} value={option.symbol}>
                  {option.symbol}
                  {option.address
                    ? ` · ${option.decimals} decimals`
                    : ' · native'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {field('monthlyRentAmount', 'Rent amount (smallest unit) *')}
        {field('securityDepositAmount', 'Deposit amount (smallest unit) *')}
        {field('startUnixSeconds', 'Start (unix seconds)')}
        {field('endUnixSeconds', 'End (unix seconds)')}
        {field('invoiceValidityDuration', 'Invoice validity (seconds)')}
      </div>

      {error && step !== 'failed' && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button disabled={busy || !valid} onClick={submit}>
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
