/**
 * CSPR.click Service
 * Provides wallet integration and transaction signing via CSPR.click SDK
 * Note: This is a mock implementation. In production, install @make-software/csprclick-ui
 */

import { logger } from '@/utils/logger';

// Type definitions for CSPR.click SDK
export interface WalletAccount {
  publicKey: string;
  accountHash: string;
  provider: string;
}

export interface SignedDeploy {
  deploy: Record<string, unknown>;
  signature: string;
}

/**
 * CSPR.click Service Class
 * Handles wallet connectivity and transaction signing
 */
export class CSPRClickService {
  private connectedAccount: WalletAccount | null = null;
  private accountChangeCallbacks: Array<(account: WalletAccount | null) => void> = [];

  constructor() {
    // Initialize CSPR.click SDK
    // In production: this.clickUI = new ClickUI({ ... })
  }

  /**
   * Connect wallet
   */
  async connect(): Promise<WalletAccount> {
    try {
      // Mock implementation - replace with actual CSPR.click SDK
      // const account = await this.clickUI.connect();
      
      // For development, simulate wallet connection
      const mockAccount: WalletAccount = {
        publicKey: '0x' + Math.random().toString(16).substring(2, 66),
        accountHash: 'account-hash-' + Math.random().toString(36).substring(7),
        provider: 'casper-wallet',
      };

      this.connectedAccount = mockAccount;
      this.notifyAccountChange(mockAccount);

      // Store in localStorage for persistence
      localStorage.setItem('cspr_wallet_connected', JSON.stringify(mockAccount));

      return mockAccount;
    } catch (error) {
      logger.error('Wallet connection failed:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      // await this.clickUI.disconnect();

      this.connectedAccount = null;
      this.notifyAccountChange(null);

      localStorage.removeItem('cspr_wallet_connected');
    } catch (error) {
      logger.error('Wallet disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(deploy: Record<string, unknown>): Promise<SignedDeploy> {
    try {
      // Use getConnectedAccount() to restore from localStorage if needed
      const account = this.getConnectedAccount();
      if (!account) {
        throw new Error('No wallet connected');
      }

      // const signedDeploy = await this.clickUI.sign(deploy);

      const signedDeploy: SignedDeploy = {
        deploy,
        signature: '0x' + Math.random().toString(16).substring(2, 130),
      };

      return signedDeploy;
    } catch (error) {
      logger.error('Transaction signing failed:', error);
      throw new Error('Failed to sign transaction');
    }
  }

  /**
   * Social login (Google, Apple)
   */
  async socialLogin(provider: 'google' | 'apple'): Promise<WalletAccount> {
    try {
      // const account = await this.clickUI.socialLogin(provider);

      const mockAccount: WalletAccount = {
        publicKey: '0x' + Math.random().toString(16).substring(2, 66),
        accountHash: 'account-hash-' + Math.random().toString(36).substring(7),
        provider: `social-${provider}`,
      };

      this.connectedAccount = mockAccount;
      this.notifyAccountChange(mockAccount);

      localStorage.setItem('cspr_wallet_connected', JSON.stringify(mockAccount));

      return mockAccount;
    } catch (error) {
      logger.error('Social login failed:', error);
      throw new Error(`Failed to login with ${provider}`);
    }
  }

  /**
   * Get connected account
   */
  getConnectedAccount(): WalletAccount | null {
    // Try to restore from localStorage
    if (!this.connectedAccount) {
      const stored = localStorage.getItem('cspr_wallet_connected');
      if (stored) {
        try {
          this.connectedAccount = JSON.parse(stored) as WalletAccount;
        } catch (error) {
          logger.error('Failed to parse stored wallet:', error);
        }
      }
    }

    return this.connectedAccount;
  }

  /**
   * Switch account
   */
  async switchAccount(): Promise<WalletAccount> {
    try {
      // const account = await this.clickUI.switchAccount();

      const mockAccount: WalletAccount = {
        publicKey: '0x' + Math.random().toString(16).substring(2, 66),
        accountHash: 'account-hash-' + Math.random().toString(36).substring(7),
        provider: 'casper-wallet',
      };

      this.connectedAccount = mockAccount;
      this.notifyAccountChange(mockAccount);

      localStorage.setItem('cspr_wallet_connected', JSON.stringify(mockAccount));

      return mockAccount;
    } catch (error) {
      logger.error('Account switch failed:', error);
      throw new Error('Failed to switch account');
    }
  }

  /**
   * Open fiat on-ramp
   */
  async openFiatOnRamp(): Promise<void> {
    try {
      // await this.clickUI.openFiatOnRamp();
      logger.debug('Opening fiat on-ramp...');
      window.open('https://buy.cspr.network', '_blank');
    } catch (error) {
      logger.error('Failed to open fiat on-ramp:', error);
      throw error;
    }
  }

  /**
   * Register account change callback
   */
  onAccountChange(callback: (account: WalletAccount | null) => void): () => void {
    this.accountChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.accountChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.accountChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all callbacks of account change
   */
  private notifyAccountChange(account: WalletAccount | null): void {
    this.accountChangeCallbacks.forEach(callback => {
      try {
        callback(account);
      } catch (error) {
        logger.error('Error in account change callback:', error);
      }
    });
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    // Use getConnectedAccount() to restore from localStorage if needed
    return this.getConnectedAccount() !== null;
  }
}

// Export singleton instance
export const csprClickService = new CSPRClickService();