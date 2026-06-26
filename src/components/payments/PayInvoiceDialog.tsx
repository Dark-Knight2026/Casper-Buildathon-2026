/**
 * Tenant payment dialog (§3.5b, P-2.1) — pays a deposit or rent invoice on-chain.
 *
 * The flow needs two signatures (`approve` USDC, then `pay_invoice`), so the
 * interactive part mounts its own hidden CSPR.click host (`OnChainSdkHost`,
 * P-2.3) — the SDK is not app-wide, so without it `connect`/`sign` are no-ops.
 *
 * Per the §3.5b product decisions: a deposit is paid in full (amount fixed to
 * what's due); rent defaults to the full remaining amount with a collapsed
 * "pay a partial amount" field (the escrow accepts any amount up to the balance).
 */

import { useMemo, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQueryClient } from '@tanstack/react-query';
import { OnChainSdkHost } from '@/components/blockchain/OnChainSdkHost';
import { useToast } from '@/hooks/use-toast';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useInvoicePayment } from '@/hooks/lease/useInvoicePayment';
import { useUsdcBalance } from '@/hooks/useUsdcBalance';
import { useResolvedOnchainInvoiceId } from '@/hooks/useResolvedOnchainInvoiceId';
import {
  LEASE_CURRENCY,
  scaleToSmallestUnit,
  formatFromSmallestUnit,
} from '@/lib/leaseCurrency';
import { ICO_CONFIG } from '@/constants/ico';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Invoice } from '@/types/invoiceContract';

const explorerDeployUrl = (txHash: string) =>
  `${ICO_CONFIG.CASPER.explorerUrl}/deploy/${txHash}`;

/** Remaining balance on an invoice (`amountDue − rentPaid`), as a decimal string. */
function remainingDue(invoice: Invoice): string {
  const dec = LEASE_CURRENCY.decimals;
  const due = BigInt(scaleToSmallestUnit(invoice.amountDue, dec));
  const paid = BigInt(scaleToSmallestUnit(invoice.rentPaid, dec));
  return formatFromSmallestUnit(due > paid ? due - paid : 0n, dec);
}

const fmt = (amount: string) =>
  `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${LEASE_CURRENCY.symbol}`;

const fmtDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));

interface PayInvoiceDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: PayInvoiceDialogProps) {
  const isDeposit = invoice.kind === 'security-deposit';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? 'Pay security deposit' : 'Pay rent'}
          </DialogTitle>
          <DialogDescription>
            Due {fmtDate(invoice.deadline)} · paid in {LEASE_CURRENCY.symbol}{' '}
            from your wallet. You’ll sign twice — approve, then pay.
          </DialogDescription>
        </DialogHeader>
        {/* DialogContent unmounts when closed, so the SDK host is lazy. */}
        <OnChainSdkHost>
          <PayFlow invoice={invoice} onClose={() => onOpenChange(false)} />
        </OnChainSdkHost>
      </DialogContent>
    </Dialog>
  );
}

// ── Interactive flow — MUST render inside OnChainSdkHost (needs clickRef) ─────

