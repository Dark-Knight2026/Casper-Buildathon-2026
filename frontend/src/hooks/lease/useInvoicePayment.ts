/**
 * Tenant invoice payment (§3.5b, P-1.3) — orchestrates the two on-chain deploys
 * a settlement needs, then records it off-chain:
 *
 *   1. `approve(escrow, amount)` on the USDC token — skipped when the existing
 *      allowance already covers the amount (`isApproveNeeded`).
 *   2. `pay_invoice(invoice_id, amount)` on the escrow contract.
 *   3. `POST /invoices/{id}/settlement` with the pay deploy hash.
 *
 * Built on two `useBlockchainTransaction` state machines (one per deploy) joined
 * by a thin promise bridge, so the flow reads as one linear `async` function.
 * Step 3 is best-effort: the money has already moved on-chain and the indexer
 * reconciles the invoice from `InvoicePaid`/`InvoicePaymentApplied` regardless,
 * so a failed settlement POST surfaces as `recordError` but the payment is still
 * considered done.
 *
 * Amounts are passed as the human USDC decimal string the tenant pays (the full
 * `amountDue` for a deposit; any value up to the remaining balance for rent);
 * this hook scales it to the token's smallest unit for the chain and forwards
 * the decimal string to the backend.
 */

import { useCallback, useRef, useState } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';

import { useBlockchainTransaction } from '@/hooks/ico/useBlockchainTransaction';
import { useSettleInvoice } from '@/hooks/useInvoices';
import { buildApproveTransaction, isApproveNeeded } from '@/lib/casper/cep18';
import {
  escrowPackageHash,
  isEscrowEnabled,
  parseEscrowError,
  payInvoiceTransaction,
} from '@/lib/casper/escrow';
import { LEASE_CURRENCY, scaleToSmallestUnit } from '@/lib/leaseCurrency';
import { ICO_CONFIG } from '@/constants/ico';
import type { Invoice } from '@/types/invoiceContract';

export type PaymentStep =
  | 'idle'
  | 'checking'
  | 'approving'
  | 'paying'
  | 'recording'
  | 'done'
  | 'failed';

export interface InvoicePaymentState {
  step: PaymentStep;
  /** Approve deploy hash (null when the allowance already covered the amount). */
  approveTxHash: string | null;
  /** `pay_invoice` deploy hash (set once the payment confirms on-chain). */
  payTxHash: string | null;
  /** Fatal error that stopped the flow before the payment confirmed. */
  error: string | null;
  /** Non-fatal: the payment confirmed on-chain but `/settlement` didn't post. */
  recordError: string | null;
}

export interface PayInvoiceArgs {
  /** The invoice to settle (needs `id`, `amountDue`). */
  invoice: Invoice;
  /**
   * The escrow on-chain invoice id (`pay_invoice` target). Resolved by the
   * caller — the backend `onchainInvoiceId` when bound, otherwise derived from
   * the chain (see `useResolvedOnchainInvoiceId`).
   */
  onchainInvoiceId: string;
  /** Human USDC amount to pay (decimal string) — full `amountDue` for a deposit. */
  amount: string;
}

export interface UseInvoicePaymentOptions {
  /** Fires once the payment confirms on-chain (even if the record POST failed). */
  onPaid?: (payTxHash: string) => void;
  /** Fires when the flow fails before the payment confirms. */
  onError?: (message: string) => void;
}

const initialState: InvoicePaymentState = {
  step: 'idle',
  approveTxHash: null,
  payTxHash: null,
  error: null,
  recordError: null,
};

type Resolver = {
  resolve: (txHash: string) => void;
  reject: (err: Error) => void;
};

/**
 * @param publicKey   Tenant's wallet public key (hex), from `useICOWallet`.
 * @param accountHash Tenant's account hash, for the allowance read.
 * @param clickRef    CSPR.click SDK ref (the payment surface must mount a host).
 */
