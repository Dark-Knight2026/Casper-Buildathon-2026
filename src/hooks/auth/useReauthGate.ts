import { useCallback, useState } from 'react';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { getNonce, loginWithSignature } from '@/services/backendAuthService';
import { ApiError } from '@/lib/api-client';
import { ProfileApiErrorCode } from '@/lib/api-errors';
import { logger } from '@/utils/logger';

/**
 * State machine for the reauthentication round-trip.
 *
 * `awaiting-signature` is the only state that should drive a UI prompt
 * ("Confirm with your wallet to continue"); the others are short-lived and
 * mostly useful for disabling the originating control until the call settles.
 */
export type ReauthState =
  | { status: 'idle' }
  | { status: 'awaiting-signature' }
  | { status: 'replaying' }
  | { status: 'error'; reason: 'cancelled' | 'no-wallet' | 'login-failed' | 'still-blocked' };

export interface UseReauthGate {
  /**
   * Runs `call` once. If it throws `ApiError` with
   * `code === 'reauthentication_required'`, prompts the wallet for a fresh
   * signature, exchanges it for a new access cookie, and replays `call`
   * exactly once. Any other error — and any error from the replay — is
   * re-thrown unchanged so callers can apply their own handling on top.
   */
  runWithReauth: <T>(call: () => Promise<T>) => Promise<T>;
  state: ReauthState;
  /** Manual reset for callers that want to clear an `error` state on dismiss. */
  reset: () => void;
}

function isReauthRequired(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === ProfileApiErrorCode.ReauthenticationRequired;
}

export function useReauthGate(): UseReauthGate {
  const { clickRef, account } = useICOWallet();
  const [state, setState] = useState<ReauthState>({ status: 'idle' });

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  const runWithReauth = useCallback(
    async <T>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (err) {
        if (!isReauthRequired(err)) {
          throw err;
        }

        const publicKey = account?.publicKey ?? null;
        if (!clickRef || !publicKey) {
          // The original call required a fresh signature, but the wallet
          // session in JS-space isn't available to produce one. Surface the
          // 403 so the page-level handler can route to the login flow
          // (clearing the stale session marker on the way).
          //
          // SCOPE DECISION (MVP, 2026-05-27): reauthentication is wallet-only.
          // CSPR.click provisions a wallet for every user (including social
          // Google / Apple login) during sign-up, so "no-wallet" here means
          // the in-memory wallet session went stale after a page restore —
          // not that the user is permanently wallet-less. Routing to the
          // login flow rehydrates `clickRef` + `account` on the way back.
          // Adding an email/password reauth branch (POST /auth/reauthenticate)
          // is deferred — no BE endpoint, and the wallet-rehydration path
          // covers the only first-class auth method we ship in MVP.
          // Consumers surface this via the per-reason copy table (see
          // RoleSwitchDialog.tsx — `'no-wallet': "Your wallet session is not
          // available. Reconnect and try again."`).
          setState({ status: 'error', reason: 'no-wallet' });
          throw err;
        }

        setState({ status: 'awaiting-signature' });

        let signatureHex: string;
        try {
          const { message } = await getNonce(publicKey);
          const result = await clickRef.signMessage(message, publicKey);
          if (!result || result.cancelled || !result.signatureHex) {
            setState({ status: 'error', reason: 'cancelled' });
            throw err; // surface the original 403, not a synthetic cancel error
          }
          signatureHex = result.signatureHex;
        } catch (signErr) {
          if (signErr === err) throw err;
          logger.error('[useReauthGate] signMessage failed:', signErr);
          setState({ status: 'error', reason: 'cancelled' });
          throw err;
        }

        try {
          await loginWithSignature(publicKey, signatureHex);
        } catch (loginErr) {
          logger.error('[useReauthGate] re-login failed:', loginErr);
          setState({ status: 'error', reason: 'login-failed' });
          throw err;
        }

        setState({ status: 'replaying' });
        try {
          const replayed = await call();
          setState({ status: 'idle' });
          return replayed;
        } catch (replayErr) {
          // A second reauth-required after a successful re-login means the
          // server clock or session-binding is fighting us. Don't loop —
          // surface it so the user can sign in again from scratch.
          if (isReauthRequired(replayErr)) {
            setState({ status: 'error', reason: 'still-blocked' });
          } else {
            setState({ status: 'idle' });
          }
          throw replayErr;
        }
      }
    },
    [clickRef, account?.publicKey],
  );

  return { runWithReauth, state, reset };
}
