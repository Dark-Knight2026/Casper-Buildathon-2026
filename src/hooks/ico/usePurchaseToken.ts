/**
 * usePurchaseToken Hook
 *
 * Orchestrates the complete token purchase flow:
 * 1. Validate purchase parameters
 * 2. Check/request approval for CEP-18 tokens
 * 3. Create and sign purchase transaction
 * 4. Submit to blockchain and track status
 * 5. Handle success/failure callbacks
 */

import { useState, useCallback } from 'react';
import { PublicKey } from 'casper-js-sdk';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import {
  preparePurchase,
  validatePurchase,
  calculateTokensReceived,
  fromRawAmount,
} from '@/services/ico/icoPurchaseService';
import { ICO_CONFIG, getCurrencyRateUsd } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';

const LOG_PREFIX = '[usePurchaseToken]';

/**
 * Derives account hash from public key hex string.
 * Uses casper-js-sdk PublicKey.accountHash().toPrefixedString()
 */
function deriveAccountHash(publicKeyHex: string): string {
  if (!publicKeyHex) {
    console.warn(LOG_PREFIX, 'Empty public key provided');
    return '';
  }

  try {
    const pk = PublicKey.fromHex(publicKeyHex);
    const accountHash = pk.accountHash();
    return accountHash.toPrefixedString();
  } catch (err) {
    console.warn(LOG_PREFIX, 'Failed to derive account hash:', err);
    return '';
  }
}

// ── Types ───────────────────────────────────────────────────────────

export type PurchaseStep =
  | 'idle'
  | 'validating'
  | 'checking-approval'
  | 'awaiting-approval-signature'
  | 'submitting-approval'
  | 'approval-pending'
  | 'awaiting-purchase-signature'
  | 'submitting-purchase'
  | 'purchase-pending'
  | 'confirmed'
  | 'failed';

export interface PurchaseState {
  step: PurchaseStep;
  approvalTxHash: string | null;
  purchaseTxHash: string | null;
  tokensReceived: string | null;
  error: string | null;
  isProcessing: boolean;
}

export interface UsePurchaseTokenOptions {
  onSuccess?: (txHash: string, tokensReceived: string) => void;
  onError?: (error: string) => void;
  onApprovalNeeded?: () => void;
}

export interface UsePurchaseTokenReturn {
  state: PurchaseState;
  purchase: (amount: string, currency: PaymentCurrency, balance: number) => Promise<void>;
  reset: () => void;
  calculateTokens: (amount: string, currency: PaymentCurrency, tokenPrice: number) => string;
}

// ── Initial State ───────────────────────────────────────────────────

const initialState: PurchaseState = {
  step: 'idle',
  approvalTxHash: null,
  purchaseTxHash: null,
  tokensReceived: null,
  error: null,
  isProcessing: false,
};

// ── Hook ────────────────────────────────────────────────────────────

