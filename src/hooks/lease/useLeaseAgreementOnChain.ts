import { useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';

import { useBlockchainTransaction } from '@/hooks/ico/useBlockchainTransaction';
import {
  createLeaseAgreementTransaction,
  isLeaseAgreementEnabled,
  parseLeaseAgreementError,
  type CreateLeaseAgreementParamsInput,
} from '@/lib/casper/leaseAgreement';

/**
 * Landlord-signed on-chain `create_lease_agreement` (`Lease` contract).
 *
 * Scope is the deploy only (LA-12, phase 1): the landlord signs + submits the
 * call from their own wallet and we surface success/failure. The `/commit`
 * reconciliation step is intentionally NOT wired here — the backend currently
 * requires `onchainLeaseId`/`nftTokenId` the frontend cannot read, so that push
 * waits on a backend-derived params/commit contract.
 *
 * Connecting the wallet (obtaining `clickRef` + `publicKey`) is the caller's
 * job — pass them in from `useICOWallet`. This hook owns only the build → sign →
 * submit → confirm state machine via `useBlockchainTransaction`.
 */
export function useLeaseAgreementOnChain(
  publicKey: string | null | undefined,
  clickRef: ICSPRClickSDK | null
) {
  const { state, execute, reset } = useBlockchainTransaction(
    publicKey ?? null,
    clickRef,
    (pk, params: CreateLeaseAgreementParamsInput) =>
      createLeaseAgreementTransaction(pk, params),
    parseLeaseAgreementError
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