export function useInvoicePayment(
  publicKey: string | null | undefined,
  accountHash: string | null | undefined,
  clickRef: ICSPRClickSDK | null,
  options: UseInvoicePaymentOptions = {}
) {
  const [state, setState] = useState<InvoicePaymentState>(initialState);
  const { mutateAsync: settle } = useSettleInvoice();

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Promise bridges: each deploy resolves/rejects the in-flight step's promise
  // via the underlying state machine's onSuccess/onError.
  const approveResolver = useRef<Resolver | null>(null);
  const payResolver = useRef<Resolver | null>(null);

  const approveTx = useBlockchainTransaction(
    publicKey ?? null,
    clickRef,
    (pk, amountRaw: bigint) =>
      buildApproveTransaction({
        senderPublicKey: pk,
        tokenHash: LEASE_CURRENCY.address ?? '',
        spenderPackageHash: escrowPackageHash,
        amount: amountRaw,
      }),
    parseEscrowError,
    {
      onSuccess: (txHash) => approveResolver.current?.resolve(txHash),
      onError: (message) => approveResolver.current?.reject(new Error(message)),
    }
  );

  const payTx = useBlockchainTransaction(
    publicKey ?? null,
    clickRef,
    (pk, onchainInvoiceId: string, amountRaw: bigint) =>
      payInvoiceTransaction(pk, { onchainInvoiceId, amount: amountRaw }),
    parseEscrowError,
    {
      onSuccess: (txHash) => payResolver.current?.resolve(txHash),
      onError: (message) => payResolver.current?.reject(new Error(message)),
    }
  );

  const runApprove = useCallback(
    (amountRaw: bigint) =>
      new Promise<string>((resolve, reject) => {
        approveResolver.current = { resolve, reject };
        void approveTx.execute(amountRaw);
      }),
    [approveTx]
  );

  const runPay = useCallback(
    (onchainInvoiceId: string, amountRaw: bigint) =>
      new Promise<string>((resolve, reject) => {
        payResolver.current = { resolve, reject };
        void payTx.execute(onchainInvoiceId, amountRaw);
      }),
    [payTx]
  );

  const pay = useCallback(
    async ({ invoice, onchainInvoiceId, amount }: PayInvoiceArgs) => {
      if (!isEscrowEnabled || !LEASE_CURRENCY.address) {
        const error = 'On-chain payments aren’t configured yet.';
        setState({ ...initialState, step: 'failed', error });
        optionsRef.current.onError?.(error);
        return;
      }
      if (!publicKey || !clickRef) {
        const error = 'Connect your wallet to pay.';
        setState({ ...initialState, step: 'failed', error });
        optionsRef.current.onError?.(error);
        return;
      }
      if (!onchainInvoiceId) {
        const error =
          'This invoice isn’t ready to pay yet — it hasn’t been recorded on-chain.';
        setState({ ...initialState, step: 'failed', error });
        optionsRef.current.onError?.(error);
        return;
      }

      setState({ ...initialState, step: 'checking' });
      try {
        const amountRaw = BigInt(
          scaleToSmallestUnit(amount, LEASE_CURRENCY.decimals)
        );

        // 1. Approve — only when the current allowance doesn't already cover it.
        let approveTxHash: string | null = null;
        const needApprove = await isApproveNeeded({
          tokenInstanceHash: ICO_CONFIG.CONTRACTS.usdcInstanceHash,
          ownerAccountHash: accountHash ?? '',
          spenderPackageHash: escrowPackageHash,
          requiredRaw: amountRaw,
        });
        if (needApprove) {
          setState((s) => ({ ...s, step: 'approving' }));
          approveTxHash = await runApprove(amountRaw);
          setState((s) => ({ ...s, approveTxHash }));
        }

        // 2. Pay on-chain.
        setState((s) => ({ ...s, step: 'paying' }));
        const payTxHash = await runPay(onchainInvoiceId, amountRaw);
        setState((s) => ({ ...s, payTxHash }));

        // 3. Record off-chain (best-effort — the indexer reconciles regardless).
        setState((s) => ({ ...s, step: 'recording' }));
        try {
          await settle({ id: invoice.id, body: { amount, txHash: payTxHash } });
          setState((s) => ({ ...s, step: 'done' }));
        } catch (recordErr) {
          const recordError =
            recordErr instanceof Error
              ? recordErr.message
              : 'Couldn’t record the payment — it will sync shortly.';
          setState((s) => ({ ...s, step: 'done', recordError }));
        }

        optionsRef.current.onPaid?.(payTxHash);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Payment failed';
        setState((s) => ({ ...s, step: 'failed', error }));
        optionsRef.current.onError?.(error);
      }
    },
    [publicKey, clickRef, accountHash, runApprove, runPay, settle]
  );

  const reset = useCallback(() => {
    approveTx.reset();
    payTx.reset();
    approveResolver.current = null;
    payResolver.current = null;
    setState(initialState);
  }, [approveTx, payTx]);

  return {
    /** Whether the escrow + USDC config is present (feature dark when false). */
    isEnabled: isEscrowEnabled && Boolean(LEASE_CURRENCY.address),
    /** Flow state: idle → checking → approving → paying → recording → done/failed. */
    state,
    /** Run the full approve → pay → record flow for one invoice. */
    pay,
    reset,
  };
}
