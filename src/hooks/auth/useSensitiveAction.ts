import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReauthGate, type ReauthState } from './useReauthGate';

export interface UseSensitiveActionReturn {
  /**
   * Runs `call` through `useReauthGate`. On success — when the backend has
   * cleared cookies as a side-effect (role switch is the canonical case) —
   * wipes the local AuthContext, strips CSPR.click localStorage keys, and
   * redirects to `/auth/login`. The original return value is still handed
   * back so callers can read fields off the server response before the
   * redirect mounts the next page.
   */
  runAndReauth: <T>(call: () => Promise<T>) => Promise<T>;
  state: ReauthState;
  reset: () => void;
}

/**
 * Wrapper around `useReauthGate` for endpoints that invalidate the current
 * session on success (`PATCH /users/me/role` today; new ones will land here).
 *
 * Two responsibilities the bare gate does not own:
 *   1. Post-200 local cleanup. The backend clears cookies server-side; we
 *      mirror that so the next request does not 401 mid-flow and so the
 *      AuthContext session marker does not desync.
 *   2. CSPR.click localStorage strip — same pattern as `handleResetConnection`
 *      in Login/Register: leaving `csprclick:*` keys on disk causes the SDK
 *      to re-validate a dead account on the next mount and loop into its
 *      "session expired" modal.
 */
export function useSensitiveAction(): UseSensitiveActionReturn {
  const { runWithReauth, state, reset } = useReauthGate();
  const { walletSignOut } = useAuth();
  const navigate = useNavigate();

  const runAndReauth = useCallback(
    async <T>(call: () => Promise<T>): Promise<T> => {
      const result = await runWithReauth(call);
      walletSignOut();
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('csprclick:')) localStorage.removeItem(key);
        });
      } catch {
        // localStorage may be disabled (private mode, embedded webview).
      }
      navigate('/auth/login', { replace: true });
      return result;
    },
    [runWithReauth, walletSignOut, navigate],
  );

  return { runAndReauth, state, reset };
}
