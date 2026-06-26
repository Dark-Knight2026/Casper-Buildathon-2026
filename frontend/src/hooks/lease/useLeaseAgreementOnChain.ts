import { useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';

import {
  useBlockchainTransaction,
  type UseBlockchainTransactionOptions,
} from '@/hooks/ico/useBlockchainTransaction';
import {
  createLeaseAgreementTransaction,
  isLeaseAgreementEnabled,
  parseLeaseAgreementError,
  type CreateLeaseAgreementParamsInput,
} from '@/lib/casper/leaseAgreement';

/**
 * Landlord-signed on-chain `create_lease_agreement` (`Lease` contract).
 *
 * Scope is the deploy only: the landlord signs + submits the call from their
 * own wallet and we surface success/failure. The caller (`LeaseOnChainCommitCard`)
 * then pushes the resulting deploy hash to `POST /commit`, whose indexer derives
 * the on-chain ids from the event and activates the lease.
 *
 * Connecting the wallet (obtaining `clickRef` + `publicKey`) is the caller's
 * job — pass them in from `useICOWallet`. This hook owns only the build → sign →
 * submit → confirm state machine via `useBlockchainTransaction`. `options`
 * forwards `onSuccess(txHash)` / `onError(message)`, which fire exactly once per
 * attempt — the caller uses them to push the deploy hash and toast outcomes
 * without re-deriving them from `state` transitions.
 */
export function useLeaseAgreementOnChain(
  publicKey: string | null | undefined,
  clickRef: ICSPRClickSDK | null,
  options?: UseBlockchainTransactionOptions
) {
  const { state, execute, reset } = useBlockchainTransaction(
    publicKey ?? null,
    clickRef,
    (pk, params: CreateLeaseAgreementParamsInput) =>
      createLeaseAgreementTransaction(pk, params),
    parseLeaseAgreementError,
    options
  );

  const create = useCallback(
    (params: CreateLeaseAgreementParamsInput) => execute(params),
    [execute]
  );

  return {
    /** Whether the package hash is configured (feature is dark when false). */
    isEnabled: isLeaseAgreementEnabled,
    /** Deploy lifecycle: idle → signing → pending → confirmed / failed. */
    state,
    /** Sign + submit `create_lease_agreement` with the given params. */
    create,
    reset,
  };
}
