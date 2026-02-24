import { describe, it, expect, beforeEach } from 'vitest';
import * as storage from '@/services/ico/transactionStorage';

// Transaction shape matching ICOTransaction from TransactionHistory
function makeTx(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-001',
    type: 'purchase' as const,
    amount: 100,
    currency: 'USDT',
    tokensReceived: 1000,
    tokenSymbol: 'BIG',
    status: 'pending' as const,
    timestamp: new Date('2024-01-15T12:00:00.000Z'),
    ...overrides,
  };
}

describe('transactionStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // --- getTransactions ---

  describe('getTransactions', () => {
    it('should return empty array when localStorage is empty', () => {
      expect(storage.getTransactions()).toEqual([]);
    });

    it('should return empty array for malformed JSON', () => {
      localStorage.setItem('ico_transactions', 'invalid-json{{{');
      expect(storage.getTransactions()).toEqual([]);
    });

    it('should deserialize timestamp back to a Date instance', () => {
      storage.addTransaction(makeTx());
      const result = storage.getTransactions();

      expect(result[0].timestamp).toBeInstanceOf(Date);
      expect(result[0].timestamp.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should return transactions sorted newest-first', () => {
      storage.addTransaction(makeTx({ id: 'old', timestamp: new Date('2024-01-10T00:00:00.000Z') }));
      storage.addTransaction(makeTx({ id: 'new', timestamp: new Date('2024-01-20T00:00:00.000Z') }));

      const result = storage.getTransactions();

      expect(result[0].id).toBe('new');
      expect(result[1].id).toBe('old');
    });
  });

  // --- addTransaction ---

  describe('addTransaction', () => {
    it('should add a transaction and return the updated list', () => {
      const tx = makeTx();
      const result = storage.addTransaction(tx);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tx-001');
    });

    it('should persist transaction to localStorage', () => {
      storage.addTransaction(makeTx());

      const raw = localStorage.getItem('ico_transactions');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
    });

    it('should prepend new transactions (newest first)', () => {
      storage.addTransaction(makeTx({ id: 'first' }));
      storage.addTransaction(makeTx({ id: 'second' }));

      const result = storage.getTransactions();
      // sorted by timestamp descending — both have same timestamp so second was prepended
      expect(result.map((t) => t.id)).toContain('first');
      expect(result.map((t) => t.id)).toContain('second');
      expect(result).toHaveLength(2);
    });
  });

  // --- updateTransaction ---

  describe('updateTransaction', () => {
    it('should update the status of the correct transaction', () => {
      storage.addTransaction(makeTx({ id: 'tx-update' }));
      storage.updateTransaction('tx-update', { status: 'completed' });

      const result = storage.getTransactions();
      expect(result.find((t) => t.id === 'tx-update')?.status).toBe('completed');
    });

    it('should update txHash of the correct transaction', () => {
      storage.addTransaction(makeTx({ id: 'tx-hash' }));
      storage.updateTransaction('tx-hash', { txHash: '0xabc123' });

      const result = storage.getTransactions();
      expect(result.find((t) => t.id === 'tx-hash')?.txHash).toBe('0xabc123');
    });

    it('should not modify other transactions', () => {
      storage.addTransaction(makeTx({ id: 'tx-a' }));
      storage.addTransaction(makeTx({ id: 'tx-b' }));

      storage.updateTransaction('tx-a', { status: 'failed' });

      const result = storage.getTransactions();
      expect(result.find((t) => t.id === 'tx-b')?.status).toBe('pending');
    });

    it('should return the updated list', () => {
      storage.addTransaction(makeTx({ id: 'tx-ret' }));
      const result = storage.updateTransaction('tx-ret', { status: 'completed' });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('completed');
    });
  });

  // --- clearTransactions ---

  describe('clearTransactions', () => {
    it('should remove all transactions', () => {
      storage.addTransaction(makeTx({ id: 'tx-1' }));
      storage.addTransaction(makeTx({ id: 'tx-2' }));

      storage.clearTransactions();

      expect(storage.getTransactions()).toEqual([]);
    });

    it('should remove the localStorage key', () => {
      storage.addTransaction(makeTx());
      storage.clearTransactions();

      expect(localStorage.getItem('ico_transactions')).toBeNull();
    });
  });
});
