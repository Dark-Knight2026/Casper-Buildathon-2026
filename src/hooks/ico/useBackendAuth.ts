import { useState, useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import { getNonce, loginWithSignature, applyToken } from '@/services/ico';
import { logger } from '@/utils/logger';

const TOKEN_KEY = 'leasefi_jwt';

function loadStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }

  applyToken(token);
  return token;
}

export function useBackendAuth(
  clickRef: ICSPRClickSDK | null,
  publicKey: string | null | undefined,
) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!loadStoredToken());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // 3. Login with signature → get JWT
      const { token } = await loginWithSignature(publicKey, result.signatureHex);

      // 4. Store and apply token
      // SECURITY RISK (accepted, planned remediation): JWT is stored in localStorage,
      // which is readable by any JavaScript on the page (XSS, browser extensions).
      // The expiry check in loadStoredToken() limits the exposure window but does not
      // eliminate the risk. Planned fix: migrate to HttpOnly + Secure + SameSite=Strict
      // cookies set by the backend (/api/v1/auth/login) and remove the token from the
      // JSON response body. Target date: Q2 2026.
      // Tracked in: https://github.com/obox-systems/2025_anthony_leasefi_frontend/issues/13
      localStorage.setItem(TOKEN_KEY, token);
      applyToken(token);
      setIsAuthenticated(true);

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
    localStorage.removeItem(TOKEN_KEY);
    applyToken(null);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoading, error, login, logout };
}
