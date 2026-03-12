import { useState, useCallback } from 'react';
import type { ICSPRClickSDK } from '@make-software/csprclick-core-types';
import { getNonce, loginWithSignature, applyToken } from '@/services/ico/backendAuthService';
import { logger } from '@/utils/logger';

const TOKEN_KEY = 'leasefi_jwt';

function loadStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) applyToken(token);
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
      console.log('Signature result:', result);

      if (!result || result.cancelled || !result.signatureHex) {
        throw new Error('Message signing was cancelled');
      }

      // 3. Login with signature → get JWT
      const { token } = await loginWithSignature(publicKey, result.signatureHex);

      // 4. Store and apply token
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
