import { useState, useEffect, useCallback } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';

export interface ICOWalletAccount {
  publicKey: string;
  provider: string;
}

export interface ICOWalletState {
  isConnected: boolean;
  account: ICOWalletAccount | null;
  isConnecting: boolean;
  error: string | null;
}

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
      setState({
        isConnected: true,
        account: {
          publicKey: evt.account.public_key,
          provider: evt.account.provider,
        },
        isConnecting: false,
        error: null,
      });
    };

    const handleSwitchedAccount = (evt: { account: { public_key: string; provider: string } }) => {
      setState(prev => ({
        ...prev,
        account: {
          publicKey: evt.account.public_key,
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
      setState({
        isConnected: true,
        account: {
          publicKey: activeAccount.public_key,
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
