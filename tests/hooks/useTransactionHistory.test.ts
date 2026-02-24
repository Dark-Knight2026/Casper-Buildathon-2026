import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionHistory } from '@/hooks/ico/useTransactionHistory';

// vi.hoisted so the mock factory can reference the store without TDZ errors
const { mockGetTransactions, mockAddTransaction, mockUpdateTransaction, mockClearTransactions, resetStore } =
  vi.hoisted(() => {
    let store: Record<string, unknown>[] = [];

    return {
      mockGetTransactions: () => store,
      mockAddTransaction: (tx: Record<string, unknown>) => {
        store = [tx, ...store];
        return store;
      },
      mockUpdateTransaction: (id: string, patch: Record<string, unknown>) => {
        store = store.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx));
        return store;
      },
      mockClearTransactions: () => {
        store = [];
      },
      resetStore: () => {
        store = [];
      },
    };
  });

vi.mock('@/services/ico/transactionStorage', () => ({
  getTransactions: mockGetTransactions,
  addTransaction: mockAddTransaction,
  updateTransaction: mockUpdateTransaction,
  clearTransactions: mockClearTransactions,
}));

// Stable UUID for deterministic tests
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'mock-uuid-1234'),
});

const mockTxInput = {
  type: 'purchase' as const,
  amount: 100,
  currency: 'USDT',
  tokensReceived: 1000,
  tokenSymbol: 'BIG',
  status: 'pending' as const,
  timestamp: new Date('2024-01-15T12:00:00.000Z'),
};

describe('useTransactionHistory', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    (crypto.randomUUID as ReturnType<typeof vi.fn>).mockReturnValue('mock-uuid-1234');
  });

  // --- clearAll ---

  describe('clearAll', () => {
    it('should empty the transactions list', () => {
      // Pre-populate store via mock
      mockAddTransaction({ id: 'pre-existing', ...mockTxInput });

      const { result } = renderHook(() => useTransactionHistory());

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.transactions).toHaveLength(0);
    });
  });

  // --- addTransaction ---

  describe('addTransaction', () => {
    it('should add a transaction with a generated UUID', () => {
      const { result } = renderHook(() => useTransactionHistory());

      act(() => { result.current.clearAll(); });
      act(() => { result.current.addTransaction(mockTxInput); });

      expect(result.current.transactions.some((tx) => tx.id === 'mock-uuid-1234')).toBe(true);
    });

    it('should return the created transaction with id and input fields', () => {
      const { result } = renderHook(() => useTransactionHistory());

      let created: ReturnType<typeof result.current.addTransaction>;

      act(() => { result.current.clearAll(); });
      act(() => { created = result.current.addTransaction(mockTxInput); });

      expect(created!.id).toBe('mock-uuid-1234');
      expect(created!.type).toBe('purchase');
      expect(created!.amount).toBe(100);
      expect(created!.currency).toBe('USDT');
    });

    it('should reflect the new transaction in the transactions list', () => {
      const { result } = renderHook(() => useTransactionHistory());

      act(() => { result.current.clearAll(); });
      act(() => { result.current.addTransaction(mockTxInput); });

      const tx = result.current.transactions.find((t) => t.id === 'mock-uuid-1234');
      expect(tx).toBeDefined();
      expect(tx?.currency).toBe('USDT');
    });
  });

  // --- updateTransaction ---

  describe('updateTransaction', () => {
    it('should update the status of an existing transaction', () => {
      mockAddTransaction({ id: 'tx-target', ...mockTxInput, status: 'pending' });

      const { result } = renderHook(() => useTransactionHistory());

      act(() => {
        result.current.updateTransaction('tx-target', { status: 'completed' });
      });

      const updated = result.current.transactions.find((t) => t.id === 'tx-target');
      expect(updated?.status).toBe('completed');
    });

    it('should update the txHash of an existing transaction', () => {
      mockAddTransaction({ id: 'tx-hash-test', ...mockTxInput });

      const { result } = renderHook(() => useTransactionHistory());

      act(() => {
        result.current.updateTransaction('tx-hash-test', { txHash: '0xdeadbeef' });
      });

      const updated = result.current.transactions.find((t) => t.id === 'tx-hash-test');
      expect(updated?.txHash).toBe('0xdeadbeef');
    });

    it('should not affect other transactions', () => {
      mockAddTransaction({ id: 'tx-a', ...mockTxInput, status: 'pending' });
      mockAddTransaction({ id: 'tx-b', ...mockTxInput, status: 'pending' });

      const { result } = renderHook(() => useTransactionHistory());

      act(() => {
        result.current.updateTransaction('tx-a', { status: 'failed' });
      });

      const txB = result.current.transactions.find((t) => t.id === 'tx-b');
      expect(txB?.status).toBe('pending');
    });
  });
});
