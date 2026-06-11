import { useCallback, useState } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';

import { useAuth } from '@/hooks/useAuth';
import { getNonce } from '@/services/backendAuthService';
import { linkWallet } from '@/services/userProfileService';
import { ApiError } from '@/lib/api-client';
import { logger } from '@/utils/logger';

/**
 * Links a Casper wallet to the already-authenticated account.
 *
 * This is the wallet-as-a-separate-feature counterpart to the (removed)
 * wallet-first login: the user is already signed in via email/password, and
 * here they attach a wallet they control so it can later sign on-chain. The
 * flow mirrors the wallet-login ownership proof:
 *   1. fetch a nonce for the connected public key
 *   2. sign the nonce message with the wallet (CSPR.click `signMessage`)
 *   3. POST the signature to `/users/me/wallet`
 *   4. refresh the profile so `walletAddress` (and later `onchainUserId`) show up
 *
 * Connecting the wallet (obtaining `clickRef` + `publicKey`) is the caller's
 * job — pass them in from `useICOWallet`. This hook owns only the
 * nonce → sign → link → refresh step.
 */
export function useLinkWallet() {
  const { refreshProfile } = useAuth();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = useCallback(
    async (
      clickRef: ICSPRClickSDK | null,
      publicKey: string | null | undefined,
      // `refresh: false` defers the profile refresh to the caller — used when an
      // on-chain registration step follows immediately, so the profile (and the
      // UI that keys off `walletAddress`) only updates once the whole flow ends.
      opts?: { refresh?: boolean },
    ): Promise<boolean> => {
      if (!clickRef || !publicKey) return false;

      setLinking(true);
      setError(null);
      try {
        // 1. Nonce challenge for this public key.
        const { message } = await getNonce(publicKey);

        // 2. Sign it with the connected wallet.
        const result = await clickRef.signMessage(message, publicKey);
        if (!result || result.cancelled || !result.signatureHex) {
          setError('Signing was cancelled.');
          return false;
        }

        // 3. Prefix the signature with its algorithm byte (01 = Ed25519,
        //    02 = Secp256k1), matching the wallet-login path — the backend's
        //    `Signature::from_hex` requires it.
        const prefix = publicKey.startsWith('02') ? '02' : '01';
        const signature = result.signatureHex.startsWith(prefix)
          ? result.signatureHex
          : `${prefix}${result.signatureHex}`;

        // 4. Bind the wallet, then refresh so `walletAddress` propagates
        //    (unless the caller defers it to run an on-chain step first).
        await linkWallet(publicKey, signature);
        if (opts?.refresh !== false) {
          await refreshProfile();
        }
        logger.debug('[useLinkWallet] wallet linked');
        return true;
      } catch (err) {
        setError(mapLinkError(err));
        logger.error('[useLinkWallet] link failed:', err);
        return false;
      } finally {
        setLinking(false);
      }
    },
    [refreshProfile],
  );

  return { link, linking, error, clearError: () => setError(null) };
}

/**
 * Maps a wallet-link failure to user-facing copy.
 *
 *   409 — the wallet is already bound (to this or another account)
 *   401 — the signature did not prove ownership
 */
function mapLinkError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 409) {
      return 'This wallet is already linked to an account.';
    }
    if (err.statusCode === 401) {
      return "Couldn't verify wallet ownership. Please try again.";
    }
    if (err.statusCode === 429) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
  }
  return 'Could not link the wallet. Please try again.';
}
