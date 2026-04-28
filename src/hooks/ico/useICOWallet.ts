import { useState, useEffect, useCallback } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import { deriveAccountHash } from '@/lib/blockchain/accountUtils';
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
  disconnect: () => void;
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
 * @returns {() => void} returns.disconnect - Function to trigger wallet sign-out
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

    // Handle SDK ready event (important for mobile redirect flow)
    const handleReady = () => {
      const activeAccount = clickRef.getActiveAccount();
      if (activeAccount) {
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
      }
    };

    // Handle modal/popup closed without completing sign-in
    const handleCancelled = () => {
      setState(prev => ({ ...prev, isConnecting: false }));
    };

    // Social providers (csprclick-w3a-google, csprclick-w3a-apple) don't fire
    // `csprclick:signed_in` and their `connect()` Promise may not resolve. They emit
    // provider-specific `...:connected` events — on those we re-read the active account.
    const handleSocialConnected = async (evt: unknown) => {
      console.log('[useICOWallet] social provider connected event:', evt);
      const active = await clickRef.getActiveAccountAsync();
      console.log('[useICOWallet] active after social connect:', active);
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

    clickRef.on('csprclick:signed_in', handleSignedIn);
    clickRef.on('csprclick:switched_account', handleSwitchedAccount);
    clickRef.on('csprclick:signed_out', handleSignedOut);
    clickRef.on('csprclick:disconnected', handleDisconnected);
    clickRef.on('csprclick:ready', handleReady);
    clickRef.on('csprclick:cancelled', handleCancelled);
    clickRef.on('csprclick-w3a-google:connected', handleSocialConnected);
    clickRef.on('csprclick-w3a-apple:connected', handleSocialConnected);

    // Check if already connected (sync check)
    const activeAccount = clickRef.getActiveAccount();
    if (activeAccount) {
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
    }

    // Cleanup: remove event listeners to prevent memory leaks
    return () => {
      clickRef.off('csprclick:signed_in', handleSignedIn);
      clickRef.off('csprclick:switched_account', handleSwitchedAccount);
      clickRef.off('csprclick:signed_out', handleSignedOut);
      clickRef.off('csprclick:disconnected', handleDisconnected);
      clickRef.off('csprclick:ready', handleReady);
      clickRef.off('csprclick:cancelled', handleCancelled);
      clickRef.off('csprclick-w3a-google:connected', handleSocialConnected);
      clickRef.off('csprclick-w3a-apple:connected', handleSocialConnected);
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

  const disconnect = useCallback(() => {
    if (!clickRef) return;
    try {
      clickRef.signOut();
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
    // to the backend beyond public_key. Using console.info so devtools shows the
    // object as an expandable tree (logger.info stringifies and loses structure).
    console.info('[useICOWallet] getActiveAccountAsync →', active);
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
