/**
 * useWithdrawUnbonded Hook
 *
 * Orchestrates the withdraw_unbonded flow after the 48-hour unbonding period:
 * 1. Build withdraw_unbonded transaction
 * 2. Sign via CSPR.click wallet
 * 3. Submit to blockchain and poll for confirmation
 * 4. Surface success / failure callbacks
 */

import { useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import {
  createWithdrawUnbondedTransaction,
  parseWithdrawError,
} from '@/services/ico';
import {
  useBlockchainTransaction,
  type TxStep,
  type TxState,
  type UseBlockchainTransactionOptions,
} from './useBlockchainTransaction';

// Re-exported for consumers that import these types directly.
export type WithdrawStep = TxStep;
export type WithdrawState = TxState;
export type UseWithdrawUnbondedOptions = UseBlockchainTransactionOptions;

export function useWithdrawUnbonded(
  publicKey: string | null,
  clickRef: ICSPRClickSDK | null,
  options: UseWithdrawUnbondedOptions = {},
) {
  const { state, execute, reset } = useBlockchainTransaction(
    publicKey,
    clickRef,
    createWithdrawUnbondedTransaction,
    parseWithdrawError,
    options,
  );

  const withdraw = useCallback(() => execute(), [execute]);

  return { state, withdraw, reset };
}
