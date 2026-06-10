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
  const { profile, setSession } = useAuth();
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
    setSession(user);
  // setSession is stable (useCallback); only re-run when login produces a new user.
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
      // Always go through a fresh OAuth flow via connect(). We previously had
      // a signInWithAccount shortcut for social providers when the SDK already
      // knew the account, but it had two problems:
      //   1. It silently fails when the iframe session on accounts.cspr.click
      //      has expired — the Promise resolves but no live session exists,
      //      and the SDK shows its own "Session expired" modal at signMessage.
      //   2. The failed attempt appears to poison the SDK's iframe state in a
      //      way that subsequent connect() calls can't recover from (verified
      //      experimentally — same OAuth flow worked in incognito where the
      //      shortcut was never attempted).
      // Login.tsx / Register.tsx already call signOut() + clear `csprclick:*`
      // localStorage on mount, so the SDK enters every Login flow in an
      // incognito-equivalent state. selectAccount: true forces the Google/Apple
      // picker so multi-account users can switch.
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
    } finally {
      // Always clear the per-provider connecting state — including the silent
      // null-resolve path where connect() returns undefined without firing
      // `csprclick:cancelled`. Without this, the wallet buttons stay disabled
      // until a page reload.
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
