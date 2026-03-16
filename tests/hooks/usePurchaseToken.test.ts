import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseToken, getStepMessage } from '@/hooks/ico/usePurchaseToken';

// Mock casper-js-sdk
vi.mock('casper-js-sdk', () => ({
  PublicKey: {
    fromHex: vi.fn((hex: string) => ({
      accountHash: () => ({
        toPrefixedString: () => `account-hash-${hex.slice(0, 16)}`,
      }),
    })),
  },
}));

// Mock purchase service
const mockValidatePurchase = vi.fn();
const mockPreparePurchase = vi.fn();
const mockCalculateTokensReceived = vi.fn();
const mockFromRawAmount = vi.fn();

vi.mock('@/services/ico/icoPurchaseService', () => ({
  validatePurchase: (...args: unknown[]) => mockValidatePurchase(...args),
  preparePurchase: (...args: unknown[]) => mockPreparePurchase(...args),
  calculateTokensReceived: (...args: unknown[]) => mockCalculateTokensReceived(...args),
  fromRawAmount: (...args: unknown[]) => mockFromRawAmount(...args),
  getDeployStatus: vi.fn().mockResolvedValue({ status: 'executed' }),
  parseContractError: (msg?: string) => {
    if (!msg) return 'Deploy failed';
    const match = msg.match(/User error: (\d+)/);
    if (match) {
      const MAP: Record<string, string> = {
        '59007': 'No active ICO schedule — sale is not currently open',
      };
      return MAP[match[1]] || msg;
    }
    return msg;
  },
}));

// Mock ICO_CONFIG
vi.mock('@/constants/ico', () => ({
  ICO_CONFIG: {
    TOKEN: {
      decimals: 18,
    },
    CONTRACTS: {
      tokenAddress: 'hash-f7d94fd8670fdc69aabd07c214ab8d52c3fc1fd839f0cc7713e1574cdfd899ec',
      icoAddress: '',
      icoPackageHash: '',
      treasuryAddress: '',
      usdcAddress: '',
      usdtAddress: '',
    },
    CURRENCY_RATES: {
      CSPR: 0.05,
      USDT: 1,
      USDC: 1,
    },
  },
  getCurrencyRateUsd: (currency: string, csprPriceUsd?: number) => {
    if (currency === 'CSPR') {
      if (!csprPriceUsd || csprPriceUsd <= 0) {
        throw new Error('CSPR price unavailable - please try again later');
      }
      return csprPriceUsd;
    }
    return 1;
  },
}));

const mockPublicKey = '01abc123def456789abc123def456789abc123def456789abc123def456789abc1';
const mockTokenPrice = 0.1;

const mockClickRef = {
  send: vi.fn(),
};

const mockPurchaseTransaction = {
  toJSON: () => ({ type: 'purchase' }),
};

const mockApprovalTransaction = {
  toJSON: () => ({ type: 'approval' }),
};

