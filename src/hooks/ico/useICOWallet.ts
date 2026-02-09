import { useState, useEffect, useCallback } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import { PublicKey } from 'casper-js-sdk';

export interface ICOWalletAccount {
  publicKey: string;
  accountHash: string;
  provider: string;
}

/**
 * Derives account hash from public key.
 * Account hash format: account-hash-<hex>
 */
function deriveAccountHash(publicKeyHex: string): string {
  try {
    const pk = PublicKey.fromHex(publicKeyHex);
    const accountHash = pk.accountHash();
    return accountHash.toPrefixedString();
  } catch (err) {
    console.warn('Failed to derive account hash:', err);
    return '';
  }
}

export interface ICOWalletState {
  isConnected: boolean;
  account: ICOWalletAccount | null;
  isConnecting: boolean;
  error: string | null;
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
export function useICOWallet() {
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

    clickRef.on('csprclick:signed_in', handleSignedIn);
    clickRef.on('csprclick:switched_account', handleSwitchedAccount);
    clickRef.on('csprclick:signed_out', handleSignedOut);
    clickRef.on('csprclick:disconnected', handleDisconnected);

    // Check if already connected
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
  }, [clickRef]);

  const connect = useCallback(() => {
    if (!clickRef) return;
    try {
      clickRef.signIn();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open wallet connection';
      setState(prev => ({ ...prev, error: message }));
    }
  }, [clickRef]);

  const disconnect = useCallback(() => {
    if (!clickRef) return;
    try {
      clickRef.signOut();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [clickRef]);

  return {
    ...state,
    connect,
    disconnect,
    clickRef,
  };
}
