/**
 * useBlockchainTransaction
 *
 * Shared state machine for any single-transaction blockchain flow:
 *   1. Build transaction via buildTx
 *   2. Sign + submit via CSPR.click
 *   3. Poll for on-chain confirmation
 *   4. Surface success / failure callbacks
 *
 * Parameterised by:
 *   - buildTx   — constructs the Transaction (receives publicKey + caller-supplied args)
 *   - parseError — maps raw on-chain error messages to user-friendly strings
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import type { Transaction } from 'casper-js-sdk';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';

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

    try {
      const { status } = await csprCloudService.getDeploy(txHash);
      if (status === 'executed') return 'executed';
      if (status === 'failed') return 'failed';
    } catch {
      // Transient network error — continue polling until deadline
    }

    await delay(POLL_INTERVAL_MS);
  }

  return 'timed-out';
}

// ── Types ────────────────────────────────────────────────────────────

export type TxStep = 'idle' | 'signing' | 'pending' | 'confirmed' | 'failed';

export interface TxState {
  step: TxStep;
  txHash: string | null;
  error: string | null;
  isProcessing: boolean;
}

export interface UseBlockchainTransactionOptions {
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

const initialState: TxState = {
  step: 'idle',
  txHash: null,
  error: null,
  isProcessing: false,
};

// ── Hook ─────────────────────────────────────────────────────────────

export function useBlockchainTransaction<TArgs extends unknown[] = []>(
  publicKey: string | null,
  clickRef: ICSPRClickSDK | null,
  buildTx: (publicKey: string, ...args: TArgs) => Transaction,
  parseError: (rawMessage?: string) => string,
  options: UseBlockchainTransactionOptions = {},
): { state: TxState; execute: (...args: TArgs) => Promise<void>; reset: () => void } {
  const [state, setState] = useState<TxState>(initialState);
  const submittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable refs so execute's useCallback deps stay minimal
  const buildTxRef = useRef(buildTx);
  buildTxRef.current = buildTx;
  const parseErrorRef = useRef(parseError);
  parseErrorRef.current = parseError;

  const { onSuccess, onError } = options;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (...args: TArgs) => {
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
        const transaction = buildTxRef.current(publicKey, ...args);

        const result = await clickRef.send(
          transaction.toJSON() as object,
          publicKey,
          true,
          WALLET_SIGN_TIMEOUT_SEC,
        );

        if (!result || result.cancelled) {
          throw new Error('Transaction was cancelled');
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
          throw new Error('Transaction failed on-chain');
        } else {
          throw new Error('Transaction timed out — check the explorer for transaction status');
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        const error = parseErrorRef.current(err instanceof Error ? err.message : undefined);
        setState((prev) => ({ step: 'failed', txHash: prev.txHash, error, isProcessing: false }));
        onError?.(error);
      } finally {
        submittingRef.current = false;
      }
    },
    [publicKey, clickRef, onSuccess, onError],
  );

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
    submittingRef.current = false;
  }, []);

  return { state, execute, reset };
}
