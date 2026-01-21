/**
 * WalletConnect Component
 * Provides wallet connection UI with multiple provider options
 */

import React from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, RefreshCw, ExternalLink, DollarSign } from 'lucide-react';
import { useCSPRPrice } from '@/hooks/useCSPRPrice';

export function WalletConnect() {
  const {
    isConnected,
    account,
    isConnecting,
    balance,
    csprName,
    connect,
    disconnect,
    socialLogin,
    openFiatOnRamp,
    refreshBalance,
  } = useWallet();

  const { convertToUSD } = useCSPRPrice();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      await socialLogin(provider);
    } catch (error) {
      console.error('Social login failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Disconnection failed:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isConnected && account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {csprName || formatAddress(account.publicKey)}
              </span>
              {balance !== null && (
                <span className="text-xs text-muted-foreground">
                  {formatBalance(balance)} CSPR (${formatBalance(convertToUSD(balance))})
                </span>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">Connected Wallet</p>
            <p className="text-xs text-muted-foreground">{account.provider}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={refreshBalance} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Balance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openFiatOnRamp} className="gap-2">
            <DollarSign className="h-4 w-4" />
            Buy CSPR
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.open(`https://cspr.live/account/${account.accountHash}`, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isConnecting} className="gap-2">
          <Wallet className="h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Connect Your Wallet</p>
          <p className="text-xs text-muted-foreground">Choose a wallet provider</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleConnect} className="gap-2">
          <Wallet className="h-4 w-4" />
          Casper Wallet
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Or continue with</p>
        </div>
        <DropdownMenuItem onClick={() => handleSocialLogin('google')} className="gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSocialLogin('apple')} className="gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openFiatOnRamp} className="gap-2">
          <DollarSign className="h-4 w-4" />
          Don't have CSPR? Buy Now
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}