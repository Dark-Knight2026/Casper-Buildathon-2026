import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { TablePagination } from './TablePagination';

export interface Transaction {
  id: string;
  type: 'purchase' | 'claim';
  amount: number;
  currency: string;
  tokensReceived: number;
  tokenSymbol: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  txHash?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  className?: string;
}

const PAGE_SIZE = 5;

const STATUS_STYLES = {
  pending: 'text-yellow-800 bg-yellow-400/10',
  completed: 'text-green-900 bg-green-400/10',
  failed: 'text-red-800 bg-red-400/10',
};

const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
};

export function TransactionHistory({ transactions, className }: TransactionHistoryProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTx = transactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Card className={cn('p-6 w-full', className)}>
      <div className="w-full">
        <h3 className="text-lg font-semibold text-[hsl(var(--ico-text-primary))] mb-4">
          Transaction History
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[hsl(var(--ico-text-secondary))]">
              No transactions yet
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-md bg-[hsl(var(--ico-bg-secondary))] border border-[hsl(var(--ico-border-color))]"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[hsl(var(--ico-text-primary))] capitalize">
                        {tx.type}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          STATUS_STYLES[tx.status]
                        )}
                      >
                        {STATUS_LABELS[tx.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--ico-text-secondary))]">
                      <span>{formatDate(tx.timestamp)}</span>
                      {tx.txHash && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{truncateHash(tx.txHash)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-[hsl(var(--ico-text-primary))]">
                      +{tx.tokensReceived.toLocaleString('en-US', { maximumFractionDigits: 2 })} {tx.tokenSymbol}
                    </p>
                    <p className="text-xs text-[hsl(var(--ico-text-secondary))]">
                      {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-4"
            />
          </>
        )}
      </div>
    </Card>
  );
}

export default TransactionHistory;
