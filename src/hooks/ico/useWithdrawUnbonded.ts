/**
 * useWithdrawUnbonded Hook
 *
 * Orchestrates the withdraw_unbonded flow after the 48-hour unbonding period:
 * 1. Build withdraw_unbonded transaction
 * 2. Sign via CSPR.click wallet
 * 3. Submit to blockchain and poll for confirmation
 * 4. Surface success / failure callbacks
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';
import {
  createWithdrawUnbondedTransaction,
  parseWithdrawError,
} from '@/services/ico/withdrawUnbondedService';

// ── Constants ────────────────────────────────────────────────────────

const CONFIRMATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 10_000;                 // 10 seconds
const WALLET_SIGN_TIMEOUT_SEC = 300;             // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForConfirmation(
  txHash: string,
  signal: AbortSignal,
): Promise<'executed' | 'failed' | 'timed-out'> {
  const deadline = Date.now() + CONFIRMATION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal.aborted) return 'timed-out';

    const { status } = await csprCloudService.getDeploy(txHash);
    if (status === 'executed') return 'executed';
    if (status === 'failed') return 'failed';

    await delay(POLL_INTERVAL_MS);
  }

  return 'timed-out';
}

// ── Types ────────────────────────────────────────────────────────────

export type WithdrawStep =
  | 'idle'
  | 'signing'
  | 'pending'
  | 'confirmed'
  | 'failed';

export interface WithdrawState {
  step: WithdrawStep;
  txHash: string | null;
  error: string | null;
  isProcessing: boolean;
}

export interface UseWithdrawUnbondedOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

const initialState: WithdrawState = {
  step: 'idle',
  txHash: null,
  error: null,
  isProcessing: false,
};

// ── Hook ─────────────────────────────────────────────────────────────

export function useWithdrawUnbonded(
  publicKey: string | null,
  clickRef: ICSPRClickSDK | null,
  options: UseWithdrawUnbondedOptions = {},
) {
  const [state, setState] = useState<WithdrawState>(initialState);
  const submittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { onSuccess, onError } = options;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const withdraw = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (!publicKey) {
      const error = 'Wallet not connected';
      setState({ ...initialState, step: 'failed', error });
      onError?.(error);
      submittingRef.current = false;
      return;
    }

    if (!clickRef) {
      const error = 'Wallet SDK not initialized';
      setState({ ...initialState, step: 'failed', error });
      onError?.(error);
      submittingRef.current = false;
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState({ step: 'signing', txHash: null, error: null, isProcessing: true });

    try {
      const transaction = createWithdrawUnbondedTransaction(publicKey);

      const result = await clickRef.send(
        transaction.toJSON() as object,
        publicKey,
        true,
        WALLET_SIGN_TIMEOUT_SEC,
      );

      if (!result || result.cancelled) {
        throw new Error('Withdraw transaction was cancelled');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      const txHash = result.deployHash || result.transactionHash;
      if (!txHash) throw new Error('Wallet did not return a transaction hash');
      setState((prev) => ({ ...prev, step: 'pending', txHash }));

      const status = await waitForConfirmation(txHash, abortController.signal);

      if (abortController.signal.aborted) return;

      if (status === 'executed') {
        setState({ step: 'confirmed', txHash, error: null, isProcessing: false });
        onSuccess?.(txHash);
      } else if (status === 'failed') {
        throw new Error('Withdraw transaction failed on-chain');
      } else {
        throw new Error('Withdraw timed out — check the explorer for transaction status');
      }
    } catch (err) {
      if (abortController.signal.aborted) return;
      const error = parseWithdrawError(err instanceof Error ? err.message : undefined);
      setState({ step: 'failed', txHash: null, error, isProcessing: false });
      onError?.(error);
    } finally {
      submittingRef.current = false;
    }
  }, [publicKey, clickRef, onSuccess, onError]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
    submittingRef.current = false;
  }, []);

  return { state, withdraw, reset };
}
