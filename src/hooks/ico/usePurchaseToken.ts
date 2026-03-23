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

import { useState, useCallback, useRef } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import {
  preparePurchase,
  validatePurchase,
  calculateTokensReceived,
  fromRawAmount,
  toRawAmount,
  parseContractError,
} from '@/services/ico/icoPurchaseService';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';
import { ICO_CONFIG, getCurrencyRateUsd } from '@/constants/ico';
import type { PaymentCurrency } from '@/types/ico';

// ── Constants ────────────────────────────────────────────────────────

const LOG_PREFIX = '[usePurchaseToken]';

/** Normalized BIG token hash for matching CSPR.Cloud responses */
const BIG_TOKEN_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '').toLowerCase();

// ICSPRClickSDK.send() 4th argument is in SECONDS (not milliseconds).
const WALLET_SIGN_TIMEOUT_SEC = 300; // 5 minutes

const APPROVAL_CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const DEPLOY_POLL_INTERVAL_MS = 10_000; // 10 seconds

// ── Helpers ──────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Safe BigInt parsing — returns null instead of throwing on invalid input.
 * Handles: non-numeric strings, decimals ("1.5"), scientific notation ("1e18"), empty strings.
 */
function safeBigInt(raw: string): bigint | null {
  // BigInt only accepts integer strings — strip any decimal part defensively
  const intPart = raw.split('.')[0];
  if (!intPart || !/^\d+$/.test(intPart)) return null;
  try {
    return BigInt(intPart);
  } catch {
    return null;
  }
}

/**
 * Fetches BIG token transfer amount from CSPR.Cloud REST API.
 * Uses `/ft-token-actions?deploy_hash={hash}` via Vite proxy.
 * Retries up to `maxRetries` times with a delay to account for indexer lag.
 */
async function fetchActualTokensReceived(
  deployHash: string,
  maxRetries = 3,
  retryDelayMs = 5000,
): Promise<bigint | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait before querying — the indexer needs time to process the deploy
      if (attempt > 1) {
        console.log(LOG_PREFIX, `[fetchTokens] Retry ${attempt}/${maxRetries}, waiting ${retryDelayMs}ms...`);
      }
      await delay(attempt === 1 ? 3000 : retryDelayMs);

      const url = `/api/cspr-cloud/ft-token-actions?deploy_hash=${deployHash}`;
      console.log(LOG_PREFIX, `[fetchTokens] Fetching: ${url} (attempt ${attempt})`);

      const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!resp.ok) {
        console.warn(LOG_PREFIX, `[fetchTokens] HTTP ${resp.status}`);
        continue;
      }

      const json = await resp.json();
      console.log(LOG_PREFIX, '[fetchTokens] Response:', json);

      // CSPR.Cloud returns { data: [...] } with paginated results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = json.data ?? (Array.isArray(json) ? json : []);

      if (items.length === 0) {
        console.log(LOG_PREFIX, '[fetchTokens] No token actions found yet');
        continue;
      }

      // Find the BIG token transfer action
      for (const item of items) {
        const contractHash = String(item.contract_package_hash ?? item.contract_hash ?? '').toLowerCase();
        if (contractHash === BIG_TOKEN_HASH) {
          const rawAmount = String(item.amount ?? '');
          console.log(LOG_PREFIX, '[fetchTokens] Found BIG transfer:', rawAmount);
          const value = safeBigInt(rawAmount);
          if (value !== null && value > 0n) return value;
        }
      }

      console.log(LOG_PREFIX, '[fetchTokens] BIG token action not found in results');
    } catch (err) {
      console.warn(LOG_PREFIX, `[fetchTokens] Error on attempt ${attempt}:`, err);
    }
  }

  return null;
}

/**
 * Polls getDeployStatus until the deploy is executed, failed, or times out.
 * Used to ensure the CEP-18 approval is on-chain before submitting the purchase.
 */
async function waitForDeployConfirmation(
  deployHash: string,
): Promise<'executed' | 'failed' | 'timed-out'> {
  const deadline = Date.now() + APPROVAL_CONFIRMATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { status } = await csprCloudService.getDeploy(deployHash);
    if (status === 'executed') return 'executed';
    if (status === 'failed') return 'failed';
    await delay(DEPLOY_POLL_INTERVAL_MS);
  }
  return 'timed-out';
}
// ── Types ───────────────────────────────────────────────────────────

