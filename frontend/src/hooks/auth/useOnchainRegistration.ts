import { useCallback, useState } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';

import { useBlockchainTransaction } from '@/hooks/ico/useBlockchainTransaction';
import { getOnchainRegistration } from '@/services/userProfileService';
import {
  createCreateUserTransaction,
  parseCreateUserError,
  isOnchainRegistrationEnabled,
} from '@/services/onchainRegistrationService';
import { ApiError } from '@/lib/api-client';
import logger from '@/lib/logger';

export type OnchainPhase = 'idle' | 'preparing' | 'submitting' | 'done' | 'error';

/**
 * Registers the linked wallet on-chain via `UserRegistry::create_user`
 * (TEMPORARY hackathon bridge — see onchainRegistrationService).
 *
 * Flow: `GET /users/me/onchain-registration` for the two args the frontend
 * can't derive (`identity_hash`, `role_flags`), then sign + submit the deploy
 * from the user's wallet via CSPR.click. The contract-assigned `onchain_user_id`
 * is written back by the indexer on the `UserCreated` event, so callers refresh
 * the profile after `phase === 'done'` to pick it up (it may lag the deploy).
 */
export function useOnchainRegistration(
  publicKey: string | null | undefined,
  clickRef: ICSPRClickSDK | null,
) {
  const [phase, setPhase] = useState<OnchainPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const { state, execute, reset: resetTx } = useBlockchainTransaction(
    publicKey ?? null,
    clickRef,
    createCreateUserTransaction,
    parseCreateUserError,
    {
      onSuccess: () => setPhase('done'),
      onError: (err) => {
        setMessage(err);
        setPhase('error');
      },
    },
  );

  const register = useCallback(async () => {
    if (!isOnchainRegistrationEnabled) return;
    setMessage(null);
    setPhase('preparing');

    let registration;
    try {
      registration = await getOnchainRegistration();
    } catch (err) {
      logger.error('[useOnchainRegistration] getOnchainRegistration failed', err);
      setMessage(
        err instanceof ApiError && err.statusCode === 409
          ? 'Link a wallet before registering on-chain.'
          : 'Could not start on-chain registration. Please try again.',
      );
      setPhase('error');
      return;
    }

    // execute drives state.step (signing → pending) and fires onSuccess/onError,
    // which move `phase` to done/error.
    setPhase('submitting');
    await execute(registration.identity_hash, registration.role_flags);
  }, [execute]);

  const reset = useCallback(() => {
    resetTx();
    setPhase('idle');
    setMessage(null);
  }, [resetTx]);

  return {
    register,
    reset,
    /** High-level phase for the caller's own state machine. */
    phase,
    /** Granular deploy step from the underlying tx hook (signing/pending/…). */
    txStep: state.step,
    /** User-facing error message, if any. */
    message: message ?? state.error,
  };
}
