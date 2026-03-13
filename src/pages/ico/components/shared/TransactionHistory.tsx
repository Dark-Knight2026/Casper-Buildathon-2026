import { cn } from '@/lib/utils';
import { Card } from './Card';
import { formatDateTime } from '../../utils/formatters';

export interface ICOTransaction {
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
  transactions: ICOTransaction[];
  className?: string;
}

const STATUS_STYLES = {
  pending: 'text-yellow-800 dark:text-yellow-300 bg-yellow-400/10 dark:bg-yellow-900/30',
  completed: 'text-green-900 dark:text-green-300 bg-green-400/10 dark:bg-green-900/30',
  failed: 'text-red-800 dark:text-red-300 bg-red-400/10 dark:bg-red-900/30',
};

const STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
};

export function TransactionHistory({ transactions, className }: TransactionHistoryProps) {
  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
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
          // Semantic list structure for a11y (WCAG 1.3.1) — card-based layout uses ul/li instead of table
          <ul aria-label="Transaction history" className="space-y-3 max-h-80 overflow-y-auto list-none p-0 m-0">
            {transactions.map((tx) => (
              <li
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
                    <span>{formatDateTime(tx.timestamp)}</span>
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
                    +{tx.tokensReceived.toLocaleString()} {tx.tokenSymbol}
                  </p>
                  <p className="text-xs text-[hsl(var(--ico-text-secondary))]">
                    {tx.amount.toLocaleString()} {tx.currency}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export default TransactionHistory;
