import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useBackendAuth } from '@/hooks/ico/useBackendAuth';
import { useAuth } from '@/hooks/useAuth';
import { TERMINAL_PROVIDER_STATUSES } from '@/pages/auth/register/constants';
import { getDashboardRoute } from '@/types/user';
import logger from '@/lib/logger';

/**
 * Combines wallet connection + backend auth + post-auth redirect into one hook.
 * Used by Register and Login pages.
 *
 * Handles:
 *  - per-provider connecting state with cancel support
 *  - SDK cancellation events (csprclick:cancelled, provider-status-update)
 *  - auto-login once wallet connects
 *  - JWT decode → AuthContext sync → role-based redirect
 */
export function useWalletConnect() {
  const navigate = useNavigate();
  const { profile, setWalletSession } = useAuth();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const didRedirect = useRef(false);

  const { isConnected, account, isConnecting, error: walletError, clickRef, syncActiveAccount, connect, disconnect } = useICOWallet();
  const { user, isAuthenticated, isLoading: isSigningIn, error: authError, login } = useBackendAuth(
    clickRef,
    account?.publicKey ?? null,
  );

  // If AuthContext already has a profile — redirect immediately (e.g. revisiting /register)
  useEffect(() => {
    if (!profile || didRedirect.current) return;
    didRedirect.current = true;
    navigate(getDashboardRoute(profile.role), { replace: true });
  }, [profile, navigate]);

  // After fresh backend auth — copy the server user into AuthContext.
  // Tokens live in HttpOnly cookies; only the profile object travels through JS.
  useEffect(() => {
    if (!user || didRedirect.current) return;
    setWalletSession(user);
  // setWalletSession is stable (useCallback); only re-run when login produces a new user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Note: we intentionally do NOT auto-call login() here. The CSPR.click SDK
  // restores the previous session's `connected` state on init, so visiting
  // /auth/login after a Sign Out would otherwise auto-trigger a signMessage
  // popup before the user has clicked anything. Login.tsx and Register.tsx
  // expose an explicit "Sign in with connected wallet" button which calls
  // login() — that's the only path that should fire signMessage.

  // Reset connectingProvider on modal close / rejection.
  // Each provider signals cancellation differently:
  //   Casper Wallet (iframe) → 'csprclick:cancelled'
  //   MetaMask Snap (own popup) → 'csprclick:provider-status-update' status: 'rejected-by-user'
  //   Ledger → 'csprclick:provider-status-update' status: 'transport-open-user-cancelled'
  useEffect(() => {
    if (!clickRef) return;

    const reset = () => setConnectingProvider(null);
    const handleProviderStatus = (evt: { status: string }) => {
      if (TERMINAL_PROVIDER_STATUSES.has(evt.status)) reset();
    };

    clickRef.on('csprclick:cancelled', reset);
    clickRef.on('csprclick:disconnected', reset);
    clickRef.on('csprclick:provider-status-update', handleProviderStatus);

    return () => {
      clickRef.off('csprclick:cancelled', reset);
      clickRef.off('csprclick:disconnected', reset);
      clickRef.off('csprclick:provider-status-update', handleProviderStatus);
    };
  }, [clickRef]);

  const handleConnectProvider = useCallback(async (providerKey: string) => {
    if (!clickRef || isConnecting || connectingProvider) return;
    setConnectingProvider(providerKey);
    const isSocial = providerKey.startsWith('w3a-') || providerKey.startsWith('csprclick-') || providerKey === 'torus' || providerKey === 'customjwt';
    try {
      // For social providers — prefer signInWithAccount() when the account is already
      // known to CSPR.click (avoids the broken OAuth popup handoff). Fall back to
      // connect() for first-time auth and for wallet providers.
      if (isSocial) {
        const opts = await clickRef.getSignInOptions();
        const knownAccounts: Array<{ provider: string; public_key: string }> =
          (opts && (opts.accounts || opts.knownAccounts)) || [];
        const match = knownAccounts.find(a => a.provider === providerKey);
        if (match) {
          await clickRef.signInWithAccount(match as never);
          await syncActiveAccount();
          return;
        }
      }
      // selectAccount=true forces CSPR.click to show the Google/social
      // account picker instead of silently re-using the cached OAuth token.
      // Without this, a user who logged in with account A can never sign
      // in with account B from the same browser without manually clearing
      // cookies on accounts.cspr.click. The trade-off: existing users
      // with a single account see one extra "Continue as …" tap on every
      // login — small UX cost in exchange for working multi-account.
      const options = isSocial
        ? {
            chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test',
            selectAccount: true,
          }
        : undefined;
      const account = await clickRef.connect(providerKey, options);
      if (account) await syncActiveAccount();
    } catch (err) {
      logger.error('handleConnectProvider failed:', err);
      setConnectingProvider(null);
    }
  }, [clickRef, isConnecting, connectingProvider, syncActiveAccount]);

  return {
    isConnected,
    account,
    isAuthenticated,
    connectingProvider,
    setConnectingProvider,
    error: walletError ?? authError,
    isLoading: isConnecting || isSigningIn || connectingProvider !== null,
    isConnecting,
    isSigningIn,
    login,
    connect,
    disconnect,
    clickRef,
    handleConnectProvider,
  };
}
