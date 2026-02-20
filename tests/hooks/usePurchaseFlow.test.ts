import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseFlow } from '@/hooks/ico/usePurchaseFlow';

// Mock dependent hooks
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockPurchase = vi.fn();
const mockResetPurchase = vi.fn();
const mockRefetchBalances = vi.fn();

const mockWalletState = {
  isConnected: false,
  account: null,
  isConnecting: false,
  error: null,
  connect: mockConnect,
  disconnect: mockDisconnect,
  clickRef: {},
};

const mockBalances = {
  cspr: 1000,
  usdt: 500,
  usdc: 300,
  big: 10000,
};

const mockPurchaseState = {
  step: 'idle' as const,
  approvalTxHash: null,
  purchaseTxHash: null,
  tokensReceived: null,
  error: null,
  isProcessing: false,
};

vi.mock('@/hooks/ico/useICOWallet', () => ({
  useICOWallet: () => mockWalletState,
}));

vi.mock('@/hooks/ico/useWalletBalances', () => ({
  useWalletBalances: () => ({
    balances: mockBalances,
    isLoading: false,
    error: null,
    refetch: mockRefetchBalances,
  }),
}));

vi.mock('@/hooks/useCSPRPrice', () => ({
  useCSPRPrice: () => ({ priceUSD: 0.05 }),
}));

vi.mock('@/hooks/ico/usePurchaseToken', () => ({
  usePurchaseToken: (_pk: string | null, _price: number, _ref: unknown, options?: { onSuccess?: Function; onError?: Function }) => {
    // Store callbacks for testing
    (global as any).__purchaseCallbacks = options;
    return {
      state: mockPurchaseState,
      purchase: mockPurchase,
      reset: mockResetPurchase,
    };
  },
}));

