import { useState, useEffect, useCallback } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
import { clearCsprClickStorage } from '@/lib/csprclick';
import logger from '@/lib/logger';

export interface ICOWalletAccount {
  publicKey: string;
  accountHash: string;
  provider: string;
}

export interface ICOWalletState {
  isConnected: boolean;
  account: ICOWalletAccount | null;
  isConnecting: boolean;
  error: string | null;
}

export interface UseICOWalletReturn extends ICOWalletState {
  connect: () => void;
  disconnect: () => Promise<void>;
  syncActiveAccount: () => Promise<void>;
  clickRef: ReturnType<typeof useClickRef>;
}

/**
 * Hook for managing Casper wallet connection via CSPR.click SDK.
 *
 * Handles wallet sign-in/sign-out events, account switching, and derives
 * account hash from public key for contract interactions.
 *
 * @returns {Object} Wallet state and control functions
 * @returns {boolean} returns.isConnected - Whether wallet is connected
 * @returns {ICOWalletAccount | null} returns.account - Connected account details (publicKey, accountHash, provider)
 * @returns {boolean} returns.isConnecting - Whether connection is in progress
 * @returns {string | null} returns.error - Error message if connection failed
 * @returns {() => void} returns.connect - Function to trigger wallet sign-in
 * @returns {() => Promise<void>} returns.disconnect - Function to trigger wallet sign-out (must be awaited for full iframe cleanup)
 * @returns {Object} returns.clickRef - Direct access to CSPR.click SDK instance
 *
 * @example
 * const { isConnected, account, connect, disconnect } = useICOWallet();
 *
 * if (!isConnected) {
 *   return <button onClick={connect}>Connect Wallet</button>;
 * }
 *
 * return <span>Connected: {account?.publicKey}</span>;
 */
