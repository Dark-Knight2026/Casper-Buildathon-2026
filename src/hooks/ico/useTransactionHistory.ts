import { useCallback, useSyncExternalStore } from 'react';
import type { Transaction } from '@/pages/ico/components/shared/TransactionHistory';
import * as storage from '@/services/ico/transactionStorage';

// Notify all hook instances when localStorage changes
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  listeners.forEach((l) => l());
}

// Snapshot for useSyncExternalStore
let cachedTransactions: Transaction[] = storage.getTransactions();

function getSnapshot(): Transaction[] {
  return cachedTransactions;
}

function refreshCache(): Transaction[] {
  cachedTransactions = storage.getTransactions();
  emitChange();
  return cachedTransactions;
}

export function useTransactionHistory() {
  const transactions = useSyncExternalStore(subscribe, getSnapshot);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const fullTx: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
    };
    storage.addTransaction(fullTx);
    refreshCache();
    return fullTx;
  }, []);

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Pick<Transaction, 'status' | 'txHash' | 'tokensReceived'>>) => {
      storage.updateTransaction(id, patch);
      refreshCache();
    },
    []
  );

  const clearAll = useCallback(() => {
    storage.clearTransactions();
    refreshCache();
  }, []);

  return { transactions, addTransaction, updateTransaction, clearAll };
}
