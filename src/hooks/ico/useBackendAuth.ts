import { useState, useCallback, useEffect, useRef } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import {
  getNonce,
  loginWithSignature,
  logoutSession,
  type ServerUserInfo,
} from '@/services/ico';
import { logger } from '@/utils/logger';

/**
 * Wallet sign-in against the LeaseFi backend.
 *
 * Tokens are delivered as HttpOnly cookies (`access_token`, `refresh_token`)
 * by the backend at `/auth/login` and refreshed at `/auth/refresh`. The hook
 * exposes only the resulting `user` object; the cookies travel automatically
 * on subsequent requests via `credentials: 'include'`.
 */
export function useBackendAuth(
  clickRef: ICSPRClickSDK | null,
  publicKey: string | null | undefined,
) {
  const [user, setUser] = useState<ServerUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevPublicKeyRef = useRef(publicKey);

  const login = useCallback(async () => {
    if (!clickRef || !publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Get nonce
      const { message } = await getNonce(publicKey);

      // 2. Sign message with Casper wallet
      const result = await clickRef.signMessage(message, publicKey);
      logger.debug('[useBackendAuth] Signature received');

      if (!result || result.cancelled || !result.signatureHex) {
        throw new Error('Message signing was cancelled');
      }

      // 3. Exchange signature for an authenticated session. The backend sets
      //    HttpOnly auth cookies; the body returns only the user profile.
      const { user: serverUser } = await loginWithSignature(publicKey, result.signatureHex);
      setUser(serverUser);

      logger.debug('[useBackendAuth] Login successful');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      logger.error('[useBackendAuth] Login failed:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [clickRef, publicKey]);

  const logout = useCallback(() => {
    setUser(null);
    void logoutSession();
  }, []);

  useEffect(() => {
    const prev = prevPublicKeyRef.current;
    prevPublicKeyRef.current = publicKey;

    // Logout when wallet disconnects or switches to a different account.
    // Prevents the cookie session from Account A from being implicitly
    // associated with Account B in the UI.
    if (prev && prev !== publicKey) {
      logout();
    }
  }, [publicKey, logout]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    logout,
  };
}
