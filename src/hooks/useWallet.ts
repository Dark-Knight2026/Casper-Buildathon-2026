/**
 * useWallet Hook
 * Manages wallet connection state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { csprClickService, WalletAccount } from '@/lib/blockchain/csprClickService';
import { csprNameService } from '@/lib/blockchain/csprNameService';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';

export interface WalletState {
  isConnected: boolean;
  account: WalletAccount | null;
  isConnecting: boolean;
  error: string | null;
  balance: number | null;
  csprName: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    account: null,
    isConnecting: false,
    error: null,
    balance: null,
    csprName: null,
  });

  const loadAccountDetails = useCallback(async (account: WalletAccount) => {
    try {
      // Load balance
      const balance = await csprCloudService.getAccountBalance(account.accountHash);
      
      // Load CSPR.name
      const csprName = await csprNameService.reverseResolve(account.accountHash);

      setState(prev => ({
        ...prev,
        balance,
        csprName,
      }));
    } catch (error) {
      console.error('Failed to load account details:', error);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    const connectedAccount = csprClickService.getConnectedAccount();
    if (connectedAccount) {
      setState(prev => ({
        ...prev,
        isConnected: true,
        account: connectedAccount,
      }));
      await loadAccountDetails(connectedAccount);
    }
  }, [loadAccountDetails]);

  // Check for existing connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Set up account change listener
  useEffect(() => {
    const unsubscribe = csprClickService.onAccountChange((account) => {
      if (account) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          account,
        }));
        loadAccountDetails(account);
      } else {
        setState({
          isConnected: false,
          account: null,
          isConnecting: false,
          error: null,
          balance: null,
          csprName: null,
        });
      }
    });

    return unsubscribe;
  }, [loadAccountDetails]);

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const account = await csprClickService.connect();
      setState(prev => ({
        ...prev,
        isConnected: true,
        account,
        isConnecting: false,
      }));
      
      await loadAccountDetails(account);
      
      return account;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [loadAccountDetails]);

  const disconnect = useCallback(async () => {
    try {
      await csprClickService.disconnect();
      setState({
        isConnected: false,
        account: null,
        isConnecting: false,
        error: null,
        balance: null,
        csprName: null,
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      throw error;
    }
  }, []);

  const socialLogin = useCallback(async (provider: 'google' | 'apple') => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      const account = await csprClickService.socialLogin(provider);
      setState(prev => ({
        ...prev,
        isConnected: true,
        account,
        isConnecting: false,
      }));
      
      await loadAccountDetails(account);
      
      return account;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to login with ${provider}`;
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [loadAccountDetails]);

  const switchAccount = useCallback(async () => {
    try {
      const account = await csprClickService.switchAccount();
      setState(prev => ({
        ...prev,
        account,
      }));
      
      await loadAccountDetails(account);
      
      return account;
    } catch (error) {
      console.error('Failed to switch account:', error);
      throw error;
    }
  }, [loadAccountDetails]);

  const openFiatOnRamp = useCallback(async () => {
    try {
      await csprClickService.openFiatOnRamp();
    } catch (error) {
      console.error('Failed to open fiat on-ramp:', error);
      throw error;
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.account) return;
    
    try {
      const balance = await csprCloudService.getAccountBalance(state.account.accountHash);
      setState(prev => ({ ...prev, balance }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [state.account]);

  return {
    ...state,
    connect,
    disconnect,
    socialLogin,
    switchAccount,
    openFiatOnRamp,
    refreshBalance,
  };
}