export function usePurchaseToken(
  publicKey: string | null,
  tokenPriceUsd: number,
  clickRef: ICSPRClickSDK | null,
  options: UsePurchaseTokenOptions = {},
  csprPriceUsd?: number,
): UsePurchaseTokenReturn {
  const [state, setState] = useState<PurchaseState>(initialState);

  const { onSuccess, onError, onApprovalNeeded } = options;

  /**
   * Main purchase function.
   */
  const purchase = useCallback(
    async (amount: string, currency: PaymentCurrency, balance: number) => {
      console.log(LOG_PREFIX, '=== PURCHASE START ===', { amount, currency, balance, publicKey });

      if (!publicKey) {
        const error = 'Wallet not connected';
        setState((prev) => ({ ...prev, step: 'failed', error, isProcessing: false }));
        onError?.(error);
        return;
      }

      if (!clickRef) {
        const error = 'Wallet SDK not initialized';
        setState((prev) => ({ ...prev, step: 'failed', error, isProcessing: false }));
        onError?.(error);
        return;
      }

      // Derive account hash from public key
      const accountHash = deriveAccountHash(publicKey);
      if (!accountHash) {
        const error = 'Failed to derive account hash from public key';
        setState((prev) => ({ ...prev, step: 'failed', error, isProcessing: false }));
        onError?.(error);
        return;
      }

      // Reset state
      setState({
        ...initialState,
        step: 'validating',
        isProcessing: true,
      });

      try {
        // 1. Validate purchase
        console.log(LOG_PREFIX, '[Step 1] Validating purchase...');
        const validation = validatePurchase(amount, currency, balance, csprPriceUsd);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        console.log(LOG_PREFIX, '[Step 1] Validation passed');

        // 2. Check approval and prepare transactions
        console.log(LOG_PREFIX, '[Step 2] Preparing purchase (checking approval, building tx)...');
        setState((prev) => ({ ...prev, step: 'checking-approval' }));

        const { approvalNeeded, approvalTransaction, purchaseTransaction } =
          await preparePurchase({
            senderPublicKey: publicKey,
            senderAccountHash: accountHash,
            amount,
            currency,
          });

        console.log(LOG_PREFIX, '[Step 2] Purchase prepared:', {
          approvalNeeded,
        });

        // 3. Handle approval if needed
        if (approvalNeeded && approvalTransaction) {
          console.log(LOG_PREFIX, '[Step 3] Approval needed, sending approval tx...');
          onApprovalNeeded?.();

          setState((prev) => ({ ...prev, step: 'awaiting-approval-signature' }));

          const approvalJSON = approvalTransaction.toJSON();
          console.log(LOG_PREFIX, '[Step 3] Approval JSON:', approvalJSON);

          const approvalResult = await clickRef.send(
            approvalJSON as object,
            publicKey,
            true,
            300,
          );

          console.log(LOG_PREFIX, '[Step 3] Approval result:', approvalResult);

          if (!approvalResult || approvalResult.cancelled) {
            throw new Error('Approval transaction was cancelled');
          }

          if (approvalResult.error) {
            throw new Error(approvalResult.error);
          }

          const approvalTxHash = approvalResult.deployHash || approvalResult.transactionHash || '';

          setState((prev) => ({
            ...prev,
            step: 'approval-pending',
            approvalTxHash,
          }));
          console.log(LOG_PREFIX, '[Step 3] Approval confirmed:', approvalTxHash);
        }

        // 4. Sign and send purchase transaction
        console.log(LOG_PREFIX, '[Step 4] Sending purchase tx...');
        setState((prev) => ({ ...prev, step: 'awaiting-purchase-signature' }));

        const purchaseJSON = purchaseTransaction.toJSON();
        console.log(LOG_PREFIX, '[Step 4] Transaction JSON:', purchaseJSON);

        console.log(LOG_PREFIX, '[Step 4] Calling clickRef.send()...');
        const purchaseResult = await clickRef.send(
          purchaseJSON as object,
          publicKey,
          true,
          300,
        );
        console.log(LOG_PREFIX, '[Step 4] Send result:', purchaseResult);

        if (!purchaseResult || purchaseResult.cancelled) {
          throw new Error('Purchase transaction was cancelled');
        }

        if (purchaseResult.error) {
          throw new Error(purchaseResult.error);
        }

        const purchaseTxHash = purchaseResult.deployHash || purchaseResult.transactionHash || '';

        setState((prev) => ({
          ...prev,
          step: 'purchase-pending',
          purchaseTxHash,
        }));
        console.log(LOG_PREFIX, '[Step 4] Purchase sent:', purchaseTxHash);

        // 5. Calculate tokens received
        const tokensRaw = calculateTokensReceived(amount, currency, tokenPriceUsd, csprPriceUsd);
        const tokensReceived = fromRawAmount(tokensRaw, ICO_CONFIG.TOKEN.decimals);

        // 6. Success!
        setState((prev) => ({
          ...prev,
          step: 'confirmed',
          tokensReceived,
          isProcessing: false,
        }));

        console.log(LOG_PREFIX, '=== PURCHASE SUCCESS ===', { purchaseTxHash, tokensReceived });
        onSuccess?.(purchaseTxHash, tokensReceived);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Purchase failed';
        console.error(LOG_PREFIX, '=== PURCHASE FAILED ===', err);

        setState((prev) => ({
          ...prev,
          step: 'failed',
          error: errorMessage,
          isProcessing: false,
        }));

        onError?.(errorMessage);
      }
    },
    [publicKey, tokenPriceUsd, clickRef, onSuccess, onError, onApprovalNeeded, csprPriceUsd],
  );

  /**
   * Reset state to initial.
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Calculate tokens to be received for a given payment.
   */
  const calculateTokens = useCallback(
    (amount: string, currency: PaymentCurrency, tokenPrice: number): string => {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0 || tokenPrice <= 0) {
        return '0';
      }

      const currencyRate = getCurrencyRateUsd(currency, csprPriceUsd);
      const amountInUsd = numAmount * currencyRate;
      const tokens = amountInUsd / tokenPrice;

      return tokens.toLocaleString(undefined, { maximumFractionDigits: 2 });
    },
    [csprPriceUsd],
  );

  return {
    state,
    purchase,
    reset,
    calculateTokens,
  };
}

// ── Helper: Step to user-friendly message ───────────────────────────

export function getStepMessage(step: PurchaseStep): string {
  switch (step) {
    case 'idle':
      return '';
    case 'validating':
      return 'Validating purchase...';
    case 'checking-approval':
      return 'Checking token approval...';
    case 'awaiting-approval-signature':
      return 'Please sign the approval transaction in your wallet...';
    case 'submitting-approval':
      return 'Submitting approval...';
    case 'approval-pending':
      return 'Waiting for approval confirmation...';
    case 'awaiting-purchase-signature':
      return 'Please sign the purchase transaction in your wallet...';
    case 'submitting-purchase':
      return 'Submitting purchase...';
    case 'purchase-pending':
      return 'Waiting for purchase confirmation...';
    case 'confirmed':
      return 'Purchase confirmed!';
    case 'failed':
      return 'Purchase failed';
    default:
      return '';
  }
}

export default usePurchaseToken;