describe('usePurchaseToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock global.fetch for fetchActualTokensReceived (called after purchase tx)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{
          contract_package_hash: 'f7d94fd8670fdc69aabd07c214ab8d52c3fc1fd839f0cc7713e1574cdfd899ec',
          amount: '1000000000000000000000',
        }],
      }),
    }));

    mockValidatePurchase.mockReturnValue({ valid: true });
    mockPreparePurchase.mockResolvedValue({
      approvalNeeded: false,
      approvalTransaction: null,
      purchaseTransaction: mockPurchaseTransaction,
    });
    mockCalculateTokensReceived.mockReturnValue(1000n);
    mockFromRawAmount.mockReturnValue('1000');
    mockClickRef.send.mockResolvedValue({
      deployHash: '0x123abc',
      cancelled: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // --- Initial state ---

  describe('initial state', () => {
    it('should start with idle state', () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      expect(result.current.state.step).toBe('idle');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.purchaseTxHash).toBeNull();
      expect(result.current.state.approvalTxHash).toBeNull();
    });
  });

  // --- Validation errors ---

  describe('validation', () => {
    it('should fail if wallet not connected', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        usePurchaseToken(null, mockTokenPrice, mockClickRef as any, { onError })
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 1000);
      });

      expect(result.current.state.step).toBe('failed');
      expect(result.current.state.error).toBe('Wallet not connected');
      expect(onError).toHaveBeenCalledWith('Wallet not connected');
    });

    it('should fail if clickRef not initialized', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, null, { onError })
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 1000);
      });

      expect(result.current.state.step).toBe('failed');
      expect(result.current.state.error).toBe('Wallet SDK not initialized');
    });

    it('should fail if validation fails', async () => {
      mockValidatePurchase.mockReturnValue({
        valid: false,
        error: 'Insufficient balance',
      });

      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 50);
      });

      expect(result.current.state.step).toBe('failed');
      expect(result.current.state.error).toBe('Insufficient balance');
    });
  });

  // --- Successful purchase (no approval) ---

  describe('successful purchase without approval', () => {
    it('should complete purchase flow', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any, { onSuccess })
      );

      await act(async () => {
        const promise = result.current.purchase('100', 'USDT', 1000);
        await vi.runAllTimersAsync();
        await promise;
      });

      expect(result.current.state.step).toBe('confirmed');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.purchaseTxHash).toBe('0x123abc');
      expect(result.current.state.tokensReceived).toBe('1000');
      expect(onSuccess).toHaveBeenCalledWith('0x123abc', '1000');
    });

    it('should call preparePurchase with correct params', async () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        const promise = result.current.purchase('100', 'USDC', 1000);
        await vi.runAllTimersAsync();
        await promise;
      });

      expect(mockPreparePurchase).toHaveBeenCalledWith({
        senderPublicKey: mockPublicKey,
        senderAccountHash: expect.stringContaining('account-hash-'),
        amount: '100',
        currency: 'USDC',
      });
    });
  });

  // --- Purchase with approval ---

  describe('purchase with approval', () => {
    it('should handle approval flow', async () => {
      const onApprovalNeeded = vi.fn();
      mockPreparePurchase.mockResolvedValue({
        approvalNeeded: true,
        approvalTransaction: mockApprovalTransaction,
        purchaseTransaction: mockPurchaseTransaction,
      });
      mockClickRef.send
        .mockResolvedValueOnce({ deployHash: '0xapproval', cancelled: false })
        .mockResolvedValueOnce({ deployHash: '0xpurchase', cancelled: false });

      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any, { onApprovalNeeded })
      );

      await act(async () => {
        const promise = result.current.purchase('100', 'USDT', 1000);
        await vi.runAllTimersAsync();
        await promise;
      });

      expect(onApprovalNeeded).toHaveBeenCalled();
      expect(result.current.state.approvalTxHash).toBe('0xapproval');
      expect(result.current.state.purchaseTxHash).toBe('0xpurchase');
      expect(result.current.state.step).toBe('confirmed');
    });

    it('should fail if approval is cancelled', async () => {
      mockPreparePurchase.mockResolvedValue({
        approvalNeeded: true,
        approvalTransaction: mockApprovalTransaction,
        purchaseTransaction: mockPurchaseTransaction,
      });
      mockClickRef.send.mockResolvedValueOnce({ cancelled: true });

      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 1000);
      });

      expect(result.current.state.step).toBe('failed');
      expect(result.current.state.error).toBe('Approval transaction was cancelled');
    });
  });

  // --- Transaction errors ---

  describe('transaction errors', () => {
    it('should handle purchase cancellation', async () => {
      mockClickRef.send.mockResolvedValue({ cancelled: true });

      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 1000);
      });

      expect(result.current.state.step).toBe('failed');
      expect(result.current.state.error).toBe('Purchase transaction was cancelled');
    });

    it('should handle transaction error', async () => {
      mockClickRef.send.mockResolvedValue({ error: 'Out of gas' });

      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 1000);
      });

      expect(result.current.state.step).toBe('failed');
      expect(result.current.state.error).toBe('Out of gas');
    });

    it('should handle null result', async () => {
      mockClickRef.send.mockResolvedValue(null);

      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        await result.current.purchase('100', 'USDT', 1000);
      });

      expect(result.current.state.step).toBe('failed');
    });
  });

  // --- Reset ---

  describe('reset', () => {
    it('should reset state to initial', async () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      await act(async () => {
        const promise = result.current.purchase('100', 'USDT', 1000);
        await vi.runAllTimersAsync();
        await promise;
      });

      expect(result.current.state.step).toBe('confirmed');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.step).toBe('idle');
      expect(result.current.state.purchaseTxHash).toBeNull();
      expect(result.current.state.tokensReceived).toBeNull();
    });
  });

  // --- calculateTokens ---

  describe('calculateTokens', () => {
    it('should calculate tokens for valid input', () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      const tokens = result.current.calculateTokens('100', 'USDT', 0.1);
      expect(tokens).toBe('1,000'); // 100 USD / 0.1 = 1000
    });

    it('should return 0 for invalid amount', () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      expect(result.current.calculateTokens('abc', 'USDT', 0.1)).toBe('0');
      expect(result.current.calculateTokens('-10', 'USDT', 0.1)).toBe('0');
      expect(result.current.calculateTokens('0', 'USDT', 0.1)).toBe('0');
    });

    it('should return 0 for zero price', () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any)
      );

      expect(result.current.calculateTokens('100', 'USDT', 0)).toBe('0');
    });

    it('should apply currency rate for CSPR', () => {
      const { result } = renderHook(() =>
        usePurchaseToken(mockPublicKey, mockTokenPrice, mockClickRef as any, {}, 0.05)
      );

      // 100 CSPR * 0.05 (rate) = 5 USD / 0.1 (price) = 50 tokens
      const tokens = result.current.calculateTokens('100', 'CSPR', 0.1);
      expect(tokens).toBe('50');
    });
  });

  // --- getStepMessage ---

  describe('getStepMessage', () => {
    it('should return correct messages for each step', () => {
      expect(getStepMessage('idle')).toBe('');
      expect(getStepMessage('validating')).toBe('Validating purchase...');
      expect(getStepMessage('checking-approval')).toBe('Checking token approval...');
      expect(getStepMessage('awaiting-approval-signature')).toContain('sign the approval');
      expect(getStepMessage('awaiting-purchase-signature')).toContain('sign the purchase');
      expect(getStepMessage('purchase-pending')).toContain('Waiting for purchase');
      expect(getStepMessage('confirmed')).toBe('Purchase confirmed!');
      expect(getStepMessage('failed')).toBe('Purchase failed');
    });
  });
});
