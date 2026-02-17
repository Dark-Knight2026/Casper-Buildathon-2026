import type { Transaction } from '@/pages/ico/components/shared/TransactionHistory';

const STORAGE_KEY = 'ico_transactions';

interface StoredTransaction extends Omit<Transaction, 'timestamp'> {
  timestamp: string;
}

function serialize(tx: Transaction): StoredTransaction {
  return { ...tx, timestamp: tx.timestamp.toISOString() };
}

function deserialize(stored: StoredTransaction): Transaction {
  return { ...stored, timestamp: new Date(stored.timestamp) };
}

export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored: StoredTransaction[] = JSON.parse(raw);
    return stored.map(deserialize).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  } catch {
    return [];
  }
}

export function addTransaction(tx: Transaction): Transaction[] {
  const current = getTransactions();
  const updated = [tx, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.map(serialize)));
  return updated;
}

export function updateTransaction(
  id: string,
  patch: Partial<Pick<Transaction, 'status' | 'txHash' | 'tokensReceived'>>
): Transaction[] {
  const current = getTransactions();
  const updated = current.map((tx) =>
    tx.id === id ? { ...tx, ...patch } : tx
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.map(serialize)));
  return updated;
}

export function clearTransactions(): void {
  localStorage.removeItem(STORAGE_KEY);
}