function PayFlow({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const { account, clickRef, connect } = useICOWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isDeposit = invoice.kind === 'security-deposit';
  const remaining = useMemo(() => remainingDue(invoice), [invoice]);
  const [showPartial, setShowPartial] = useState(false);
  const [rentAmount, setRentAmount] = useState(remaining);

  const { isEnabled, state, pay, reset } = useInvoicePayment(
    account?.publicKey,
    account?.accountHash,
    clickRef,
    {
      onPaid: () => {
        toast({ title: 'Payment confirmed on-chain' });
        // Refresh the payments list/summaries even if the best-effort
        // `/settlement` record didn't post — the on-chain pay still happened.
        void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      },
      onError: (message) =>
        toast({
          title: 'Payment failed',
          description: message,
          variant: 'destructive',
        }),
    }
  );

  const hasWalletSession = Boolean(account?.publicKey && clickRef);
  const dec = LEASE_CURRENCY.decimals;

  // The amount actually sent: a deposit is always paid in full; rent uses the
  // (possibly edited) field, defaulting to the full remaining balance.
  const amount = isDeposit ? remaining : showPartial ? rentAmount : remaining;
  const amountRaw = (() => {
    try {
      return BigInt(scaleToSmallestUnit(amount || '0', dec));
    } catch {
      return 0n;
    }
  })();
  const remainingRaw = BigInt(scaleToSmallestUnit(remaining, dec));
  const amountValid = amountRaw > 0n && amountRaw <= remainingRaw;

  // Pre-flight balance — advisory ONLY, never blocks. The balances dictionary
  // isn't readable for every CEP-18 layout (a failed read returns 0n), so we
  // only *warn* on a confident shortfall: a positive balance that's genuinely
  // too small. The on-chain transfer reverts with a clear message if funds are
  // actually short, so paying is always allowed.
  const { data: balance, refetch: refetchBalance } = useUsdcBalance(
    account?.accountHash
  );
  const lowBalance =
    balance !== undefined && balance > 0n && balance < amountRaw;

  // The escrow id to pay against: the backend value, or derived from the chain
  // when the indexer hasn't bound it yet.
  const { data: onchainInvoiceId, isLoading: resolvingId } =
    useResolvedOnchainInvoiceId(invoice);

  const settled = ['paid', 'released', 'refunded', 'cancelled'].includes(
    invoice.status
  );
  const payable = Boolean(onchainInvoiceId) && !settled;

  const busy = ['checking', 'approving', 'paying', 'recording'].includes(
    state.step
  );

  // Still resolving the on-chain id (the number we pay against) — show a loader
  // until the payment details are ready, rather than a bare line of text.
  if (resolvingId && state.step !== 'done') {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading payment details…</span>
      </div>
    );
  }

  // Resolved, but the invoice genuinely isn't payable on-chain yet (or settled).
  if (!payable && state.step !== 'done') {
    return (
      <p className="text-sm text-muted-foreground">
        {settled
          ? 'This invoice is already settled.'
          : 'This invoice isn’t on-chain yet — it’s still being recorded. Check back shortly.'}
      </p>
    );
  }

  if (!isEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        On-chain payments aren’t configured in this environment.
      </p>
    );
  }

  if (state.step === 'done') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Paid {fmt(amount)}</span>
        </div>
        {state.recordError ? (
          <p className="text-xs text-muted-foreground">
            Confirmed on-chain — finalizing on the platform may take a moment.
          </p>
        ) : null}
        {state.payTxHash ? (
          <a
            href={explorerDeployUrl(state.payTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            View the payment on cspr.live
          </a>
        ) : null}
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  if (!hasWalletSession) {
    return (
      <Button variant="outline" onClick={connect}>
        Connect wallet to pay
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="space-y-1 rounded-lg border p-3 text-sm">
        <Row
          label={isDeposit ? 'Security deposit' : 'Rent due'}
          value={fmt(invoice.amountDue)}
        />
        {invoice.rentPaid !== '0' && (
          <Row label="Already paid" value={fmt(invoice.rentPaid)} />
        )}
        <Row label="You pay now" value={fmt(amount)} strong />
        {balance !== undefined && balance > 0n && (
          <Row
            label="Wallet balance"
            value={fmt(formatFromSmallestUnit(balance, dec))}
            muted
          />
        )}
        <Row
          label="Network fee"
          value="≈ up to 13 CSPR (unused refunded)"
          muted
        />
      </div>

      {lowBalance && (
        <div className="flex items-start gap-2 text-sm text-amber-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Heads up: your {LEASE_CURRENCY.symbol} balance looks lower than this
            payment. You can still try — add funds and{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void refetchBalance()}
            >
              recheck
            </button>
            .
          </span>
        </div>
      )}

      {/* Rent: full by default, with a collapsed partial-amount option */}
      {!isDeposit && (
        <div className="space-y-2">
          {showPartial ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="rentAmount" className="text-xs">
                Amount to pay ({LEASE_CURRENCY.symbol})
              </Label>
              <Input
                id="rentAmount"
                inputMode="decimal"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                disabled={busy}
              />
              {!amountValid && (
                <p className="text-[11px] text-destructive">
                  Enter an amount between 0 and {fmt(remaining)}.
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => setShowPartial(true)}
            >
              Pay a partial amount instead
            </button>
          )}
        </div>
      )}

      {/* Two-step progress */}
      <ol className="space-y-1 text-sm">
        <StepRow
          label="1. Approve USDC"
          active={state.step === 'checking' || state.step === 'approving'}
          done={['paying', 'recording', 'done'].includes(state.step)}
        />
        <StepRow
          label="2. Pay invoice"
          active={state.step === 'paying'}
          done={['recording', 'done'].includes(state.step)}
        />
      </ol>

      {state.error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state.step === 'failed' ? (
        <Button className="w-full" onClick={reset}>
          Try again
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={busy || !amountValid}
          onClick={() =>
            pay({ invoice, onchainInvoiceId: onchainInvoiceId!, amount })
          }
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {state.step === 'approving'
                ? 'Approving…'
                : state.step === 'paying'
                  ? 'Paying…'
                  : state.step === 'recording'
                    ? 'Recording…'
                    : 'Checking…'}
            </>
          ) : (
            `Pay ${fmt(amount)}`
          )}
        </Button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          strong
            ? 'font-semibold'
            : muted
              ? 'text-xs text-muted-foreground'
              : ''
        }
      >
        {value}
      </span>
    </div>
  );
}

function StepRow({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <span className="h-4 w-4 rounded-full border" />
      )}
      <span className={done ? 'text-muted-foreground line-through' : ''}>
        {label}
      </span>
    </li>
  );
}
