/**
 * useClaimTokens Hook
 *
 * Orchestrates the token claim flow for a vesting schedule:
 * 1. Build claim transaction
 * 2. Sign via CSPR.click wallet
 * 3. Submit to blockchain and poll for confirmation
 * 4. Surface success / failure callbacks
 */

import { useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import { createClaimTransaction, parseVestingError } from '@/services/ico';
import {
  useBlockchainTransaction,
  type TxStep,
  type TxState,
  type UseBlockchainTransactionOptions,
} from './useBlockchainTransaction';

// Re-exported for consumers that import these types directly.
export type ClaimStep = TxStep;
export type ClaimState = TxState;
export type UseClaimTokensOptions = UseBlockchainTransactionOptions;

export function useClaimTokens(
  publicKey: string | null,
  clickRef: ICSPRClickSDK | null,
  options: UseClaimTokensOptions = {},
) {
  const { state, execute, reset } = useBlockchainTransaction(
    publicKey,
    clickRef,
    createClaimTransaction,
    parseVestingError,
    options,
  );

  const claim = useCallback((vestingId: bigint) => execute(vestingId), [execute]);

  return { state, claim, reset };
}