export type PurchaseStep =
  | 'idle'
  | 'validating'
  | 'checking-approval'
  | 'awaiting-approval-signature'
  | 'approval-pending'
  | 'awaiting-purchase-signature'
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
  const submittingRef = useRef(false);
  // Tracks allowance from a completed approve tx so that a failed purchase
  // doesn't force the user to re-approve (Odra CEP-18 on-chain query always fails).
  const approvalCacheRef = useRef<{ currency: PaymentCurrency; rawAmount: bigint } | null>(null);

  const { onSuccess, onError, onApprovalNeeded } = options;

  /**
   * Main purchase function.
   */
  const purchase = useCallback(
    async (amount: string, currency: PaymentCurrency, balance: number) => {
      // Synchronous guard — prevents duplicate submissions on rapid clicks
      if (submittingRef.current) return;
      submittingRef.current = true;

      if (!publicKey) {
        const error = 'Wallet not connected';
        setState((prev) => ({ ...prev, step: 'failed', error, isProcessing: false }));
        onError?.(error);
        submittingRef.current = false;
        return;
      }

      if (!clickRef) {
        const error = 'Wallet SDK not initialized';
        setState((prev) => ({ ...prev, step: 'failed', error, isProcessing: false }));
        onError?.(error);
        submittingRef.current = false;
        return;
      }

      // Derive account hash from public key
      const accountHash = deriveAccountHash(publicKey);
      if (!accountHash) {
        const error = 'Failed to derive account hash from public key';
        setState((prev) => ({ ...prev, step: 'failed', error, isProcessing: false }));
        onError?.(error);
        submittingRef.current = false;
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
        const validation = validatePurchase(amount, currency, balance, csprPriceUsd);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // 2. Check approval and prepare transactions
        setState((prev) => ({ ...prev, step: 'checking-approval' }));

        // Use cached allowance if we already approved this currency in the current session.
        // The on-chain query fails for Odra CEP-18 contracts (different storage layout).
        const cached = approvalCacheRef.current;
        const cachedAllowance =
          cached?.currency === currency ? cached.rawAmount : undefined;

        const { approvalNeeded, approvalTransaction, purchaseTransaction } =
          await preparePurchase({
            senderPublicKey: publicKey,
            senderAccountHash: accountHash,
            amount,
            currency,
            cachedAllowance,
          });

        // 3. Handle approval if needed
        if (approvalNeeded && approvalTransaction) {
          onApprovalNeeded?.();

          setState((prev) => ({ ...prev, step: 'awaiting-approval-signature' }));

          const approvalJSON = approvalTransaction.toJSON();

          const approvalResult = await clickRef.send(
            approvalJSON as object,
            publicKey,
            true,
            WALLET_SIGN_TIMEOUT_SEC,
          );

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

          // Wait for approval to execute on-chain before submitting purchase.
          // CEP-18 transfer_from() requires the allowance to be set first.
          const approvalStatus = await waitForDeployConfirmation(approvalTxHash);
          if (approvalStatus !== 'executed') {
            throw new Error(
              approvalStatus === 'timed-out'
                ? 'Approval transaction timed out — please try again'
                : 'Approval transaction failed on-chain',
            );
          }

          // Cache the approved allowance so retries don't re-ask for approve.
          // USDT/USDC always use 6 decimals; CSPR never reaches this branch.
          const STABLECOIN_DECIMALS = 6;
          approvalCacheRef.current = {
            currency,
            rawAmount: toRawAmount(amount, STABLECOIN_DECIMALS),
          };
        }

        // 4. Sign and send purchase transaction
        setState((prev) => ({ ...prev, step: 'awaiting-purchase-signature' }));

        const purchaseJSON = purchaseTransaction.toJSON();

        const purchaseResult = await clickRef.send(
          purchaseJSON as object,
          publicKey,
          true,
          WALLET_SIGN_TIMEOUT_SEC,
        );

        if (!purchaseResult || purchaseResult.cancelled) {
          throw new Error('Purchase transaction was cancelled');
        }

        if (purchaseResult.error) {
          throw new Error(purchaseResult.error);
        }

        const purchaseTxHash = purchaseResult.deployHash || purchaseResult.transactionHash || '';
        if (!purchaseTxHash) throw new Error('Wallet did not return a transaction hash');

        setState((prev) => ({
          ...prev,
          step: 'purchase-pending',
          purchaseTxHash,
        }));

        // 5. Fetch actual tokens received via CSPR.Cloud REST API
        let tokensReceived: string;
        const actualTokens = await fetchActualTokensReceived(purchaseTxHash);

        if (actualTokens !== null && actualTokens > 0n) {
          tokensReceived = fromRawAmount(actualTokens, ICO_CONFIG.TOKEN.decimals);
          console.log(LOG_PREFIX, '[Step 5] Actual tokens from CSPR.Cloud:', tokensReceived);
        } else {
          // Fallback to local estimate if CSPR.Cloud indexer hasn't processed yet
          console.warn(LOG_PREFIX, '[Step 5] Could not fetch tokens from CSPR.Cloud, using estimate');
          const tokensRaw = calculateTokensReceived(amount, currency, tokenPriceUsd, csprPriceUsd);
          tokensReceived = fromRawAmount(tokensRaw, ICO_CONFIG.TOKEN.decimals);
        }

        // 7. Success! Clear approval cache — allowance was consumed by transfer_from.
        approvalCacheRef.current = null;

        setState((prev) => ({
          ...prev,
          step: 'confirmed',
          tokensReceived,
          isProcessing: false,
        }));

        onSuccess?.(purchaseTxHash, tokensReceived);
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Purchase failed';
        const errorMessage = parseContractError(raw);

        setState((prev) => ({
          ...prev,
          step: 'failed',
          error: errorMessage,
          isProcessing: false,
        }));

        onError?.(errorMessage);
      } finally {
        submittingRef.current = false;
      }
    },
    [publicKey, tokenPriceUsd, clickRef, onSuccess, onError, onApprovalNeeded, csprPriceUsd],
  );

  /**
   * Reset state to initial.
   */
  const reset = useCallback(() => {
    setState(initialState);
    submittingRef.current = false;
    approvalCacheRef.current = null;
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

      let currencyRate: number;
      try {
        currencyRate = getCurrencyRateUsd(currency, csprPriceUsd);
      } catch {
        return '—';
      }
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
    case 'approval-pending':
      return 'Waiting for approval confirmation...';
    case 'awaiting-purchase-signature':
      return 'Please sign the purchase transaction in your wallet...';
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