export function useICOWallet(): UseICOWalletReturn {
  const clickRef = useClickRef();
  const [state, setState] = useState<ICOWalletState>({
    isConnected: false,
    account: null,
    isConnecting: false,
    error: null,
  });

  // Listen to CSPR.click events
  useEffect(() => {
    if (!clickRef) return;

    // Shared unmount guard. Async event handlers (handleReady,
    // handleSocialConnected) and the mount IIFE all await
    // `getActiveAccountAsync()` before calling setState; if the component
    // unmounts mid-await, the cleanup below flips this to true so the
    // post-await setState is skipped (React would otherwise warn about a
    // state update on an unmounted component).
    let cancelled = false;

    const handleSignedIn = (evt: { account: { public_key: string; provider: string } }) => {
      const publicKey = evt.account.public_key;
      setState({
        isConnected: true,
        account: {
          publicKey,
          accountHash: deriveAccountHash(publicKey),
          provider: evt.account.provider,
        },
        isConnecting: false,
        error: null,
      });
    };

    const handleSwitchedAccount = (evt: { account: { public_key: string; provider: string } }) => {
      const publicKey = evt.account.public_key;
      setState(prev => ({
        ...prev,
        account: {
          publicKey,
          accountHash: deriveAccountHash(publicKey),
          provider: evt.account.provider,
        },
      }));
    };

    const handleSignedOut = () => {
      setState({
        isConnected: false,
        account: null,
        isConnecting: false,
        error: null,
      });
    };

    const handleDisconnected = () => {
      setState({
        isConnected: false,
        account: null,
        isConnecting: false,
        error: null,
      });
    };

    // Handle SDK ready event (important for mobile redirect flow).
    // Use the async variant so the SDK has a chance to verify the cached
    // account against accounts.cspr.click before we trust it. The sync
    // `getActiveAccount()` returns from localStorage only and will report
    // a "connected" account even after the iframe session has expired —
    // that's the state that lands the user on SDK's "Session expired"
    // modal at sign-in. If the async check returns null, the localStorage
    // entries are stale; we strip them so the SDK doesn't keep re-trying
    // the dead session on subsequent mounts.
    const handleReady = async () => {
      const activeAccount = await clickRef.getActiveAccountAsync();
      if (cancelled) return;
      if (!activeAccount) {
        clearCsprClickStorage();
        return;
      }
      const publicKey = activeAccount.public_key;
      setState({
        isConnected: true,
        account: {
          publicKey,
          accountHash: deriveAccountHash(publicKey),
          provider: activeAccount.provider,
        },
        isConnecting: false,
        error: null,
      });
    };

    // Handle modal/popup closed without completing sign-in
    const handleCancelled = () => {
      setState(prev => ({ ...prev, isConnecting: false }));
    };

    // Social providers (csprclick-w3a-google, csprclick-w3a-apple) don't fire
    // `csprclick:signed_in` and their `connect()` Promise may not resolve. They emit
    // provider-specific `...:connected` events — on those we re-read the active account.
    const handleSocialConnected = async (evt: unknown) => {
      logger.debug('[useICOWallet] social provider connected event', { evt });
      const active = await clickRef.getActiveAccountAsync();
      if (cancelled) return;
      logger.debug('[useICOWallet] active after social connect', { active });
      if (!active) return;
      setState({
        isConnected: true,
        account: {
          publicKey: active.public_key,
          accountHash: deriveAccountHash(active.public_key),
          provider: active.provider,
        },
        isConnecting: false,
        error: null,
      });
    };

    // Per official csprclick-react example: when the SDK reports an
    // unsolicited account change (e.g. user switched wallets externally),
    // restore the session with the new account via signInWithAccount.
    // Without this, the SDK and our React state can drift out of sync,
    // leading to /api/authenticate/me 401s on subsequent signMessage calls.
    // Source: https://github.com/make-software/csprclick-examples/blob/master/csprclick-react/src/App.tsx
    const handleUnsolicitedAccountChange = async (evt: { account: { provider: string; public_key: string } }) => {
      logger.debug('[useICOWallet] unsolicited account change', { evt });
      try {
        await clickRef.signInWithAccount(evt.account as never);
      } catch (e) {
        logger.error('[useICOWallet] signInWithAccount after unsolicited change failed', { error: e });
      }
    };

    clickRef.on('csprclick:signed_in', handleSignedIn);
    clickRef.on('csprclick:switched_account', handleSwitchedAccount);
    clickRef.on('csprclick:signed_out', handleSignedOut);
    clickRef.on('csprclick:disconnected', handleDisconnected);
    clickRef.on('csprclick:ready', handleReady);
    clickRef.on('csprclick:cancelled', handleCancelled);
    clickRef.on('csprclick-w3a-google:connected', handleSocialConnected);
    clickRef.on('csprclick-w3a-apple:connected', handleSocialConnected);
    clickRef.on('csprclick:unsolicited_account_change', handleUnsolicitedAccountChange);

    // Check if already connected. If getActiveAccountAsync returns null we
    // clear stale `csprclick:*` localStorage entries so the SDK doesn't keep
    // re-trying a dead session on subsequent mounts.
    // The shared `cancelled` flag (declared at the top of this useEffect)
    // guards against the unmount-during-await race.
    void (async () => {
      const activeAccount = await clickRef.getActiveAccountAsync();
      if (cancelled) return;
      if (!activeAccount) {
        clearCsprClickStorage();
        return;
      }
      const publicKey = activeAccount.public_key;
      setState({
        isConnected: true,
        account: {
          publicKey,
          accountHash: deriveAccountHash(publicKey),
          provider: activeAccount.provider,
        },
        isConnecting: false,
        error: null,
      });
    })();

    // Cleanup: remove event listeners to prevent memory leaks
    return () => {
      cancelled = true;
      clickRef.off('csprclick:signed_in', handleSignedIn);
      clickRef.off('csprclick:switched_account', handleSwitchedAccount);
      clickRef.off('csprclick:signed_out', handleSignedOut);
      clickRef.off('csprclick:disconnected', handleDisconnected);
      clickRef.off('csprclick:ready', handleReady);
      clickRef.off('csprclick:cancelled', handleCancelled);
      clickRef.off('csprclick-w3a-google:connected', handleSocialConnected);
      clickRef.off('csprclick-w3a-apple:connected', handleSocialConnected);
      clickRef.off('csprclick:unsolicited_account_change', handleUnsolicitedAccountChange);
    };
  }, [clickRef]);

  const connect = useCallback(() => {
    if (!clickRef) return;
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    try {
      clickRef.signIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open wallet connection';
      setState(prev => ({ ...prev, isConnecting: false, error: message }));
    }
  }, [clickRef]);

  const disconnect = useCallback(async () => {
    if (!clickRef) return;
    try {
      // Resolve the currently connected provider BEFORE signOut clears state.
      // disconnect() requires the provider key as its first argument.
      const active = await clickRef.getActiveAccountAsync();
      // signOut() is sync (returns void): closes the app-side SDK session.
      clickRef.signOut();
      // disconnect(provider) is the hard release of the wallet ↔
      // accounts.cspr.click iframe link. Without this the iframe cookies
      // survive and the next signIn() lands the user on SDK's
      // "Session expired" modal instead of a signing prompt. Both calls are
      // required: signOut alone is a soft logout that leaves the iframe
      // bond intact.
      if (active?.provider) {
        await clickRef.disconnect(active.provider);
      }
    } catch (error) {
      logger.error('Failed to disconnect:', error);
    }
  }, [clickRef]);

  // Social providers (csprclick-w3a-google, csprclick-w3a-apple) don't fire
  // `csprclick:signed_in` — they use provider-specific events instead. After
  // `clickRef.connect(...)` resolves we read the active account directly as a
  // fallback path. Safe to call for wallet providers too (no-op if already synced).
  const syncActiveAccount = useCallback(async () => {
    if (!clickRef) return;
    const active = await clickRef.getActiveAccountAsync();
    // Log full payload so we can see what extra fields (email, avatar, JWT, custom)
    // CSPR.click returns for each provider — useful for deciding what to forward
    // to the backend beyond public_key. logger.debug is suppressed in production
    // so this stays out of end-user consoles while remaining handy in dev tools.
    logger.debug('[useICOWallet] getActiveAccountAsync', { active });
    if (!active) return;
    setState({
      isConnected: true,
      account: {
        publicKey: active.public_key,
        accountHash: deriveAccountHash(active.public_key),
        provider: active.provider,
      },
      isConnecting: false,
      error: null,
    });
  }, [clickRef]);

  return {
    ...state,
    connect,
    disconnect,
    syncActiveAccount,
    clickRef,
  };
}
