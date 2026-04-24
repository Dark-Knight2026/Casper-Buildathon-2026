import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useICOWallet } from '@/hooks/ico/useICOWallet';
import { useBackendAuth } from '@/hooks/ico/useBackendAuth';
import { useAuth } from '@/hooks/useAuth';
import { TERMINAL_PROVIDER_STATUSES } from '@/pages/auth/register/constants';

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

  const { isConnected, account, isConnecting, error: walletError, clickRef, syncActiveAccount, connect } = useICOWallet();
  const { isAuthenticated, isLoading: isSigningIn, error: authError, login } = useBackendAuth(
    clickRef,
    account?.publicKey ?? null,
  );

  // If AuthContext already has a profile — redirect immediately (e.g. revisiting /register)
  useEffect(() => {
    if (!profile || didRedirect.current) return;
    didRedirect.current = true;
    const destination = profile.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard';
    navigate(destination, { replace: true });
  }, [profile, navigate]);

  // After fresh backend auth — sync JWT to AuthContext (redirect handled by effect above)
  useEffect(() => {
    if (!isAuthenticated || didRedirect.current) return;

    const token = localStorage.getItem('leasefi_jwt');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; role: string };
      setWalletSession(token, payload.sub, payload.role);
      // redirect fires from the profile effect once AuthContext updates
    } catch {
      // malformed token
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Once wallet connects, automatically trigger backend auth
  useEffect(() => {
    if (isConnected && account && !isAuthenticated && !isSigningIn) {
      login();
    }
  // login is stable (useCallback) — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account?.publicKey]);

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
    console.log('[DEBUG 1] handleConnectProvider called with:', providerKey);
    console.log('[DEBUG 2] guards:', { hasClickRef: !!clickRef, isConnecting, connectingProvider });
    if (!clickRef || isConnecting || connectingProvider) {
      console.log('[DEBUG 3] early-return — guard blocked');
      return;
    }
    setConnectingProvider(providerKey);
    const isSocial = providerKey.startsWith('w3a-') || providerKey.startsWith('csprclick-') || providerKey === 'torus' || providerKey === 'customjwt';
    try {
      // For social providers — prefer signInWithAccount() when the account is already
      // known to CSPR.click (avoids the broken OAuth popup handoff). Fall back to
      // connect() for first-time auth and for wallet providers.
      if (isSocial) {
        const opts = await clickRef.getSignInOptions();
        console.log('[DEBUG 4a] getSignInOptions →', opts);
        const knownAccounts: Array<{ provider: string; public_key: string }> =
          (opts && (opts.accounts || opts.knownAccounts)) || [];
        console.log('[DEBUG 4a2] known accounts:', JSON.stringify(knownAccounts, null, 2));
        console.log('[DEBUG 4a3] looking for provider:', providerKey);
        const match = knownAccounts.find(a => a.provider === providerKey);
        if (match) {
          console.log('[DEBUG 4b] known account found, calling signInWithAccount →', match);
          const res = await clickRef.signInWithAccount(match as never);
          console.log('[DEBUG 5] signInWithAccount resolved:', res);
          await syncActiveAccount();
          console.log('[DEBUG 7] syncActiveAccount done');
          return;
        }
        console.log('[DEBUG 4c] no known account, falling back to connect()');
      }
      console.log('[DEBUG 4] calling clickRef.connect()...');
      const options = isSocial
        ? { chainName: import.meta.env.VITE_CASPER_NETWORK ?? 'casper-test' }
        : undefined;
      const account = await clickRef.connect(providerKey, options);
      console.log('[DEBUG 5] connect() resolved with:', account);
      if (account) await syncActiveAccount();
      console.log('[DEBUG 7] syncActiveAccount done');
    } catch (err) {
      console.error('[DEBUG X] threw:', err);
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
    clickRef,
    handleConnectProvider,
  };
}
