/**
 * usePurchaseFlow Hook
 *
 * Encapsulates the complete token purchase flow including:
 * - Modal state management
 * - Toast notifications
 * - Purchase execution with usePurchaseToken
 * - All handlers for purchase, confirm, close modal/toast
 *
 * Usage:
 * const purchaseFlow = usePurchaseFlow({ tokenPrice, tokenSymbol });
 *
 * // In WalletCard:
 * onPurchase={purchaseFlow.handlePurchase}
 *
 * // Render modal and toast:
 * {purchaseFlow.renderModal()}
 * {purchaseFlow.renderToast()}
 */

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PaymentCurrency } from '@/types/ico';
import { useICOWallet } from './useICOWallet';
import { useWalletBalances } from './useWalletBalances';
import { usePurchaseToken, type PurchaseState } from './usePurchaseToken';

interface PendingPurchase {
  amount: number;
  currency: PaymentCurrency;
}

interface UsePurchaseFlowOptions {
  tokenPrice: number;
  tokenSymbol: string;
  onPurchaseSuccess?: (txHash: string, tokensReceived: string) => void;
  onPurchaseError?: (error: string) => void;
}

interface UsePurchaseFlowReturn {
  // Wallet state
  isConnected: boolean;
  account: { publicKey: string } | null;
  connect: () => void;
  balances: {
    cspr: number;
    usdt: number;
    usdc: number;
    big: number;
  };

  // Modal state
  showConfirmModal: boolean;
  pendingPurchase: PendingPurchase | null;

  // Toast state
  showToast: boolean;

  // Purchase state from usePurchaseToken
  purchaseState: PurchaseState;

  // Handlers
  handlePurchase: (amount: number, currency: PaymentCurrency) => void;
  handleConfirmPurchase: () => Promise<void>;
  handleCloseModal: () => void;
  handleCloseToast: () => void;

  // Props for components
  modalProps: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    amount: number;
    currency: PaymentCurrency;
    tokenPrice: number;
    tokenSymbol: string;
    purchaseState: PurchaseState;
  } | null;

  toastProps: {
    isVisible: boolean;
    onClose: () => void;
    step: PurchaseState['step'];
    txHash: string | null;
    tokensReceived: string | null;
    error: string | null;
    tokenSymbol: string;
  } | null;
}

export function usePurchaseFlow({
  tokenPrice,
  tokenSymbol,
  onPurchaseSuccess,
  onPurchaseError,
}: UsePurchaseFlowOptions): UsePurchaseFlowReturn {
  const queryClient = useQueryClient();
  const { isConnected, account, connect, clickRef } = useICOWallet();
  const { balances } = useWalletBalances(account?.publicKey);

  // Modal and toast state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Purchase hook - pass clickRef for signing transactions
  const {
    state: purchaseState,
    purchase,
    reset: resetPurchase,
  } = usePurchaseToken(
    account?.publicKey ?? null,
    tokenPrice,
    clickRef ?? null,
    {
      onSuccess: (txHash, tokensReceived) => {
        console.log('Purchase successful:', txHash, tokensReceived);
        queryClient.invalidateQueries({ queryKey: ['ico-schedules'] });
        setShowToast(true);
        setShowConfirmModal(false);
        setPendingPurchase(null);
        onPurchaseSuccess?.(txHash, tokensReceived);
      },
      onError: (error) => {
        console.error('Purchase failed:', error);
        setShowToast(true);
        onPurchaseError?.(error);
      },
    }
  );

  // Handle purchase button click - show confirmation modal
  const handlePurchase = useCallback((amount: number, currency: PaymentCurrency) => {
    if (!isConnected || !account) {
      connect();
      return;
    }
    setPendingPurchase({ amount, currency });
    setShowConfirmModal(true);
  }, [isConnected, account, connect]);

  // Handle confirmation - execute purchase
  const handleConfirmPurchase = useCallback(async () => {
    if (!pendingPurchase) return;

    const { amount, currency } = pendingPurchase;
    const balance = currency === 'CSPR' ? balances.cspr :
                    currency === 'USDT' ? balances.usdt :
                    currency === 'USDC' ? balances.usdc : 0;

    await purchase(amount.toString(), currency, balance);
  }, [pendingPurchase, balances, purchase]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    if (!purchaseState.isProcessing) {
      setShowConfirmModal(false);
      setPendingPurchase(null);
      resetPurchase();
    }
  }, [purchaseState.isProcessing, resetPurchase]);

  // Handle toast close
  const handleCloseToast = useCallback(() => {
    setShowToast(false);
    if (purchaseState.step === 'confirmed' || purchaseState.step === 'failed') {
      resetPurchase();
    }
  }, [purchaseState.step, resetPurchase]);

  // Memoized props for modal component
  const modalProps = useMemo(() => {
    if (!showConfirmModal || !pendingPurchase) return null;

    return {
      isOpen: showConfirmModal,
      onClose: handleCloseModal,
      onConfirm: handleConfirmPurchase,
      amount: pendingPurchase.amount,
      currency: pendingPurchase.currency,
      tokenPrice,
      tokenSymbol,
      purchaseState,
    };
  }, [showConfirmModal, pendingPurchase, handleCloseModal, handleConfirmPurchase, tokenPrice, tokenSymbol, purchaseState]);

  // Memoized props for toast component
  const toastProps = useMemo(() => {
    if (!showToast) return null;

    return {
      isVisible: showToast,
      onClose: handleCloseToast,
      step: purchaseState.step,
      txHash: purchaseState.purchaseTxHash,
      tokensReceived: purchaseState.tokensReceived?.toString() ?? null,
      error: purchaseState.error,
      tokenSymbol,
    };
  }, [showToast, handleCloseToast, purchaseState, tokenSymbol]);

  return {
    // Wallet state
    isConnected,
    account,
    connect,
    balances,

    // Modal state
    showConfirmModal,
    pendingPurchase,

    // Toast state
    showToast,

    // Purchase state
    purchaseState,

    // Handlers
    handlePurchase,
    handleConfirmPurchase,
    handleCloseModal,
    handleCloseToast,

    // Component props
    modalProps,
    toastProps,
  };
}

export type { UsePurchaseFlowOptions, UsePurchaseFlowReturn, PendingPurchase };