describe('usePurchaseFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalletState.isConnected = false;
    mockWalletState.account = null;
    mockPurchaseState.step = 'idle';
    mockPurchaseState.isProcessing = false;
    mockPurchaseState.error = null;
    mockPurchaseState.purchaseTxHash = null;
    mockPurchaseState.tokensReceived = null;
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('should return wallet state', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.account).toBeNull();
      expect(result.current.balances).toEqual(mockBalances);
    });

    it('should start with modal closed', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      expect(result.current.showConfirmModal).toBe(false);
      expect(result.current.pendingPurchase).toBeNull();
    });

    it('should start with toast hidden', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      expect(result.current.showToast).toBe(false);
    });

    it('should return null modalProps when modal is closed', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      expect(result.current.modalProps).toBeNull();
    });

    it('should return null toastProps when toast is hidden', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      expect(result.current.toastProps).toBeNull();
    });
  });

  // --- handlePurchase ---

  describe('handlePurchase', () => {
    it('should call connect when not connected', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      expect(mockConnect).toHaveBeenCalled();
      expect(result.current.showConfirmModal).toBe(false);
    });

    it('should open modal when connected', () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      expect(result.current.showConfirmModal).toBe(true);
      expect(result.current.pendingPurchase).toEqual({
        amount: 100,
        currency: 'USDT',
      });
    });

    it('should provide modalProps when modal is open', () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      expect(result.current.modalProps).not.toBeNull();
      expect(result.current.modalProps?.amount).toBe(100);
      expect(result.current.modalProps?.currency).toBe('USDT');
      expect(result.current.modalProps?.tokenPrice).toBe(0.1);
      expect(result.current.modalProps?.tokenSymbol).toBe('BIG');
    });
  });

  // --- handleConfirmPurchase ---

  describe('handleConfirmPurchase', () => {
    it('should call purchase with correct params for USDT', async () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      await act(async () => {
        await result.current.handleConfirmPurchase();
      });

      expect(mockPurchase).toHaveBeenCalledWith('100', 'USDT', 500); // USDT balance
    });

    it('should call purchase with correct balance for CSPR', async () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(50, 'CSPR');
      });

      await act(async () => {
        await result.current.handleConfirmPurchase();
      });

      expect(mockPurchase).toHaveBeenCalledWith('50', 'CSPR', 1000); // CSPR balance
    });

    it('should not call purchase if no pending purchase', async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      await act(async () => {
        await result.current.handleConfirmPurchase();
      });

      expect(mockPurchase).not.toHaveBeenCalled();
    });
  });

  // --- handleCloseModal ---

  describe('handleCloseModal', () => {
    it('should close modal and reset when not processing', () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      expect(result.current.showConfirmModal).toBe(true);

      act(() => {
        result.current.handleCloseModal();
      });

      expect(result.current.showConfirmModal).toBe(false);
      expect(result.current.pendingPurchase).toBeNull();
      expect(mockResetPurchase).toHaveBeenCalled();
    });

    it('should not close modal when processing', () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };
      mockPurchaseState.isProcessing = true;

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      act(() => {
        result.current.handleCloseModal();
      });

      // Modal should still be open
      expect(result.current.showConfirmModal).toBe(true);
    });
  });

  // --- handleCloseToast ---

  describe('handleCloseToast', () => {
    it('should close toast', () => {
      mockPurchaseState.step = 'confirmed';

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      // Simulate toast being shown (via success callback)
      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onSuccess?.('0x123', '1000');
      });

      expect(result.current.showToast).toBe(true);

      act(() => {
        result.current.handleCloseToast();
      });

      expect(result.current.showToast).toBe(false);
    });

    it('should reset purchase on close if confirmed', () => {
      mockPurchaseState.step = 'confirmed';

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onSuccess?.('0x123', '1000');
      });

      act(() => {
        result.current.handleCloseToast();
      });

      expect(mockResetPurchase).toHaveBeenCalled();
    });

    it('should reset purchase on close if failed', () => {
      mockPurchaseState.step = 'failed';

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onError?.('Transaction failed');
      });

      act(() => {
        result.current.handleCloseToast();
      });

      expect(mockResetPurchase).toHaveBeenCalled();
    });
  });

  // --- Callbacks ---

  describe('callbacks', () => {
    it('should call onPurchaseSuccess callback', () => {
      const onPurchaseSuccess = vi.fn();

      renderHook(() =>
        usePurchaseFlow({
          tokenPrice: 0.1,
          tokenSymbol: 'BIG',
          onPurchaseSuccess,
        })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onSuccess?.('0x123abc', '1000');
      });

      expect(onPurchaseSuccess).toHaveBeenCalledWith('0x123abc', '1000');
    });

    it('should call onPurchaseError callback', () => {
      const onPurchaseError = vi.fn();

      renderHook(() =>
        usePurchaseFlow({
          tokenPrice: 0.1,
          tokenSymbol: 'BIG',
          onPurchaseError,
        })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onError?.('Transaction failed');
      });

      expect(onPurchaseError).toHaveBeenCalledWith('Transaction failed');
    });

    it('should show toast on success', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onSuccess?.('0x123', '1000');
      });

      expect(result.current.showToast).toBe(true);
    });

    it('should show toast on error', () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onError?.('Failed');
      });

      expect(result.current.showToast).toBe(true);
    });

    it('should close modal and clear pending on success', () => {
      mockWalletState.isConnected = true;
      mockWalletState.account = { publicKey: '01abc123' };

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      act(() => {
        result.current.handlePurchase(100, 'USDT');
      });

      expect(result.current.showConfirmModal).toBe(true);

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onSuccess?.('0x123', '1000');
      });

      expect(result.current.showConfirmModal).toBe(false);
      expect(result.current.pendingPurchase).toBeNull();
    });
  });

  // --- toastProps ---

  describe('toastProps', () => {
    it('should provide correct toastProps when visible', () => {
      mockPurchaseState.step = 'confirmed';
      mockPurchaseState.purchaseTxHash = '0x123abc';
      mockPurchaseState.tokensReceived = '1000';

      const { result } = renderHook(() =>
        usePurchaseFlow({ tokenPrice: 0.1, tokenSymbol: 'BIG' })
      );

      const callbacks = (global as any).__purchaseCallbacks;
      act(() => {
        callbacks?.onSuccess?.('0x123abc', '1000');
      });

      expect(result.current.toastProps).not.toBeNull();
      expect(result.current.toastProps?.isVisible).toBe(true);
      expect(result.current.toastProps?.step).toBe('confirmed');
      expect(result.current.toastProps?.txHash).toBe('0x123abc');
      expect(result.current.toastProps?.tokenSymbol).toBe('BIG');
    });
  });
});
