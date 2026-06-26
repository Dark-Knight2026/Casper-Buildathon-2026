/**
 * useBlockchainTransaction Hook
 * Manages blockchain transaction state and operations
 */

import { useState, useCallback } from 'react';
import { csprClickService } from '@/lib/blockchain/csprClickService';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';
import type { TransactionType } from '@/types/blockchain';

export interface TransactionState {
  isProcessing: boolean;
  txHash: string | null;
  status: 'idle' | 'signing' | 'submitting' | 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  error: string | null;
}

export interface TransactionRequest {
  type: TransactionType;
  from: string;
  to?: string;
  amount?: number;
  contractAddress?: string;
  parameters?: Record<string, unknown>;
}

export function useBlockchainTransaction() {
  const [state, setState] = useState<TransactionState>({
    isProcessing: false,
    txHash: null,
    status: 'idle',
    confirmations: 0,
    error: null,
  });

  const waitForConfirmation = useCallback(
    async (txHash: string, requiredConfirmations: number = 1): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
          try {
            const deployInfo = await csprCloudService.getDeploy(txHash);

            if (deployInfo.status === 'executed') {
              const confirmations = deployInfo.confirmations || 0;
              setState(prev => ({ ...prev, confirmations }));

              if (confirmations >= requiredConfirmations) {
                clearInterval(checkInterval);
                resolve(true);
              }
            } else if (deployInfo.status === 'failed') {
              clearInterval(checkInterval);
              reject(new Error('Transaction failed on blockchain'));
            }
          } catch (error) {
            clearInterval(checkInterval);
            reject(error);
          }
        }, 5000); // Check every 5 seconds

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Transaction confirmation timeout'));
        }, 300000);
      });
    },
    []
  );

  const sendTransaction = useCallback(async (request: TransactionRequest) => {
    setState({
      isProcessing: true,
      txHash: null,
      status: 'signing',
      confirmations: 0,
      error: null,
    });

    try {
      // Create deploy based on transaction type
      const deploy = createDeploy(request);

      // Sign transaction
      setState(prev => ({ ...prev, status: 'signing' }));
      const signedDeploy = await csprClickService.signTransaction(deploy);

      // Submit to blockchain
      setState(prev => ({ ...prev, status: 'submitting' }));
      const result = await csprCloudService.submitDeploy(signedDeploy);

      setState(prev => ({
        ...prev,
        txHash: result.deploy_hash,
        status: 'pending',
      }));

      // Wait for confirmation
      const confirmed = await waitForConfirmation(result.deploy_hash);

      if (confirmed) {
        setState(prev => ({
          ...prev,
          status: 'confirmed',
          isProcessing: false,
        }));
      } else {
        throw new Error('Transaction confirmation timeout');
      }

      return result.deploy_hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      setState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
        isProcessing: false,
      }));
      throw error;
    }
  }, [waitForConfirmation]);

  const getTransactionStatus = useCallback(async (txHash: string) => {
    try {
      const deployInfo = await csprCloudService.getDeploy(txHash);
      return {
        status: deployInfo.status,
        confirmations: deployInfo.confirmations || 0,
        blockNumber: deployInfo.block_number,
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      txHash: null,
      status: 'idle',
      confirmations: 0,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendTransaction,
    getTransactionStatus,
    reset,
  };
}

// Helper function to create deploy structure
function createDeploy(request: TransactionRequest): Record<string, unknown> {
  // Mock implementation - in production, use Casper SDK
  return {
    header: {
      account: request.from,
      timestamp: new Date().toISOString(),
      ttl: '30m',
      gas_price: 1,
      body_hash: '',
      dependencies: [],
      chain_name: 'casper',
    },
    payment: {
      ModuleBytes: {
        module_bytes: '',
        args: [],
      },
    },
    session: {
      Transfer: request.to && request.amount
        ? {
            args: [
              ['amount', request.amount],
              ['target', request.to],
            ],
          }
        : undefined,
    },
    approvals: [],
  };
}