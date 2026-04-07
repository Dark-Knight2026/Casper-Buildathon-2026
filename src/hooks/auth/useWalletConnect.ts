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

  const { isConnected, account, isConnecting, error: walletError, clickRef } = useICOWallet();
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
    if (!clickRef || isConnecting || connectingProvider) return;
    setConnectingProvider(providerKey);
    try {
      await clickRef.connect(providerKey);
    } catch {
      setConnectingProvider(null);
    }
    // Success → csprclick:signed_in fires → useICOWallet updates → auto-login effect runs
  }, [clickRef, isConnecting, connectingProvider]);

  return {
    isConnected,
    account,
    isAuthenticated,
    connectingProvider,
    setConnectingProvider,
    error: walletError ?? authError,
    isLoading: isConnecting || isSigningIn || connectingProvider !== null,
    isSigningIn,
    login,
    handleConnectProvider,
  };
}
